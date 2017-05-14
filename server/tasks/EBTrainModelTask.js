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
        this.needAnotherDatabaseUpdate = false;
        this.frontendUpdateInterval = 2500;
        this.databaseUpdateInterval = 5000;
        this.numberOfObjectsToSample = 1000000;
        this.model = null;

        this.trainingSetEntries = [];
        this.testingSetEntries = [];
        this.testingSetPosition = 0;
        this.trainingSetPosition = 0;

        const numWorkers = 4;
        this.workers = [];
        for (let workerIndex = 0; workerIndex < numWorkers; workerIndex += 1)
        {
            const scriptPath = path.join(__dirname, '..', 'train_model_worker.js');
            this.workers.push(EBStdioJSONStreamProcess.spawn(scriptPath, [], {}));
        }
        this.currentWorker = 0;
        this.batchNumber = 0;
    }

    /**
     *  This is the entry point for the train model task.
     *
     *  @param {beaver.Task} task The Beaver task object
     *  @param {object} args The arguments for this task. It should only contain a single argument,
     *                       the MongoID of the EBModel object that needs to be trained.
     *  @return {Promise} A promise that will resolve with the finished EBModel object.
     */
    run(task, args)
    {
        const self = this;

        self.task = task;

        return Promise.fromCallback((next) =>
        {
            // First log the start
            self.task.log(self.task, `Starting the task to train the model with _id: ${args._id}`, next);
        }).then(()=>
        {
            // Retrieve the model object that this task refers to
            return self.models.find({_id: args._id}).toArray();
        }).then((objects) =>
        {
            if (objects.length === 0)
            {
                return Promise.rejected(new Error("EBModel not found!"));
            }
            else
            {
                self.model = new models.EBModel(objects[0]);
                self.trainingProcess = new EBTorchProcess(self.model.architecture, self.application.config.get('overrideModelFolder'));
                return Promise.resolve();
            }
        }).then(()=>
            // Short circuit: is this a retry? Set running to false and exit.
        {
            if (self.model.running)
            {
                const promise = self.models.update({_id: args._id}, {$set: {running: false}});
                return promise.then(() =>
                {
                    return Promise.rejected(new Error("This model has already started training. It must have failed."));
                });
            }
            else
            {
                self.model.running = true;
                return self.models.update({_id: args._id}, {$set: {running: true}});

            }
        }).then(() =>
        {
            // Initialize sub-process workers
            return Promise.each(this.workers, (worker) => worker.writeAndWaitForMatchingOutput({
                "type": "initialize",
                "id": args._id
            }, {"type": "initialized"}));
        }).then(() =>
        {
            // Generate the code
            const promise = self.trainingProcess.generateCode(self.application.interpretationRegistry, self.application.neuralNetworkComponentDispatch);
            return promise.then((totalFiles) =>
            {
                const codeGenerationResult = {
                    status: 'complete',
                    percentageComplete: 100,
                    totalFiles: totalFiles
                };

                return self.updateStepResult('codeGeneration', codeGenerationResult);
            });
        }).then(() =>
        {
            // Start up the process
            return self.trainingProcess.startProcess();

        }).then(() =>
        {
            // Scan the data, analyze it for input
            return self.scanData(self.numberOfObjectsToSample);
        }).then(() =>
        {
            // Save the model in its vanilla state. This just ensures that other
            // functionality that depends on downloading the torch model file
            // works from the first iteration of training
            return self.saveTorchModelFile();
        }).then(() =>
        {
            // Training model
            return self.trainModel();
        }).then(() =>
        {
            // Test model
            return self.testModel();
        }).then(() =>
        {
            // Kill the process
            return self.trainingProcess.killProcess();
        }).then(() =>
        {
            // Set the model to be complete, and save the final object
            self.model.running = false;
            return self.models.update({_id: args._id}, self.model);
        }).then(() =>
        {
            return self.model;
        });
    }

    /**
     * This function updates the current results for a given step
     *
     * @param {string} stepName The name of the step being updated. Should be the same as the the field names in EBModel
     * @param {object} result An object with the results
     * @return {Promise} Resolves a promise after the process is started and ready to receive commands
     */
    updateStepResult(stepName, result)
    {
        const self = this;

        // First, set the value on the model object
        self.model[stepName] = result;

        return Promise.fromCallback((callback) =>
        {
            // Scheduling to send updates to the frontend
            if (!self.isFrontendUpdateScheduled)
            {
                self.isFrontendUpdateScheduled = true;
                let frontendUpdateDelay = 0;
                if (self.lastFrontendUpdateTime)
                {
                    frontendUpdateDelay = Math.max(0, self.frontendUpdateInterval - (Date.now() - self.lastFrontendUpdateTime.getTime()));
                }

                const updateFrontend = function updateFrontend()
                {
                    self.isFrontendUpdateScheduled = false;
                    self.lastFrontendUpdateTime = new Date();

                    self.socketio.to('general').emit(`model-${self.model._id.toString()}`, {
                        event: 'update',
                        model: self.model
                    });
                };

                setTimeout(updateFrontend, frontendUpdateDelay);
            }

            // Scheduling to send updates to the database
            if (!self.isDatabaseUpdateScheduled)
            {
                self.isDatabaseUpdateScheduled = true;

                const updateDatabase = function updateDatabase()
                {
                    self.isDatabaseUpdateScheduled = true;
                    self.lastDatabaseUpdateTime = new Date();

                    self.models.updateOne({_id: self.model._id}, self.model, (err) =>
                    {
                        if (err)
                        {
                            console.error(err);
                        }

                        self.isDatabaseUpdateScheduled = false;
                        if (self.needAnotherDatabaseUpdate)
                        {
                            self.needAnotherDatabaseUpdate = false;
                            updateDatabase();
                        }
                    });
                };

                let databaseUpdateDelay = 0;
                if (self.lastDatabaseUpdateTime)
                {
                    databaseUpdateDelay = Math.max(0, self.databaseUpdateInterval - (Date.now() - self.lastDatabaseUpdateTime.getTime()));
                }
                setTimeout(updateDatabase, databaseUpdateDelay);
            }
            else
            {
                self.needAnotherDatabaseUpdate = true;
            }

            return callback();
        });
    }

    /**
     * This method loads an object into the lua process.
     *
     * @param {string} id The ID of the object to be stored
     * @param {object} input The input data for the object
     * @param {object} output The output data for the object
     * @return {Promise} Resolves a promise after the object has been successfully stored
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
     *@return {Promise} Resolves a promise after all of the data is sampled
     */
    scanData(count)
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

        const promise = self.updateStepResult('dataScanning', dataScanningResults);
        return promise.then(() =>
        {
            return self.application.dataSourcePluginDispatch.count(self.model.architecture.dataSource).then((count) =>
            {
                return dataScanningResults.totalObjects = Math.min(self.numberOfObjectsToSample, count);
            });
        }).then(() =>
        {
            const trainingSetEntries = [];
            const testingSetEntries = [];

            // Get a random sample of data from the data source.
            const dataSource = self.model.architecture.dataSource;
            return self.application.dataSourcePluginDispatch.sample(count, dataSource, (object) =>
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
                    // Add a multiplier for safe measure. People generally prefer the system to
                    // overestimate slightly.
                    const multiplier = 1.1;
                    dataScanningResults.timeToLoadEntry = (self.rollingAverageTimeToLoad100Entries.average * multiplier) / 100;
                    dataScanningResults.percentageComplete = (dataScanningResults.scannedObjects * 100) / dataScanningResults.totalObjects;
                    return self.updateStepResult('dataScanning', dataScanningResults);
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

                dataScanningResults.status = 'complete';
                dataScanningResults.percentageComplete = 100;

                return self.updateStepResult('dataScanning', dataScanningResults);
            });
        });
    }

    /**
     * This method creates a batch from the given set of object ids.
     *
     * @param {string} ids The list of ids to make a batch from
     * @returns {Promise} A promise that will resolve to an object with two properties:
     *      {
     *          inputFileName: String // The name of the file that contains the batch
     *          outputFileName: String // The name of the file that contains the batch
     *          objects: [object] // The data for the objects objects within the batch
     *      }
     */
    prepareBatch(ids)
    {
        const workerPromise = this.workers[this.currentWorker];
        this.currentWorker = (this.currentWorker + 1) % this.workers.length;

        const batchNumber = this.batchNumber;
        this.batchNumber += 1;

        return workerPromise.then((worker) =>
        {
            const inputFileName = temp.path({suffix: '.t7'});
            const outputFileName = temp.path({suffix: '.t7'});
            return worker.writeAndWaitForMatchingOutput({
                "type": "prepareBatch",
                "batchNumber": batchNumber,
                "ids": ids,
                "inputFileName": inputFileName,
                "outputFileName": outputFileName
            }, {
                "type": "batchPrepared",
                "batchNumber": batchNumber
            }).then((output) =>
            {
                return {
                    inputFileName: inputFileName,
                    outputFileName: outputFileName,
                    objects: output.objects
                };
            });
        });
    }

    /**
     * This method is used to put together a training batch
     *
     * @returns {Promise} A promise that will resolve to the inputFileName and outputFileName that the batch is stored in.
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
     * @returns {Promise} A promise that will resolve to the inputFileName and outputFileName that the batch is stored in.
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
                const id = this.testingSetEntries[this.testingSetPosition];
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
     * @return {Promise} Resolves a promise after training is complete
     */
    trainModel()
    {
        const self = this;
        const trainingIterations = self.model.parameters.iterations;
        const saveFrequency = 500;
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

        const promise = self.updateStepResult('training', trainingResult);
        return promise.then(() =>
        {
            // Reset the model with random parameters
            return self.trainingProcess.reset();
        }).then(() =>
        {
            return Promise.fromCallback((next) =>
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
                            // console.log('executing', batch);
                            return self.trainingProcess.executeTrainingIteration(batch.inputFileName, batch.outputFileName).then((result) =>
                            {
                                performanceTrace.addTrace('training-iteration');

                                // At the end of each iteration, update the current training results
                                trainingResult.completedIterations += 1;
                                trainingResult.percentageComplete = (trainingResult.completedIterations * 100) / trainingResult.totalIterations;
                                trainingResult.currentLoss = result.loss;

                                // Update the time per iteration
                                trainingResult.currentTimePerIteration = trainingResult.performance.total();

                                // Zip together original objects with the actual outputs from the network, and compute accuracies
                                return Promise.mapSeries(underscore.zip(batch.objects, result.objects), (zipped) =>
                                {
                                    return self.model.architecture.convertNetworkOutputObject(this.application.interpretationRegistry, zipped[1]).then((actual) =>
                                    {
                                        return self.getAccuracyFromOutput(zipped[0].original, actual, false);
                                    });
                                }).then((accuracies) =>
                                {
                                    return {
                                        trainingAccuracy: math.mean(accuracies),
                                        loss: result.loss
                                    };
                                });
                            }).then((trainingIterationResult) =>
                            {
                                // Unlink the batch file
                                return Promise.fromCallback((next) =>
                                {
                                    fs.unlink(batch.inputFileName, (err) =>
                                    {
                                        if (err)
                                        {
                                            return next(err);
                                        }
                                        
                                        fs.unlink(batch.outputFileName, (err) =>
                                        {
                                            if (err)
                                            {
                                                return next(err);
                                            }

                                            performanceTrace.addTrace('delete-batch');
                                            return next(null, trainingIterationResult);
                                        });
                                    });
                                });
                            }).then((trainingIterationResult) =>
                            {
                                self.rollingAverageTrainingaccuracy.accumulate(trainingIterationResult.trainingAccuracy * 100);
                                return self.testIteration().then((testingAccuracy) =>
                                {
                                    return {
                                        trainingIterationResult: trainingIterationResult,
                                        testingAccuracy: testingAccuracy
                                    };
                                });
                            }).then((results) =>
                            {
                                performanceTrace.addTrace('testing-iteration');
                                self.rollingAverageAccuracy.accumulate(results.testingAccuracy);
                                trainingResult.currentAccuracy = self.rollingAverageAccuracy.average;
                                trainingResult.iterations.push({
                                    loss: results.trainingIterationResult.loss,
                                    accuracy: self.rollingAverageAccuracy.average,
                                    trainingAccuracy: self.rollingAverageTrainingaccuracy.average
                                });

                                return self.updateStepResult('training', trainingResult);
                            }).then(() =>
                            {
                                performanceTrace.addTrace('save-to-db');
                                trainingResult.performance.accumulate(performanceTrace);

                                if ((trainingResult.completedIterations % saveFrequency) === 0)
                                {
                                    return self.saveTorchModelFile();
                                }
                                else
                                {
                                    return Promise.resolve();
                                }
                            }).then(() => next());
                        }, (err) => next(err));
                    }, (err) =>
                    {
                        if (err)
                        {
                            return next(err);
                        }

                        trainingResult.status = "complete";
                        trainingResult.percentageComplete = 100;

                        self.updateStepResult('training', trainingResult).then(() => next(), (err) => next(err));
                    });
            });
        });
    }

    /**
     * This method is used to test an object against the network and record its accuracy.
     *
     * It is run continuously as the network operates to continuously monitor how its doing.
     *
     * @return {Promise} Resolves a promise that will be provided with the accuracy.
     */
    testIteration()
    {
        const self = this;
        return this.prepareTestingBatch().then((batch) =>
        {
            return self.trainingProcess.processBatch(batch.inputFileName).then((outputs) =>
            {
                // Zip together original objects with the actual outputs from the network, and compute accuracies
                return Promise.mapSeries(underscore.zip(batch.objects, outputs), (zipped) =>
                {
                    return self.model.architecture.convertNetworkOutputObject(this.application.interpretationRegistry, zipped[1]).then((actual) =>
                    {
                        return self.getAccuracyFromOutput(zipped[0].original, actual, true);
                    });
                });
            }).then((accuracies) =>
            {
                return Promise.fromCallback((next) =>
                {
                    fs.unlink(batch.inputFileName, function(err)
                    {
                        if (err)
                        {
                            return next(err);
                        }

                        fs.unlink(batch.outputFileName, next);
                    });
                }).then(() =>
                {
                    const accuracy = math.mean(accuracies);
                    return accuracy;
                });
            });
        });
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
     * @return {Promise} Resolves a promise  after training is complete
     */
    testModel()
    {
        const testingResult = {
            status: 'in_progress',
            percentageComplete: 0,
            totalObjects: this.testingSetEntries.length,
            completedObjects: 0,
            accuracies: []
        };

        // Reset our position within the training set
        this.testingSetPosition = 0;
        let processedObjects = 0;

        const accuracies = [];

        const promise = this.updateStepResult('testing', testingResult);
        return promise.then(() =>
        {
            return Promise.fromCallback((callback) =>
            {
                // Start plowing through the training set
                // The number of iterations run so far
                async.whilst(
                    () =>
                    {
                        return processedObjects < this.testingSetEntries.length;
                    },
                    (next) =>
                    {
                        this.prepareTestingBatch().then((batch) =>
                        {
                            return this.trainingProcess.processBatch(batch.inputFileName).then((outputs) =>
                            {
                                processedObjects += batch.objects.length;

                                // Zip together original objects with the actual outputs from the network, and compute accuracies
                                return Promise.mapSeries(underscore.zip(batch.objects, outputs), (zipped) =>
                                {
                                    return this.model.architecture.convertNetworkOutputObject(this.application.interpretationRegistry, zipped[1]).then((actual) =>
                                    {
                                        return this.getAccuracyFromOutput(zipped[0].original, actual, true);
                                    });
                                });
                            }).then((batchAccuracies) =>
                            {
                                return Promise.fromCallback((next) =>
                                {
                                    fs.unlink(batch.inputFileName, function(err)
                                    {
                                        if (err)
                                        {
                                            return next(err);
                                        }

                                        fs.unlink(batch.outputFileName, next);
                                    });
                                }).then(() =>
                                {
                                    return batchAccuracies;
                                });
                            });
                        }).then((batchAccuracies) =>
                        {
                            batchAccuracies.forEach((accuracy) => accuracies.push(accuracy));
                            testingResult.accuracy = math.mean(accuracies);
                            testingResult.completedObjects += Math.min(batchAccuracies.length, testingResult.totalObjects);
                            testingResult.percentageComplete = (testingResult.completedObjects * 100) / testingResult.totalObjects;
                            return this.updateStepResult('testing', testingResult);
                        }).then(() => next(), (err) => next(err));
                    }, (err) =>
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        testingResult.percentageComplete = 100;
                        testingResult.status = 'complete';
                        const resultPromise = this.updateStepResult('testing', testingResult);
                        resultPromise.then(() => callback(null), (err) => callback(err));
                    });
            });
        });
    }


    /**
     * This saves the trained torch model file
     *
     * @return {Promise} Resolves a promise  after the file has been saved
     */
    saveTorchModelFile()
    {
        const self = this;
        return Promise.fromCallback((callback) =>
        {
            const promise = self.trainingProcess.getTorchModelFileStream();
            promise.then((stream) =>
            {
                const fileName = `model-${self.model._id}.t7`;
                stream.pipe(self.gridFS.openUploadStream(`model-${self.model._id}.t7`)).on('error', (error) =>
                {
                    return callback(error);
                }).on('finish', () =>
                {
                    // Delete the older model files, if there are any
                    self.gridFS.find({filename: fileName}, {
                        sort: {uploadDate: -1}
                    }).toArray().then((files) =>
                    {
                        const filesToDelete = files.splice(1, files.length - 1);
                        async.eachSeries(filesToDelete, (file, next) => self.gridFS.delete(file._id, next), callback);
                    }, (err) => callback(err));
                });
            }, (err) => callback(err));
        });
    }
}

module.exports = EBTrainModelTask;
