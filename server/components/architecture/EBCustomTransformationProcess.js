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
    fs = require('fs'),
    EBStdioJSONStreamProcess = require("../EBStdioJSONStreamProcess"),
    temp = require('temp'),
    path = require('path'),
    stream = require('stream'),
    underscore = require('underscore');

/**
 * This class is used to start up, manage and communicate with a sub-process for doing
 * custom data transformations.
 */
class EBCustomTransformationProcess
{
    /**
     * Creates the process object for the given EBCustomTransformation. The process
     * won't be started until you call startProcess.
     *
     * @param {EBCustomTransformation} transformation The transformation for which a process should
     *                                                be started.
     */
    constructor(transformation)
    {
        const self = this;
        self.transformation = transformation;
        self.scriptFolder = null;
        self.scriptFile = null;
        self.process = null;
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
            function writeTransformationFile(next)
            {
                // First, create a temporary folder to put the code into
                temp.mkdir('electric-brain-custom-transformation', (err, temporaryFolder) =>
                {
                    if (err)
                    {
                        return next(err);
                    }

                    self.scriptFolder = temporaryFolder;
                    self.scriptFile = path.join(self.scriptFolder, 'transformation');

                    fs.writeFile(self.scriptFile, self.transformation.code, next);
                });
            },
            function changeFileStatus(next)
            {
                // Set the executable flag on the file
                fs.chmod(self.scriptFile, "1755", next);
            },
            function startProcess(next)
            {
                // Start up the process
                const promise = EBStdioJSONStreamProcess.spawn(self.scriptFile, [], {
                    cwd: self.scriptFolder,
                    env: underscore.extend({TERM: "xterm"}, process.env)
                });
                promise.then((process) =>
                {
                    self.process = process;
                    return next();
                }, (err) => next(err));
            },
            function handshake(next)
            {
                // Now we handshake with the process and get version / name information
                self.process.writeAndWaitForMatchingOutput({type: "handshake"}, {"type": "handshake"}, next);
            }
        ], callback);
    }

    /**
     * Transforms the given object.
     *
     * @param {object} object The object to be transformed.
     * @param {function(err)} callback Callback to be called after the sub-process is started
     */
    transform(object, callback)
    {
        const self = this;
        self.process.writeAndWaitForMatchingOutput({type: "transform", object: object}, {type: "result"}, function(err, result)
        {
            if (err)
            {
                return callback(err);
            }
            else
            {
                return callback(null, result.value);
            }
        });
    }

    /**
     * This creates a standard NodeJS stream that will boot up an EBCustomTransformationProcess, and allow you
     * to stream objects to it and have them automatically transformed by the process.
     *
     * @param {EBCustomTransformation} The transformation you want the process started for.
     * @returns {Stream} A standard NodeJS transformation stream that you can write() to, read()
     *                   from, and pipe() wherever you want
     */
    static createCustomTransformationStream(architecture)
    {
        let transformationProcesses = [];
        let initialized = false;
        function setup(next)
        {
            initialized = true;

            // Create transformation processes for each transformation
            async.mapSeries(architecture.inputTransformations, function(transformation, next)
            {
                // Start up a process
                const process = new EBCustomTransformationProcess(transformation);
                process.startProcess(function(err)
                {
                    if (err)
                    {
                        return next(err);
                    }
                    else
                    {
                        return next(null, process);
                    }
                });
            }, function(err, results)
            {
                if (err)
                {
                    return next(err);
                }

                transformationProcesses = results;
                return next();
            });
        }

        return new stream.Transform({
            highWaterMark: 1,
            readableObjectMode: true,
            writableObjectMode: true,
            transform(object, encoding, next)
            {
                const transform = this;
                async.waterfall([
                    function(next)
                    {
                        if (!initialized)
                        {
                            return setup(next);
                        }
                        else
                        {
                            return next();
                        }
                    },
                    function convert(next)
                    {
                        // Apply the input transformations, in series
                        async.waterfall([
                            function(next)
                            {
                                // Inject the object
                                return next(null, object);
                            }
                        ].concat(transformationProcesses.map(function(transformationProcess)
                        {
                            return function(currentObject, next)
                            {
                                transformationProcess.transform(currentObject, function(err, transformed)
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }

                                    return next(null, transformed);
                                });
                            };
                        })), next);
                    }
                ], function(err, resultObject)
                {
                    if (err)
                    {
                        return next(err);
                    }
                    else
                    {
                        // Preserve the object _id on the output
                        if (object._id)
                        {
                            resultObject._id = object._id.toString();
                        }
                        transform.push(resultObject);
                        return next();
                    }
                });
            }
        });
    }
}

module.exports = EBCustomTransformationProcess;
