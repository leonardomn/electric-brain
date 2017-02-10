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
    EBModel = require('../../shared/models/EBModel'),
    EBTorchProcess = require('./architecture/EBTorchProcess'),
    fs = require('fs'),
    path = require('path'),
    Promise = require('bluebird'),
    ReadWriteLock = require('rwlock');

/**
 * This is the main class for bundled models. Feel free to modify this script as you like,
 * or embed it into a larger NodeJS application.
 */
class EBBundleScript
{
    /**
     * Constructor for the EBBundleScript object. It will load the model data contained within
     * the given filename.
     *
     * @param {string} [bundleFolder] The folder containing the torch bundle.
     */
    constructor(bundleFolder)
    {
        if (!bundleFolder)
        {
            bundleFolder = __dirname;
        }

        const filename = path.join(bundleFolder, "model.json");
        const modelFileContents = fs.readFileSync(filename);
        const modelJSON = JSON.parse(modelFileContents);
        const model = new EBModel(modelJSON);
        this.model = model;
        this.bundleFolder = bundleFolder;
        this.lock = new ReadWriteLock();
    }

    /**
     * This function starts the model process. You must do this before processing
     * any data.
     *
     * @returns {Promise} A promise that will resolve when the model process is running.
     */
    startModelProcess()
    {
        this.modelProcess = new EBTorchProcess(this.model.architecture, this.bundleFolder);
        return Promise.fromCallback((next) =>
        {
            async.series([
                // Start up the process
                (next) =>
                {
                    const promise = this.modelProcess.startProcess();
                    promise.then(() =>
                    {
                        next(null);
                    }, (err) => next(err));
                },
                // Load the model file from the disk
                (next) =>
                {
                    const promise = this.modelProcess.loadModelFile();
                    promise.then(() =>
                    {
                        return next();
                    }, (err) =>
                    {
                        return next(err);
                    });
                }
            ], next);
        });
    }

    /**
     * This function runs a bunch of objects through the network.
     *
     * @param {[object]} objects An array of JSON objects to be processed.
     * @return {Promise} A promise that will resolve the output of the neural network for each object.
     */
    processData(objects)
    {
        return Promise.fromCallback((callback) =>
        {
            this.lock.writeLock((release) =>
            {
                const next = (err, results) =>
                {
                    release();
                    return callback(err, results);
                };

                const stream = this.model.architecture.getObjectTransformationStream();
                async.waterfall([
                    // Load the object into the process
                    (next) =>
                    {
                        let processedIndex = 0;
                        stream.on('data', (data) =>
                        {
                            stream.pause();
                            processedIndex += 1;
                            const promise = this.modelProcess.loadObject(processedIndex.toString(), data.input, data.output);
                            promise.then(() =>
                            {
                                stream.resume();
                                
                                if (processedIndex === objects.length)
                                {
                                    return next();
                                }
                            }, (err) => next(err));
                        });

                        objects.forEach((object, objectIndex) =>
                        {
                            if (objectIndex < (objects.length - 1))
                            {
                                stream.write(object);
                            }
                            else
                            {
                                stream.end(object);
                            }
                        });
                    },
                    // Process the object
                    (next) =>
                    {
                        // Process the provided object
                        const promise = this.modelProcess.processObjects(objects.map((object, index) => (index + 1).toString()));
                        promise.then((results) =>
                        {
                            return next(null, results);
                        }, (err) => next(err));
                    },
                    // Convert the outputs
                    (results, next) =>
                    {
                        async.mapSeries(results, (result, next) =>
                        {
                            this.model.architecture.convertNetworkOutputObject(result, (err, output) =>
                            {
                                if (err)
                                {
                                    return next(err);
                                }

                                return next(null, output);
                            });
                        }, next);
                    }
                ], (err, outputs) =>
                {
                    if (err)
                    {
                        return next(err);
                    }

                    return next(null, outputs);
                });
            });
        });
    }

    /**
     * This function stops the model process. This can be used for a graceful shutdown.
     *
     * @returns {Promise} A promise that will resolve when the process is killed.
     */
    stopModelProcess()
    {
        return Promise.fromCallback((next) =>
        {
            const promise = this.modelProcess.killProcess();
            promise.then(() =>
            {
                next(null);
            }, (err) => next(err));
        });
    }
}

module.exports = EBBundleScript;
