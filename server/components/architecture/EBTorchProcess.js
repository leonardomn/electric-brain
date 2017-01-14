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
    childProcess = require('child_process'),
    EBStdioJSONStreamProcess = require("../EBStdioJSONStreamProcess"),
    fs = require('fs'),
    math = require("mathjs"),
    path = require('path'),
    temp = require('temp'),
    underscore = require('underscore');

/**
 * This class is used to manage the Torch sub-process for a given architecture
 */
class EBTorchProcess
{
    /**
     * Creates the process object for the given EBArchitecture object.
     *
     * @param {EBArchitecture} architecture The architecture object that we are creating the torch process for.
     */
    constructor(architecture)
    {
        const self = this;
        self.architecture = architecture;
        self.scriptFolder = null;
        self.scriptFile = null;
        self.processes = [];
        self.allLoadedEntries = [];
        self.testingSet = {};
        self.numProcesses = 4;
    }


    /**
     * This function will generate the code and write the code to disk.
     *
     * @param {function(err, totalFiles)} callback Callback after the code has been written to disk, ready for the process to start
     */
    generateCode(callback)
    {
        const self = this;

        let totalFiles = 0;

        async.series([
            function writeGeneratedFiles(next)
            {
                // First, create a temporary folder to put all of the model files in
                temp.mkdir('electric-brain-model', (err, temporaryFolder) =>
                {
                    if (err)
                    {
                        return next(err);
                    }

                    // childProcess.execSync('rm -rf /home/bradley/electric-brain/training/*');
                    // self.scriptFolder = '/home/bradley/electric-brain/training/';
                    self.scriptFolder = temporaryFolder;

                    // Create a list of files that need to be written
                    const files = self.architecture.generateFiles();

                    // Write out each of the files
                    async.each(files, function(file, next)
                    {
                        totalFiles += 1;
                        fs.writeFile(path.join(self.scriptFolder, file.path), file.data, next);
                    }, next);
                });
            },
            function writeLibraryFiles(next)
            {
                // Write any libraries
                const libraryFiles = fs.readdirSync(path.join(__dirname, '..', '..', '..', 'lib', 'lua'));
                async.eachSeries(libraryFiles, function(filename, next)
                {
                    fs.readFile(path.join(__dirname, '..', '..', '..', 'lib', 'lua', filename), function(err, buffer)
                    {
                        if (err)
                        {
                            return next(err);
                        }

                        totalFiles += 1;
                        fs.writeFile(path.join(self.scriptFolder, filename), buffer, next);
                    });
                }, next);
            },
            function writeElectricBrainLibrary(next)
            {
                // Write any libraries
                const libraryFiles = fs.readdirSync(path.join(__dirname, '..', '..', '..', 'lib', 'lua'));
                async.eachSeries(libraryFiles, function(filename, next)
                {
                    fs.readFile(path.join(__dirname, '..', '..', '..', 'lib', 'lua', filename), function(err, buffer)
                    {
                        if (err)
                        {
                            return next(err);
                        }

                        totalFiles += 1;
                        fs.writeFile(path.join(self.scriptFolder, filename), buffer, next);
                    });
                }, next);
            }
        ], function(err)
        {
            if (err)
            {
                return callback(err);
            }

            return callback(null, totalFiles);
        });
    }

    /**
     * Starts up the sub process
     *
     * @param {function(err)} callback Callback to be called after the sub-process is started
     */
    startProcess(callback)
    {
        const self = this;

        async.series([
            function startProcess(next)
            {
                async.times(self.numProcesses, function(n, next)
                {
                    EBStdioJSONStreamProcess.spawn('luajit', ['TrainingScript.lua', n + 1, self.numProcesses], {
                        cwd: self.scriptFolder,
                        env: underscore.extend({TERM: "xterm"}, process.env)
                    }, function(err, process)
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        self.processes.push(process);

                        // Set up a handler for log messages coming from the lua process
                        process.outputStream.on('data', (data) =>
                        {
                            if (data.type === 'log')
                            {
                                self.logError(`${data.message}`);
                            }
                        });

                        process.on('close', (exitCode) =>
                        {
                            self.logError(`luajit closed: ${exitCode}`);
                        });

                        process.on('disconnect', () =>
                        {
                            self.logError(`luajit disconnected`);
                        });

                        process.on('error', (error) =>
                        {
                            self.logError(`luajit error: ${error}`);
                        });

                        process.on('exit', () =>
                        {
                            self.logError(`luajit exited`);
                        });

                        return next();
                    });
                }, next);
            },
            function handshake(next)
            {
                async.each(self.processes, function(process, next)
                {
                    // Now we handshake with the process and get version / name information
                    process.writeAndWaitForMatchingOutput({type: "handshake"}, {"type": "handshake"}, next);
                }, next);
            }
        ], callback);
    }

    /**
     * Kills the sub processes
     *
     * @param {function(err)} callback Callback to be called after the sub-processes are all killed
     */
    killProcess(callback)
    {
        const self = this;

        async.each(self.processes, function(process, next)
        {
            process.process.kill();
            next();
        }, callback);
    }


    /**
     * This method resets the parameters of the neural network model and the training process in general
     *
     * @param {function(err)} callback The callback after the process has been reset
     */
    reset(callback)
    {
        const self = this;

        async.each(self.processes, function(process, next)
        {
            process.writeAndWaitForMatchingOutput({type: "reset"}, {type: "resetCompleted"}, next);
        }, callback);
    }

    /**
     * A convenience method to log an error the the task log.
     *
     * @param {string} message The message to be logged. Should be a string.
     */
    logError(message)
    {
        console.log(message);
    }


    /**
     * This gets internal stats out of the Luajit process
     *
     * @param {function(err, statistics)} callback The callback with the statistics object
     */
    getInternalStatistics(callback)
    {
        const self = this;
        const message = {type: "stats"};
        self.processes[0].writeAndWaitForMatchingOutput(message, {type: "stats"}, function(err, response)
        {
            if (err)
            {
                return callback(err);
            }

            return callback(null, response.stats);
        });
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

        const message = {
            type: "store",
            id: id,
            input: input,
            output: output
        };

        async.each(self.processes, function(process, next)
        {
            process.writeAndWaitForMatchingOutput(message, {type: "stored"}, next);
        }, function(err)
        {
            if (err)
            {
                return callback(err);
            }

            self.allLoadedEntries.push(id);

            return callback();
        });
    }


    /**
     * This method causes an object to be forgotten
     *
     * @param {string} id The ID of the object to be stored
     * @param {function(err)} callback The callback after the object has been forgotten
     */
    removeObject(id, callback)
    {
        const self = this;

        const message = {
            type: "forget",
            id: id
        };

        async.each(self.processes, function(process, next)
        {
            process.writeAndWaitForMatchingOutput(message, {type: "forgotten"}, next);
        }, function(err)
        {
            if (err)
            {
                return callback(err);
            }

            self.allLoadedEntries.splice(self.allLoadedEntries.indexOf(id), 1);

            return callback();
        });
    }


    /**
     * This method runs a set of objects through the network and returns their processed versions
     *
     * @param {[string]} ids The IDs of the objects to be tested. These should already have been loaded into the Lua process
     * @param {function(err, accuracy, output)} callback The callback function which will receive the accuracy of the test, along with the output object
     */
    processObjects(ids, callback)
    {
        // Divide all of the ids between the various processes
        const processBatches = this.processes.map((process) =>
        {
            return {
                samples: [],
                process: process
            };
        });

        ids.forEach((id, index) => processBatches[index % processBatches.length].samples.push(id));

        // The maximum number of iterations to run for
        async.map(processBatches, (processBatch, next) =>
        {
            if (processBatch.samples.length === 0)
            {
                return next({objects: []});
            }

            const message = {
                type: "evaluate",
                samples: processBatch.samples
            };
            processBatch.process.writeAndWaitForMatchingOutput(message, {type: "evaluationCompleted"}, next);
        }, (err, results) =>
        {
            // Now we force each process to synchronize
            if (err)
            {
                return callback(err);
            }

            const allResults = {};
            results.forEach((processResults) =>
            {
                processResults.objects.forEach((object) =>
                {
                    allResults[object.id] = object;
                });
            });

            return callback(null, ids.map((id) => allResults[id]));
        });
    }


    /**
     * This method will execute a single training iteration with the given batch.
     *
     * @param {[string]} batch An array of object ids for the objects in the batch
     * @param {function(err)} callback The callback after the batch is complete
     */
    executeTrainingIteration(batch, callback)
    {
        // Divide the batch between the processes.
        const processBatches = this.processes.map((process) =>
        {
            return {
                samples: [],
                process: process
            };
        });

        batch.forEach((object, index) => processBatches[index % processBatches.length].samples.push(object));

        // The maximum number of iterations to run for
        async.map(processBatches, (processBatch, next) =>
        {
            if (processBatch.samples.length === 0)
            {
                return next({});
            }

            // Choose a bunch of random samples from the set that we have
            const message = {
                type: "iteration",
                samples: processBatch.samples
            };
            processBatch.process.writeAndWaitForMatchingOutput(message, {type: "iterationCompleted"}, next);
        }, (err, results) =>
        {
            // Now we force each process to synchronize
            if (err)
            {
                return callback(err);
            }

            async.map(this.processes, (process, next) =>
            {
                // Choose a bunch of random samples from the set that we have
                const message = {type: "synchronize"};
                process.writeAndWaitForMatchingOutput(message, {type: "synchronized"}, next);
            }, function(err)
            {
                if (err)
                {
                    return callback(err);
                }

                // Combine all the losses together
                const losses = underscore.pluck(results, "loss");
                const loss = math.mean(losses);
                return callback(null, {loss});
            });
        });
    }

    /**
     * This function retrieves the diagrams that are generated by torch.
     *
     * @param {function(err, diagrams)} callback This function will be called with a list of objects, each with two fields, the filename and the data
     */
    extractNetworkDiagrams(callback)
    {
        const self = this;
        let foundFiles = false;
        const retryAttempts = 50;
        const timeoutBetweenRetries = 150;
        const maxBufferSize = 10 * 1024 * 1024;
        async.retry(retryAttempts, function(callback)
        {
            fs.readdir(self.scriptFolder, function(err, files)
            {
                if (err)
                {
                    return callback(err);
                }

                // Go through the list of files for the dot files
                const dotFiles = underscore.filter(files, (file) => (/^.*\.dot$/g).test(file));

                if (dotFiles.length === 0)
                {
                    setTimeout(function()
                    {
                        return callback(new Error("Could not find any architectural diagrams"));
                    }, timeoutBetweenRetries);
                }
                else
                {
                    // Retrieve each image
                    async.map(dotFiles, function(file, next)
                    {
                        childProcess.exec(`dot -Grankdir=LR ${path.join(self.scriptFolder, file)} -Tsvg`, {maxBuffer: maxBufferSize}, function(err, result)
                        {
                            if (err)
                            {
                                return next(err);
                            }

                            return next(null, {
                                file: file,
                                data: new Buffer(result).toString('base64')
                            });
                        });
                    }, callback);
                }
            });
        }, callback);
    }


    /**
     * This causes the torch process to save the torch model, and then returns a stream to that model file
     *
     * @param {function(err, statistics)} callback The callback with the statistics object
     */
    getTorchModelFileStream(callback)
    {
        const self = this;
        const message = {type: "save"};
        self.processes[0].writeAndWaitForMatchingOutput(message, {type: "saved"}, function(err, response)
        {
            if (err)
            {
                return callback(err);
            }

            const stream = fs.createReadStream(path.join(self.scriptFolder, 'model.t7'));

            return callback(null, stream);
        });
    }


    /**
     * This method tells the process to load its model data from torch model file
     *
     * @param {function(err)} callback The callback which will be called when the model file has been loaded
     */
    loadModelFile(callback)
    {
        const self = this;

        const message = {
            type: "load"
        };

        async.each(self.processes, function(process, next)
        {
            process.writeAndWaitForMatchingOutput(message, {type: "loaded"}, function(err, result)
            {
                if (err)
                {
                    return next(err);
                }

                return next(null);
            });
        }, callback);
    }
}

module.exports = EBTorchProcess;