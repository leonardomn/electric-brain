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
    EBPerformanceData = require('../../shared/models/EBPerformanceData'),
    EBPerformanceTrace = require('../../shared/models/EBPerformanceTrace'),
    EBRollingAverage = require("../../shared/models/EBRollingAverage"),
    EBStdioJSONStreamProcess = require("../components/EBStdioJSONStreamProcess"),
    EBTorchProcess = require('../components/architecture/EBTorchProcess'),
    fs = require('fs'),
    math = require('mathjs'),
    models = require("../../shared/models/models"),
    mongodb = require('mongodb'),
    path = require('path'),
    Promise = require('bluebird'),
    temp = require('temp'),
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
        this.rollingAverageAccuracy = EBRollingAverage.createWithPeriod(100);
        this.rollingAverageTrainingaccuracy = EBRollingAverage.createWithPeriod(100);
        this.rollingAverageTimeToLoad100Entries = EBRollingAverage.createWithPeriod(100);
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

        const numWorkers = 1;
        this.workers = [];
        for (let workerIndex = 0; workerIndex < numWorkers; workerIndex += 1)
        {
            const scriptPath = path.join(__dirname, '..', 'train_model_worker.js');
            this.workers.push(EBStdioJSONStreamProcess.spawn(scriptPath, [], {}));
        }
        this.currentWorker = 0;
        this.trainingBatchNumber = 0;
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
            // Initialize sub-process workers
            (next) =>
            {
                const initializePromise = Promise.each(this.workers, (worker) => worker.writeAndWaitForMatchingOutput({
                    "type": "initialize",
                    "id": args._id
                }, {"type": "initialized"}));
                initializePromise.then(() => next(), (err) => next(err));
            },
            // Generate the code
            (next) =>
            {
                const promise = self.trainingProcess.generateCode(self.application.interpretationRegistry, self.application.neuralNetworkComponentDispatch);
                promise.then((totalFiles) =>
                {
                    const codeGenerationResult = {
                        status: 'complete',
                        percentageComplete: 100,
                        totalFiles: totalFiles
                    };

                    self.updateStepResult('codeGeneration', codeGenerationResult, next);
                }, (err) => next(err));
            },
            // Start up the process
            (next) =>
            {
                const promise = self.trainingProcess.startProcess();
                promise.then( () =>
                {
                    next(null);
                }, (err) => next(err));
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
    loadObject(id, input, output)
    {
        const self = this;
        return self.trainingProcess.loadObject(id, input, output);
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
            const objectTransformationStream = this.model.architecture.getObjectTransformationStream(this.application.interpretationRegistry);
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

        const objectsBetweenUpdate = 1000;

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

    /**
     * This method creates a batch from the given set of object ids.
     *
     * @param {string} ids The list of ids to make a batch from
     * @returns {Promise} A promise that will resolve to an object with two properties:
     *      {
     *          fileName: String // The name of the file that contains the batch
     *          objects: [object] // The data for the objects objects within the batch
     *      }
     */
    prepareBatch(ids)
    {
        const workerPromise = this.workers[this.currentWorker];
        this.currentWorker = (this.currentWorker + 1) % this.workers.length;

        const batchNumber = this.trainingBatchNumber;
        this.trainingBatchNumber += 1;

        return workerPromise.then((worker) =>
        {
            const fileName = temp.path({suffix: '.t7'});
            return worker.writeAndWaitForMatchingOutput({
                "type": "prepareBatch",
                "batchNumber": batchNumber,
                "ids": ids,
                "fileName": fileName
            }, {
                "type": "batchPrepared",
                "batchNumber": batchNumber
            }).then((output) =>
            {
                return {
                    fileName: fileName,
                    objects: output.objects
                };
            });
        });
    }

    /**
     * This method is used to put together a training batch
     *
     * @returns {Promise} A promise that will resolve to the fileName that the batch is stored in.
     */
    prepareTrainingBatch()
    {
        if (!this.trainingBatchQueue)
        {
            this.trainingBatchQueue = [];
        }

        const minimumIterationsPrepared = 10;

        while (this.trainingBatchQueue.length < minimumIterationsPrepared)
        {
            const ids = [];
            for (let sampleN = 0; sampleN < this.model.parameters.batchSize; sampleN += 1)
            {
                const id = this.trainingSetEntries[this.trainingSetPosition];
                ids.push(id);
                this.trainingSetPosition = (this.trainingSetPosition + 1) % this.trainingSetEntries.length;
            }

            this.trainingBatchQueue.push(this.prepareBatch(ids));
        }

        return this.trainingBatchQueue.shift();
    }

    /**
     * This method is used to put together a testing batch
     *
     * @returns {Promise} A promise that will resolve to the fileName that the batch is stored in.
     */
    prepareTestingBatch()
    {
        if (!this.testingBatchQueue)
        {
            this.testingBatchQueue = [];
        }

        const minimumIterationsPrepared = 10;

        while (this.testingBatchQueue.length < minimumIterationsPrepared)
        {
            const ids = [];
            for (let sampleN = 0; sampleN < this.model.parameters.testingBatchSize; sampleN += 1)
            {
                const id = this.trainingSetEntries[this.testingSetPosition];
                ids.push(id);
                this.testingSetPosition = (this.testingSetPosition + 1) % this.testingSetEntries.length;
            }

            this.testingBatchQueue.push(this.prepareBatch(ids));
        }

        return this.testingBatchQueue.shift();
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
            iterations: [],
            performance: new EBPerformanceData()
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
            const promise = self.trainingProcess.reset();
            promise.then(() =>
            {
                // The number of iterations run so far
                async.whilst(
                    () =>
                    {
                        return trainingResult.completedIterations < trainingIterations;
                    },
                    (next) =>
                    {
                        const performanceTrace = new EBPerformanceTrace();

                        this.prepareTrainingBatch().then((batch) =>
                        {
                            performanceTrace.addTrace('prepare-batch');
                            
                            const promise = self.trainingProcess.executeTrainingIteration(batch.fileName);
                            promise.then((result) =>
                            {
                                performanceTrace.addTrace('training-iteration');

                                // At the end of each iteration, update the current training results
                                trainingResult.completedIterations += 1;
                                trainingResult.percentageComplete = (trainingResult.completedIterations * 100) / trainingResult.totalIterations;
                                trainingResult.currentLoss = result.loss;

                                // Update the time per iteration
                                trainingResult.currentTimePerIteration = trainingResult.performance.total();

                                const trainingAccuracies = [];
                                let index = 0;
                                async.eachSeries(underscore.zip(batch.objects, result.objects), (zippedObjects, next) =>
                                {
                                    const expected = zippedObjects[0];
                                    const actual = zippedObjects[1];
                                    self.getAccuracyFromOutput(expected.output, actual, false).then((trainingAccuracy) =>
                                    {
                                        trainingAccuracies.push(trainingAccuracy);
                                        return next();
                                    }, (err) => next(err));
                                }, (err) =>
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }

                                    fs.unlink(batch.fileName, (err) =>
                                    {
                                        if (err)
                                        {
                                            return next(err);
                                        }

                                        performanceTrace.addTrace('remove-object');

                                        self.testIteration((err, accuracy) =>
                                        {
                                            if (err)
                                            {
                                                return next(err);
                                            }

                                            performanceTrace.addTrace('testing-iteration');

                                            const trainingAccuracy = math.mean(trainingAccuracies);
                                            self.rollingAverageAccuracy.accumulate(accuracy);
                                            self.rollingAverageTrainingaccuracy.accumulate(trainingAccuracy * 100);
                                            trainingResult.currentAccuracy = self.rollingAverageAccuracy.average;
                                            trainingResult.iterations.push({
                                                loss: result.loss,
                                                accuracy: self.rollingAverageAccuracy.average,
                                                trainingAccuracy: self.rollingAverageTrainingaccuracy.average
                                            });

                                            self.updateStepResult('training', trainingResult, (err) =>
                                            {
                                                if (err)
                                                {
                                                    return next(err);
                                                }

                                                performanceTrace.addTrace('save-to-db');
                                                trainingResult.performance.accumulate(performanceTrace);

                                                if ((trainingResult.completedIterations % saveFrequency) === 0)
                                                {
                                                    self.saveTorchModelFile(next);
                                                }
                                                else
                                                {
                                                    return next();
                                                }
                                            });
                                        }, (err) => next(err));
                                    });
                                });
                            }, (err) => next(err));
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
            }, (err) => callback(err));
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

        this.prepareTestingBatch().then((batch) =>
        {
            const promise = self.trainingProcess.processBatch(batch.fileName);
            promise.then((outputs) =>
            {
                let index = 0;
                async.eachSeries(batch.objects, (object, next) =>
                {
                    const output = outputs[index];
                    index += 1;

                    self.getAccuracyFromOutput(object.output, output, true).then((accuracy) =>
                    {
                        accuracies.push(accuracy);
                        return next();
                    }, (err) => next(err));
                }, (err) =>
                {
                    if (err)
                    {
                        return callback(err);
                    }

                    fs.unlink(batch.fileName, (err) =>
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        const accuracy = math.mean(accuracies);

                        return callback(null, accuracy);
                    });
                });
            }, (err) => callback(err));
        }, (err) => callback(err));
    }

    /**
     * This method can be used to compare two objects and determine an accuracy score
     *
     * @param {object} expected The expected output object
     * @param {object} actual The actual output object produced by machine learning
     * @param {boolean} accumulateResult Whether to accumulate the result of this comparison into the schema for display on the frontend
     * @return {Promise} A promise that will resolve to the accuracy
     */
    getAccuracyFromOutput(expected, actual, accumulateResult)
    {
        return Promise.fromCallback((next) =>
        {
            const accuracies = [];
            this.model.architecture.outputSchema.walkObjectsAsync([expected, actual], (fieldName, values, fieldSchema, parents, parentSchema, next) =>
            {
                if (fieldSchema.isField && fieldSchema.configuration.included)
                {
                    accuracies.push(this.application.interpretationRegistry.getInterpretation(fieldSchema.metadata.mainInterpretation).compareNetworkOutputs(values[0], values[1], fieldSchema, accumulateResult));
                }

                return next();
            }, (err) =>
            {
                if (err)
                {
                    return next(err);
                }

                return next(null, math.mean(accuracies));
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

                    this.prepareTestingBatch().then((batch) =>
                    {
                        const promise = self.trainingProcess.processBatch(batch.fileName);
                        promise.then((outputs) =>
                        {
                            let index = 0;
                            async.eachSeries(batch.objects, (object, next) =>
                            {
                                const output = outputs[index];
                                index += 1;

                                self.model.architecture.convertNetworkOutputObject(this.application.interpretationRegistry, output, (err, actualOutput) =>
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }

                                    self.getAccuracyFromOutput(object.original, actualOutput, true).then((accuracy) =>
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


                                fs.unlink(batch.fileName, (err) =>
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
                        }, (err) => next(err));
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
        const promise = self.trainingProcess.getTorchModelFileStream();
        promise.then((stream) =>
        {
            stream.pipe(self.gridFS.openUploadStream(`model-${self.model._id}.t7`)).on('error', (error) =>
             {
                 return callback(error);
             }).on('finish', () =>
             {
                return callback();
             });
        }, (err) => callback(err));
    }
}

module.exports = EBTrainModelTask;
