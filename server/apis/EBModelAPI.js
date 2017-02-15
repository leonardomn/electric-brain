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

const Ajv = require('ajv'),
    async = require('async'),
    EBAPIRoot = require('./EBAPIRoot'),
    EBModelBundler = require('../components/model/EBNodeBundler'),
    EBTorchProcess = require("../components/architecture/EBTorchProcess"),
    fs = require('fs'),
    idUtilities = require("../utilities/id"),
    models = require('../../shared/models/models'),
    mongodb = require('mongodb'),
    tasks = require("../tasks/tasks"),
    path = require('path'),
    schemaUtilities = require("../models/schema_utilities"),
    underscore = require('underscore');

/**
 * This handles API routes related to model objects
 */
class EBModelAPI extends EBAPIRoot
{
    /**
     * Creates a new EBModelAPI
     *
     * @param {object} application The top level EBApplication object
     */
    constructor(application)
    {
        super(application);
        this.application = application;
        this.models = application.db.collection("EBModel");
        this.bundler = new EBModelBundler(application);
    }

    /**
     * Registers all of the endpoints with the express application
     *
     * @param {object} expressApplication This is an express application object.
     */
    setupEndpoints(expressApplication)
    {
        this.modelOutputSchema = schemaUtilities.getReducedSchema("ModelOutput", models.EBModel.schema(), {
            "_id": true,
            "name": true,
            "dataSource": true,
            "inputSchema": true,
            "outputSchema": true
        });


        this.registerEndpoint(expressApplication, {
            "name": "CreateModel",
            "uri": "/models",
            "method": "POST",
            "inputSchema": models.EBModel.schema(),
            "outputSchema": {
                "id": "/CreateModelOutput",
                "type": "object",
                "properties": { }
            },
            "handler": this.createModel.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "ListModels",
            "uri": "/models",
            "method": "GET",
            "inputSchema": {
                "id": "/ListModelsInput",
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "number",
                        "default": 100
                    },
                    "select": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "filter": {
                        "type": "object",
                        "properties": {
                            "running": {"type": "boolean"}
                        }
                    }
                }
            },
            "outputSchema": {
                "id": "/ListModelsOutput",
                "type": "object",
                "properties": {
                    "models": {
                        "type": "array",
                        "items": this.modelOutputSchema
                    }
                }
            },
            "handler": this.getModels.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "GetModel",
            "uri": "/models/:id",
            "method": "GET",
            "inputSchema": {},
            "outputSchema": this.modelOutputSchema,
            "handler": this.getModel.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "EditModel",
            "uri": "/models/:id",
            "method": "PUT",
            "inputSchema": schemaUtilities.getReducedSchema("EditModelInput", models.EBModel.schema(), {
                "inputSchema": true,
                "outputSchema": true
            }),
            "outputSchema": {
                "id": "/EditModelOutput",
                "type": "object",
                "properties": {}
            },
            "handler": this.editModel.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "DeleteModel",
            "uri": "/models/:id",
            "method": "DELETE",
            "inputSchema": {
                "id": "/DeleteModelInput",
                "type": "object",
                "properties": { }
            },
            "outputSchema": {
                "id": "/DeleteModelOutput",
                "type": "object",
                "properties": { }
            },
            "handler": this.deleteModel.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "TrainModel",
            "uri": "/models/:id/train",
            "method": "POST",
            "inputSchema": {
                "id": "/TrainModelInput",
                "type": "object",
                "properties": { }
            },
            "outputSchema": {
                "id": "/TrainModelOutput",
                "type": "object",
                "properties": { }
            },
            "handler": this.trainModel.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "TransformData",
            "uri": "/models/:id/transform",
            "method": "POST",
            "inputSchema": {
                "id": "/TransformInput",
                "type": "object",
                "properties": { }
            },
            "outputSchema": {
                "id": "/TransformOutput",
                "type": "object",
                "properties": { }
            },
            "handler": this.transformObject.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "DownloadBundle",
            "uri": "/models/:id/bundle/:language",
            "method": "GET",
            "inputSchema": {},
            "outputSchema": {},
            "handler": this.downloadModelBundle.bind(this)
        });


        this.registerEndpoint(expressApplication, {
            "name": "ProcessDataWithModel",
            "uri": "/models/:id/process",
            "method": "GET",
            "inputSchema": {
                data: {
                    "type": "object",
                    "additionalProperties": true
                }
            },
            "outputSchema": {},
            "handler": this.processDataWithModel.bind(this)
        });
    }

    /**
     * This endpoint is used to create a new model object in the system
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    createModel(req, res, next)
    {
        const self = this;
        idUtilities.getUniqueID(self.application, 'model', function(err, id)
        {
            if (err)
            {
                return next(err);
            }

            const newModel = req.body;
            newModel._id = id;
            self.models.insert(newModel, function(err, info)
            {
                if (err)
                {
                    return next(err);
                }
                else
                {
                    return next(null, {_id: id});
                }
            });
        });
    }

    /**
     * This endpoint is used to trigger the model to train
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    trainModel(req, res, next)
    {
        this.models.find({_id: Number(req.params.id)}).toArray(function(err, modelObjects)
        {
            if (err)
            {
                return next(err);
            }
            else if (modelObjects.length === 0)
            {
                return next(new Error("EBModel not found!"));
            }
            else
            {
                tasks.queue.queueTask("train_model", {_id: Number(req.params.id)}, function(err, task)
                {
                    if (err)
                    {
                        return next(err);
                    }
                    // const jobId = task.metadata.jobId;
                    // return res.send(200, {id: jobId});
                    return next(null, {});
                });
            }
        });
    }


    /**
     * This endpoint is used to list the existing models
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    getModels(req, res, next)
    {
        let limit = 100;
        if (req.query.limit)
        {
            limit = req.query.limit;
        }

        const options = {
            sort: {
                lastViewedAt: -1,
                _id: -1
            },
            limit: limit
        };

        if (req.query.select)
        {
            options.fields = underscore.object(req.query.select, new Array(req.query.select.length).fill(1));
        }

        let query = {};
        if (req.query.filter)
        {
            query = req.query.filter;
        }

        const queryObject = this.models.find(query, options);
        queryObject.toArray(function(err, modelObjects)
        {
            if (err)
            {
                return next(err);
            }

            return next(null, {"models": modelObjects});
        });
    }


    /**
     * This endpoint is used to fetch a single model object
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    getModel(req, res, next)
    {
        this.models.findOneAndUpdate({_id: Number(req.params.id)}, {$set: {lastViewedAt: new Date()}}, function(err, result)
        {
            if (err)
            {
                return next(err);
            }
            else if (!result)
            {
                return next(new Error("EBModel not found!"));
            }
            else
            {
                return next(null, result.value);
            }
        });
    }


    /**
     * This endpoint is used for editing existing resources
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    editModel(req, res, next)
    {
        delete req.body._id;
        this.models.findAndModify({_id: Number(req.params.id)}, {_id: 1}, req.body, function(err, info)
        {
            if (err)
            {
                return next(err);
            }
            else
            {
                return next(null, {});
            }
        });
    }


    /**
     * This endpoint is used for deleting model objects
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    deleteModel(req, res, next)
    {
        this.models.remove({_id: Number(req.params.id)}, function(err, info)
        {
            if (err)
            {
                return next(err);
            }
            else if (info.result.n !== 0)
            {
                return next(new Error(`EBModel not found with id ${Number(req.params.id)}!`));
            }
            else
            {
                return next(null, {});
            }
        });
    }


    /**
     * Transform the model
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    transformObject(req, res, next)
    {
        this.models.find({_id: Number(req.params.id)}).toArray((err, objects) =>
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
                // console.log("starting", objects);
                const model = new models.EBModel(objects[0]);
                const object = req.body.object;
                const stream = model.architecture.getObjectTransformationStream(this.application.interpretationRegistry);
                stream.on('data', function(data)
                {
                    return next(null, data);
                });
                stream.end(object);
            }
        });
    }


    /**
     * This endpoint is used to download a model bundle
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    downloadModelBundle(req, res, next)
    {
        const self = this;
        self.models.findOne({_id: Number(req.params.id)}, function(err, model)
        {
            if (err)
            {
                return next(err);
            }
            else if (!model)
            {
                return next(new Error("EBModel not found!"));
            }
            else
            {
                const promise = self.bundler.createBundle(model);
                promise.then((buffer) =>
                {
                    res.type('application/zip');
                    res.set('Content-Disposition', 'inline; filename="bundle.zip"');
                    res.end(buffer);
                }, (err) => next(err));
            }
        });
    }


    /**
     * This endpoint is used to process some data using a model.
     *
     * @param {object} req express request object
     * @param {object} res express response object
     * @param {function} next express callback
     */
    processDataWithModel(req, res, next)
    {
        const self = this;
        const gridFS = new mongodb.GridFSBucket(self.application.db, {
            chunkSizeBytes: 1024,
            bucketName: 'EBModel.torch'
        });

        let resultObject = null;
        
        self.models.findOne({_id: Number(req.params.id)}, function(err, modelObject)
        {
            if (err)
            {
                return next(err);
            }
            else if (!modelObject)
            {
                return next(new Error("EBModel not found!"));
            }
            else
            {
                const model = new models.EBModel(modelObject);
                const modelProcess = new EBTorchProcess(new models.EBArchitecture(model.architecture));
                async.series([
                    // Generate the code
                    function generateCode(next)
                    {
                        const promise = modelProcess.generateCode(self.application.interpretationRegistry, self.application.neuralNetworkComponentDispatch);
                        promise.then(() =>
                        {
                            next(null);
                        }, (err) => next(err));
                    },
                    // Download the torch model file
                    function(next)
                    {
                        gridFS.openDownloadStreamByName(`model-${model._id}.t7`).
                            pipe(fs.createWriteStream(path.join(modelProcess.scriptFolder, 'model.t7'))).
                            on('error', function(error)
                            {
                                return next(error);
                            }).
                            on('finish', function()
                            {
                                return next();
                            });
                    },
                    // Start up the process
                    function(next)
                    {
                        const promise = modelProcess.startProcess();
                        promise.then(() =>
                        {
                            next(null);
                        }, (err) => next(err));
                    },
                    // Load the model file from the disk
                    function(next)
                    {
                        const promise = modelProcess.loadModelFile();
                        promise.then(() =>
                        {
                            return next();
                        }, (err) =>
                        {
                            return next(err);
                        });
                    },
                    // Load the object into the process
                    function(next)
                    {
                        const object = req.query.data;
                        const stream = model.architecture.getObjectTransformationStream(self.application.interpretationRegistry);
                        stream.on('data', function(data)
                        {
                            const promise = modelProcess.loadObject("1", data.input, data.output );
                            promise.then(() =>
                            {
                                next(null);
                            }, (err) => next(err));
                        });
                        stream.end(object);
                    },
                    // Process the object
                    function(next)
                    {
                        // Process the provided object
                        const promise = modelProcess.processObjects(["1"]);
                        promise.then((results) =>
                        {
                            const result = results[0];
                            model.architecture.convertNetworkOutputObject(self.application.interpretationRegistry, result, function(err, output)
                            {
                                if (err)
                                {
                                    return next(err);
                                }
                                resultObject = output;
                                return next();
                            });
                        }, (err) => next(err));
                    },
                    // Kill the process we started
                    function(next)
                    {
                        const promise = modelProcess.killProcess();
                        promise.then(() =>
                        {
                            next(null);
                        }, (err) => next(err));
                    }
                ], function(err)
                {
                    if (err)
                    {
                        return next(err);
                    }

                    return next(null, resultObject);
                });
            }
        });
    }
}


module.exports = EBModelAPI;

