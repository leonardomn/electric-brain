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
    EBModelBundler = require('./EBModelBundler'),
    EBTorchProcess = require('../architecture/EBTorchProcess'),
    fs = require('fs'),
    models = require('../../../shared/models/models'),
    mongodb = require('mongodb'),
    path = require('path'),
    temp = require('temp');

/**
 * This class is used for bundling up the model for deployment in NodeJS servers
 */
class EBNodeBundler
{
    /**
     * This creates the bundler object.
     *
     * @param {EBApplication} the global application object
     */
    constructor(application)
    {
        this.application = application;
    }
    
    /**
     * This method is should create a wrapped up bundle object in a single, large Buffer
     *
     * All sub classes should implement this method.
     *
     * @param {EBModel} model The model object to be bundled
     * @param {function(err, buffer)} callback The callback to receive the resulting bundle
     */
    createBundle(model, callback)
    {
        const self = this;

        const gridFS = new mongodb.GridFSBucket(self.application.db, {
            chunkSizeBytes: 1024,
            bucketName: 'EBModel.torch'
        });

        self.trainingProcess = new EBTorchProcess(new models.EBArchitecture(model.architecture));

        const zipFile = temp.path({suffix: '.zip'});

        async.series([
            // Generate the code
            function generateCode(next)
            {
                const promise = self.trainingProcess.generateCode();
                promise.then(() =>
                {
                    next(null);
                }, (err) => next(err));
            },
            // Download the torch model file
            function(next)
            {
                gridFS.openDownloadStreamByName(`model-${model._id}.t7`).
                    pipe(fs.createWriteStream(path.join(self.trainingProcess.scriptFolder, 'model.t7'))).
                    on('error', function(error)
                    {
                        return next(error);
                    }).
                    on('finish', function()
                    {
                        return next();
                    });
            },
            // Write the JSON of the model object
            function writeModelJSON(next)
            {
                const jsonData = JSON.stringify(model, null, 4);
                fs.writeFile(path.join(self.trainingProcess.scriptFolder, 'model.json'), jsonData, next);
            },
            // Write electric brain bundle file
            function writeEBBundle(next)
            {
                fs.readFile(path.join(__dirname, '..', '..', '..', 'build', 'ebbundle.js'), (err, buffer) =>
                {
                    if (err)
                    {
                        return next(err);
                    }

                    fs.writeFile(path.join(self.trainingProcess.scriptFolder, 'ebbundle.js'), buffer, next);
                });
            },
            // Create a zip file with all the files
            function createZipFile(next)
            {
                childProcess.exec(`zip -r ${zipFile} *`, {cwd: self.trainingProcess.scriptFolder}, (err) =>
                {
                    if (err)
                    {
                        return next(err);
                    }

                    return next();
                });
            }
        ], (err, buffer) =>
        {
            if (err)
            {
                return callback(err);
            }

            fs.readFile(zipFile, (err, buffer) =>
            {
                if (err)
                {
                    return callback(err);
                }

                fs.unlink(zipFile, (err) =>
                {
                    if (err)
                    {
                        return callback(err);
                    }

                    return callback(null, buffer);
                });
            });
        });
    }
}

module.exports = EBNodeBundler;
