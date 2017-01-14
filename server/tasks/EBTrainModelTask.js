/*
    Electric Brain is an easy to use platform for machine learning.
    Copyright (C) 2016 Electric Brain Software Corporation

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

const
    async = require('async'),
    EBCustomTransformationProcess = require('../components/architecture/EBCustomTransformationProcess'),
    EBRollingAverage = require("../../shared/components/EBRollingAverage"),
    EBTorchProcess = require('../components/architecture/EBTorchProcess'),
    EBTorchTransformer = require('../../shared/components/architecture/EBTorchTransformer'),
    models = require("../../shared/models/models"),
    math = require('mathjs'),
    mongodb = require('mongodb'),
    Promise = require('bluebird'),
    SparkMD5 = require('spark-md5'),
    underscore = require('underscore');

/**
 *  This task will train a model on your local system.
 */
class EBTrainModelTask {
    /**
     * The constructor for the task object.
     *
     * @param {EBApplication} application This should be a reference to the root EBApplication object.
     */
    constructor(application)
    {
        this.application = application;
        this.socketio = application.socketio;
        this.models = application.db.collection("EBModel");
        this.gridFS = new mongodb.GridFSBucket(application.db, {
            chunkSizeBytes: 1024,
            bucketName: 'EBModel.torch'
        });
        this.testingSetPortion = 0.3;
        this.trainingBatchSize = 16;
        this.testingBatchSize = 4;
        this.rollingAverageAccuracy = new EBRollingAverage(100);
        this.rollingAverageTimePerIteration = new EBRollingAverage(100);
        this.rollingAverageTimeToLoad100Entries = new EBRollingAverage(100);
        this.lastFrontendUpdateTime = null;
        this.lastDatabaseUpdateTime = null;
        this.isFrontendUpdateScheduled = null;
        this.isDatabaseUpdateScheduled = null;
        this.frontendUpdateInterval = 2500;
        this.databaseUpdateInterval = 5000;
        this.numberOfObjectsToSample = 1000000;
        this.model = null;

        this.trainingSetEntries = [];
        this.testingSetEntries = [];
        this.testingSetPosition = 0;
        this.trainingSetPosition = 0;
    }

    /**
     *  This is the entry point for the train model task.
     *
     *  @param {beaver.Task} task The Beaver task object
     *  @param {object} args The arguments for this task. It should only contain a single argument,
     *                       the MongoID of the EBModel object that needs to be trained.
     *  @param {function(err)} callback The callback after the task has finished running
     */
    run(task, args, callback)
    {
        const self = this;

        self.task = task;

        async.series([
            // First log the start
            self.task.log.bind(self.task, `Starting the task to train the model with _id: ${args._id}`),
            // Load the model object
            (next) =>
            {
                // Retrieve the model object that this task refers to
                self.models.find({_id: args._id}).toArray((err, objects) =>
                {
                    if (err)
                    {
                        return next(err);
                    }
                    else if (objects.length === 0)
                    {
                        return next(new Error("EBModel not found!"));
                    }
                    else
                    {
                        self.model = new models.EBModel(objects[0]);
                        self.trainingProcess = new EBTorchProcess(self.model.architecture);
                        return next();
                    }
                });
            },
            // Short circuit: is this a retry? Set running to false and exit.
            (next) =>
            {
                if (self.model.running)
                {
                    self.models.update({_id: args._id}, {$set: {running: false}}, (err) =>
                    {
                        if (err)
                        {
                            return next(err);
                        }
                        else
                        {
                            return next(new Error("This model has already started training. It must have failed."))
                        }
                    });
                }
                else
                {
                    self.model.running = true;
                    self.models.update({_id: args._id}, {$set: {running: true}}, (err) =>
                    {
                        if (err)
                        {
                            return next(err);
                        }
                        else
                        {
                            return next();
                        }
                    });
                }
            },
            // Generate the code
            (next) =>
            {
                self.trainingProcess.generateCode((err, totalFiles) =>
                {
                    if (err)
                    {
                        return next(err);
                    }

                    const codeGenerationResult = {
                        status: 'complete',
                        percentageComplete: 100,
                        totalFiles: totalFiles
                    };

                    self.updateStepResult('codeGeneration', codeGenerationResult, next);
                });
            },
            // Start up the process
            (next) =>
            {
                self.trainingProcess.startProcess(next);
            },
            // Scan the data, analyze it for input
            (next) =>
            {
                self.scanData(self.numberOfObjectsToSample, next);
            },
            // Save the model in its vanilla state. This just ensures that other
            // functionality that depends on downloading the torch model file
            // works from the first iteration of training
            (next) =>
            {
                self.saveTorchModelFile(next);
            },
            // Training model
            (next) =>
            {
                self.trainModel(next);
            },
            // Test model
            (next) =>
            {
                self.testModel(next);
            }
        ], callback);
    }


    /**
     * This function updates the current results for a given step
     *
     * @param {string} stepName The name of the step being updated. Should be the same as the the field names in EBModel
     * @param {object} result An object with the results
     * @param {function(err)} callback Callback after the process is started and ready to receive commands
     */
    updateStepResult(stepName, result, callback)
    {
        const self = this;
        
        if (!self.isFrontendUpdateScheduled)
        {
            self.isFrontendUpdateScheduled = true;
            let frontendUpdateDelay = 0;
            if (self.lastFrontendUpdateTime)
            {
                frontendUpdateDelay = Math.max(0, self.frontendUpdateInterval - (Date.now() - self.lastFrontendUpdateTime.getTime()));
            }

            setTimeout(() =>
            {
                self.isFrontendUpdateScheduled = false;
                self.lastFrontendUpdateTime = new Date();
                
                self.socketio.to('general').emit(`model-${self.model._id.toString()}`, {
                    event: 'update',
                    model: self.model
                });
            }, frontendUpdateDelay);
        }

        if (!self.isDatabaseUpdateScheduled)
        {
            self.isDatabaseUpdateScheduled = true;
            let databaseUpdateDelay = 0;
            if (self.lastDatabaseUpdateTime)
            {
                databaseUpdateDelay = Math.max(0, self.databaseUpdateInterval - (Date.now() - self.lastDatabaseUpdateTime.getTime()));
            }

            setTimeout(() =>
            {
                self.isDatabaseUpdateScheduled = false;
                self.lastDatabaseUpdateTime = new Date();


                self.model[stepName] = result;
                self.models.updateOne({_id: self.model._id}, {
                    $set: {
                        [stepName]: result,
                        architecture: self.model.architecture
                    }
                }, (err) =>
                {
                    if (err)
                    {
                        console.error(err);
                    }
                });
            }, databaseUpdateDelay);
        }

        return callback();
    }

    /**
     * This method loads an object into the lua process.
     *
     * @param {string} id The ID of the object to be stored
     * @param {object} input The input data for the object
     * @param {object} output The output data for the object
     * @param {function(err)} callback The callback after the object has been successfully stored
     */
    loadObject(id, input, output, callback)
    {
        const self = this;

        self.trainingProcess.loadObject(id, input, output, (err) =>
        {
            if (err)
            {
                return callback(err);
            }

            return callback(null);
        });
    }


    /**
     * This method goes fetches an object. This method uses a bucketing mechanism, allowing you to make lots
     * of separate, asynchronous calls and they will be batched together.
     *
     * @param {string} id The id of the object to be fetched
     * @returns {Promise} A promise that will resolve to the object,
     */
    fetchObject(id)
    {
        // Setup the fetch queue, if needed.
        if (!this.fetchQueue)
        {
            const maxObjectsToLoadAtOnce = 100;

            const customTransformationStream = EBCustomTransformationProcess.createCustomTransformationStream(this.model.architecture);
            const objectTransformationStream = this.model.architecture.getObjectTransformationStream();
            objectTransformationStream.on('error', (err) =>
            {
                console.log(err);
            });
            customTransformationStream.on('error', (err) =>
            {
                console.log(err);
            });

            this.fetchQueue = async.cargo((items, next) =>
            {
                const ids = items.map((item) => item.id);
                const resolverMap = {};
                items.forEach((item) =>
                {
                    resolverMap[item.id.toString()] = item.resolve;
                });

                this.application.dataSourcePluginDispatch.fetch(this.model.architecture.dataSource, {id: {$in: ids}}).then((objects) =>
                {
                    async.eachSeries(objects, (object, next) =>
                    {
                        // TODO: Need to handle the errors here
                        customTransformationStream.once('data', (data) =>
                        {
                            customTransformationStream.pause();
                            objectTransformationStream.write(data, null, () =>
                            {
                                customTransformationStream.resume();
                            });
                        });
                        objectTransformationStream.once('data', (data) =>
                        {
                            resolverMap[data.original.id](data);
                            return next();
                        });

                        customTransformationStream.write(object);
                    }, next);
                }, (error) => next(error));
            }, maxObjectsToLoadAtOnce);
        }

        return new Promise((resolve, reject) =>
        {
            this.fetchQueue.push({
                id,
                resolve,
                reject
            });
        });
    }


    /**
     * This method goes through all of the data in the sample, registering it as being either in the training set or the testing set.
     *
     * @param {number} count The number of objects to sample
     * @param {function(err)} callback The callback after all of the data is sampled
     */
    scanData(count, callback)
    {
        const self = this;

        const dataScanningResults = {
            status: "in_progress",
            percentageComplete: 0,
            totalObjects: 0,
            scannedObjects: 0
        };

        const objectsBetweenUpdate = 10000;

        let lastUpdateTime = new Date();

        const steps = [
            (next) =>
            {
                self.updateStepResult('dataScanning', dataScanningResults, next);
            },
            (next) =>
            {
                self.application.dataSourcePluginDispatch.count(self.model.architecture.dataSource).then((count) =>
                {
                    dataScanningResults.totalObjects = Math.min(self.numberOfObjectsToSample, count);
                    return next();
                }, (err) => next(err));
            },
            (next) =>
            {
                const trainingSetEntries = [];
                const testingSetEntries = [];

                // Get a random sample of data from the data source.
                const dataSource = self.model.architecture.dataSource;
                self.application.dataSourcePluginDispatch.sample(count, dataSource, (object) =>
                {
                    // Decide whether to put this entry into the training set
                    // or the testing set.
                    // First see how many entries we expect in each set
                    const total = trainingSetEntries.length + testingSetEntries.length;
                    const expectedTestingSetEntries = Math.ceil(self.testingSetPortion * total);
                    const expectedTrainingSetEntries = Math.floor((1.0 - self.testingSetPortion) * total);

                    // Compute the difference between the actual size and the expected size
                    const testingDifference = expectedTestingSetEntries - testingSetEntries.length;
                    const trainingDifference = expectedTrainingSetEntries - trainingSetEntries.length;

                    // Which ever one is larger, we put the item in that group
                    if (testingDifference < trainingDifference)
                    {
                        trainingSetEntries.push(object.id);
                    }
                    else
                    {
                        testingSetEntries.push(object.id);
                    }

                    dataScanningResults.scannedObjects += 1;

                    if ((dataScanningResults.scannedObjects % 100) === 0)
                    {
                        const timeTaken = Date.now() - lastUpdateTime.getTime();
                        self.rollingAverageTimeToLoad100Entries.accumulate(timeTaken);
                        lastUpdateTime = new Date();
                    }

                    if ((dataScanningResults.scannedObjects % objectsBetweenUpdate) === 0)
                    {
                        return Promise.fromCallback((next) =>
                        {
                            // Add a multiplier for safe measure. People generally prefer the system to
                            // overestimate slightly.
                            const multiplier = 1.1;
                            dataScanningResults.timeToLoadEntry = (self.rollingAverageTimeToLoad100Entries.average * multiplier) / 100;
                            dataScanningResults.percentageComplete = (dataScanningResults.scannedObjects * 100) / dataScanningResults.totalObjects;
                            self.updateStepResult('dataScanning', dataScanningResults, next);
                        });
                    }
                    else
                    {
                        return Promise.resolve(null);
                    }
                }).then(() =>
                {
                    // Shuffle the list of IDs so that they are in a random order
                    this.trainingSetEntries = underscore.shuffle(trainingSetEntries);
                    this.testingSetEntries = underscore.shuffle(testingSetEntries);

                    next();
                }, (err) => next(err));
            },
            (next) =>
            {
                dataScanningResults.status = 'complete';
                dataScanningResults.percentageComplete = 100;

                self.updateStepResult('dataScanning', dataScanningResults, next);
            }
        ];

        async.series(steps, callback);
    }

    fetchTrainingBatch()
    {
        if (!this.trainingFetchQueue)
        {
            this.trainingFetchQueue = [];
        }

        const iterationsForBatch = 25;
        const minimumTrainingObjectsInQueue = this.trainingBatchSize * iterationsForBatch;

        // First, lets make sure that there are enough objects in the two fetch queues
        while (this.trainingFetchQueue.length < minimumTrainingObjectsInQueue)
        {
            // Add an object to the fetch queue
            const id = this.trainingSetEntries[this.trainingSetPosition];
            this.trainingFetchQueue.push({id, promise: this.fetchObject(id)});
            this.trainingSetPosition = (this.trainingSetPosition + 1) % this.trainingSetEntries.length;
        }

        const trainingSampleEntries = this.trainingFetchQueue.splice(0, this.trainingBatchSize);

        return Promise.all(underscore.pluck(trainingSampleEntries, "promise")).then((results) =>
        {
            results.forEach((result) =>
            {
                result.id = result.original.id;
            });

            return results;
        });
    }

    fetchTestingBatch()
    {
        if (!this.testingFetchQueue)
        {
            this.testingFetchQueue = [];
        }

        const iterationsForBatch = 25;
        const minimumTrainingObjectsInQueue = this.testingBatchSize * iterationsForBatch;

        // First, lets make sure that there are enough objects in the two fetch queues
        while (this.testingFetchQueue.length < minimumTrainingObjectsInQueue)
        {
            // Add an object to the fetch queue
            const id = this.testingSetEntries[this.testingSetPosition];
            this.testingFetchQueue.push({id, promise: this.fetchObject(id)});
            this.testingSetPosition = (this.testingSetPosition + 1) % this.testingSetEntries.length;
        }

        const testingSampleEntries = this.testingFetchQueue.splice(0, this.testingBatchSize);

        return Promise.all(underscore.pluck(testingSampleEntries, "promise")).then((results) =>
        {
            results.forEach((result) =>
            {
                result.id = result.original.id;
            });

            return results;
        });
    }



    /**
     * This method runs the core training routine
     *
     * @param {function(err)} callback The callback after training is complete
     */
    trainModel(callback)
    {
        const self = this;
        const trainingIterations = 50000;
        const saveFrequency = 1000;
        const trainingResult = {
            status: 'in_progress',
            percentageComplete: 0,
            completedIterations: 0,
            totalIterations: trainingIterations,
            currentLoss: 0,
            currentAccuracy: 0,
            currentTimePerIteration: 0,
            iterations: []
        };

        let lastIterationTime = new Date();

        const iterationsForBatch = 25;

        self.updateStepResult('training', trainingResult, (err) =>
        {
            if (err)
            {
                return callback(err);
            }

            // Reset the model with random parameters
            self.trainingProcess.reset((err) =>
            {
                if (err)
                {
                    return callback(err);
                }

                // The number of iterations run so far
                async.whilst(
                    () =>
                    {
                        return trainingResult.completedIterations < trainingIterations;
                    },
                    (next) =>
                    {
                        this.fetchTrainingBatch().then((sample) =>
                        {
                            async.mapSeries(sample, (object, next) =>
                            {
                                this.loadObject(object.id, object.input, object.output, next);
                            }, (err) =>
                            {
                                if (err)
                                {
                                    return next(err);
                                }

                                self.trainingProcess.executeTrainingIteration(underscore.pluck(sample, "id"), (err, result) =>
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }

                                    // At the end of each iteration, update the current training results
                                    trainingResult.completedIterations += 1;
                                    trainingResult.percentageComplete = (trainingResult.completedIterations * 100) / trainingResult.totalIterations;
                                    trainingResult.currentLoss = result.loss;

                                    // Calculate the time taken for this iteration
                                    const timeTaken = new Date().getTime() - lastIterationTime.getTime();
                                    lastIterationTime = new Date();
                                    self.rollingAverageTimePerIteration.accumulate(timeTaken);
                                    trainingResult.currentTimePerIteration = self.rollingAverageTimePerIteration.average;

                                    async.mapSeries(sample, (object, next) =>
                                    {
                                        this.trainingProcess.removeObject(object.id, next);
                                    }, (err) =>
                                    {
                                        if (err)
                                        {
                                            return next(err);
                                        }

                                        self.testIteration((err, accuracy) =>
                                        {
                                            if (err)
                                            {
                                                return next(err);
                                            }

                                            self.rollingAverageAccuracy.accumulate(accuracy);
                                            trainingResult.currentAccuracy = self.rollingAverageAccuracy.average;
                                            trainingResult.iterations.push({
                                                loss: result.loss,
                                                accuracy: self.rollingAverageAccuracy.average
                                            });

                                            self.updateStepResult('training', trainingResult, (err) =>
                                            {
                                                if (err)
                                                {
                                                    return next(err);
                                                }

                                                if ((trainingResult.completedIterations % saveFrequency) === 0)
                                                {
                                                    self.saveTorchModelFile(next);
                                                }
                                                else
                                                {
                                                    return next();
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        }, (err) => next(err));
                    }, (err) =>
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        trainingResult.status = "complete";
                        trainingResult.percentageComplete = 100;

                        self.updateStepResult('training', trainingResult, callback);
                    });
            });
        });
    }

    /**
     * This method is used to test an object against the network and record its accuracy.
     *
     * It is run continuously as the network operates to continuously monitor how its doing.
     *
     * @param {function(err, accuracy)} callback The callback that will be provided with the accuracy.
     */
    testIteration(callback)
    {
        const self = this;

        const accuracies = [];

        this.fetchTestingBatch().then((sample) =>
        {
            async.mapSeries(sample, (object, next) =>
            {
                this.loadObject(object.id, object.input, object.output, next);
            }, (err) =>
            {
                if (err)
                {
                    return callback(err);
                }

                self.trainingProcess.processObjects(underscore.pluck(sample, "id"), (err, outputs) =>
                {
                    if (err)
                    {
                        return callback(err);
                    }

                    let index = 0;
                    async.eachSeries(sample, (object, next) =>
                    {
                        const output = outputs[index];
                        index += 1;

                        self.model.architecture.convertNetworkOutputObject(output, (err, actualOutput) =>
                        {
                            if (err)
                            {
                                return next(err);
                            }

                            self.getAccuracyFromOutput(object.original, actualOutput).then((accuracy) =>
                            {
                                accuracies.push(accuracy);
                                return next();
                            }, (err) => next(err));
                        });

                    }, (err) =>
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        async.mapSeries(sample, (object, next) =>
                        {
                            this.trainingProcess.removeObject(object.id, next);
                        }, (err) =>
                        {
                            if (err)
                            {
                                return callback(err);
                            }

                            const accuracy = math.mean(accuracies);

                            return callback(null, accuracy);
                        });
                    });
                });
            });
        });
    }

    /**
     * This method can be used to compare two objects and determine an accuracy score
     *
     * @param {object} expected The expected output object
     * @param {object} actual The actual output object produced by machine learning
     * @return {Promise} A promise that will resolve to the accuracy
     */
    getAccuracyFromOutput(expected, actual)
    {
        return Promise.fromCallback((next) =>
        {
            let correctClassifications = 0;
            let totalClassifications = 0;
            const numberPredictionErrors = [];
            this.model.architecture.outputSchema.walkObjectsAsync([expected, actual], (fieldName, values, fieldSchema, parents, parentSchema, next) =>
            {
                if (fieldSchema.isField && fieldSchema.configuration.included)
                {
                    if (fieldSchema.configuration.neuralNetwork.string.mode === 'classification')
                    {
                        totalClassifications += 1;
                        if (values[0] === values[1])
                        {
                            correctClassifications += 1;
                        }

                        fieldSchema.results.confusionMatrix.accumulateResult(values[0], values[1]);
                    }
                    else
                    {
                        // Calculating accuracy here is a bit quack, but we try anyhow
                        if (values[0] !== 0)
                        {
                            numberPredictionErrors.push(Math.max(0, Math.min(1, Math.abs((values[0] - values[1]) / values[0]))));
                        }
                        else if (values[1] !== 0)
                        {
                            numberPredictionErrors.push(Math.max(0, Math.min(1, Math.abs((values[0] - values[1]) / values[1]))));
                        }
                        else
                        {
                            numberPredictionErrors.push(0);
                        }
                    }
                }

                return next();
            }, (err) =>
            {
                if (err)
                {
                    return next(err);
                }

                const totalPredictionAccuracy = underscore.reduce(numberPredictionErrors, (total, error) => total + (1.0 - error), 0);
                const accuracy = (correctClassifications + totalPredictionAccuracy) / (totalClassifications + numberPredictionErrors.length);

                return next(null, accuracy);
            });
        });
    }


    /**
     * This method tests the model against all objects in the training set
     *
     * @param {function(err)} callback The callback after training is complete
     */
    testModel(callback)
    {
        const self = this;
        const testingResult = {
            status: 'in_progress',
            percentageComplete: 0,
            totalObjects: self.testingSetEntries.length,
            completedObjects: 0,
            accuracies: []
        };

        const objectsBetweenUpdate = 100;

        // Reset our position within the training set
        this.testingSetPosition = 0;
        let processedObjects = 0;

        const accuracies = [];

        self.updateStepResult('testing', testingResult, (err) =>
        {
            if (err)
            {
                return callback(err);
            }

            // Start plowing through the training set
            // The number of iterations run so far
            async.whilst(
                () =>
                {
                    return processedObjects < this.testingSetEntries.length;
                },
                (next) =>
                {
                    const start = new Date();

                    this.fetchTestingBatch().then((sample) =>
                    {
                        async.mapSeries(sample, (object, next) =>
                        {
                            this.loadObject(object.id, object.input, object.output, next);
                        }, (err) =>
                        {
                            if (err)
                            {
                                return next(err);
                            }

                            self.trainingProcess.processObjects(underscore.pluck(sample, "id"), (err, outputs) =>
                            {
                                if (err)
                                {
                                    return next(err);
                                }

                                let index = 0;
                                async.eachSeries(sample, (object, next) =>
                                {
                                    const output = outputs[index];
                                    index += 1;

                                    self.model.architecture.convertNetworkOutputObject(output, (err, actualOutput) =>
                                    {
                                        if (err)
                                        {
                                            return next(err);
                                        }

                                        self.getAccuracyFromOutput(object.original, actualOutput).then((accuracy) =>
                                        {
                                            accuracies.push(accuracy);

                                            processedObjects += 1;

                                            if (processedObjects % objectsBetweenUpdate === 0)
                                            {
                                                this.updateStepResult('testing', testingResult, next);
                                            }
                                            else
                                            {
                                                return next();
                                            }
                                        }, (err) => next(err));
                                    });

                                }, (err) =>
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }

                                    async.mapSeries(sample, (object, next) =>
                                    {
                                        this.trainingProcess.removeObject(object.id, next);
                                    }, (err) =>
                                    {
                                        if (err)
                                        {
                                            return next(err);
                                        }

                                        testingResult.accuracy = math.mean(accuracies);
                                        testingResult.completedObjects += 1;
                                        testingResult.percentageComplete = (testingResult.completedObjects * 100) / testingResult.totalObjects;

                                        return next(null);
                                    });
                                });
                            });
                        });
                    });
                }, (err) =>
                {
                    if (err)
                    {
                        return callback(err);
                    }

                    testingResult.percentageComplete = 100;
                    testingResult.status = 'complete';
                    this.updateStepResult('testing', testingResult, callback);
                });
        });
    }


    /**
     * This saves the trained torch model file
     *
     * @param {function(err)} callback The callback after the file has been saved
     */
    saveTorchModelFile(callback)
    {
        const self = this;
        self.trainingProcess.getTorchModelFileStream((err, stream) =>
        {
            if (err)
            {
                return callback(err);
            }

            stream.pipe(self.gridFS.openUploadStream(`model-${self.model._id}.t7`)).
            on('error', (error) =>
            {
                return callback(error);
            }).
            on('finish', () =>
            {

                return callback();
            });
        });
    }
}

module.exports = EBTrainModelTask;
