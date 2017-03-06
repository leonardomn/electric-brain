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
    EBStdioScript = require("../../server/components/EBStdioScript"),
    EBTorchProcess = require('../components/architecture/EBTorchProcess'),
    models = require("../../shared/models/models"),
    Promise = require('bluebird');

class EBTrainModelWorker extends EBStdioScript
{
    constructor(application)
    {
        super();
        this.application = application;
        this.socketio = application.socketio;
        this.models = application.db.collection("EBModel");


    }

    /**
     * Process a single message from the parent class.
     *
     * @param {object} message The message received from the surrounding manager process
     * @returns {Promise} A promise that should resolve to the response
     */
    processMessage(message)
    {
        if (message.type === 'initialize')
        {
            // Retrieve the model object frm the initialization
            return this.models.find({_id: message.id}).toArray().then((objects) =>
            {
                if (objects.length === 0)
                {
                    return Promise.rejected(new Error("EBModel not found!"));
                }
                else
                {
                    this.model = new models.EBModel(objects[0]);
                    this.trainingProcess = new EBTorchProcess(this.model.architecture);
                    this.trainingProcess.generateCode(this.application.interpretationRegistry, this.application.neuralNetworkComponentDispatch).then(() =>
                    {
                        return this.trainingProcess.startProcess();
                    });
                }
            }).then(() =>
            {
                return {"type": "initialized"};
            });
        }
        else if (message.type === 'prepareBatch')
        {
            // All the ids that need to be fetched
            return Promise.map(message.ids, (id) => this.fetchObject(id)).then((objects) =>
            {
                return Promise.each(objects, (object) =>
                {
                    console.error(JSON.stringify(object, null, 4));
                    return this.trainingProcess.loadObject(object.original.id, object.input, object.output);
                }).then(() =>
                {
                    return this.trainingProcess.prepareBatch(message.ids, message.fileName);
                }).then(() =>
                {
                    return Promise.each(objects, (object) =>
                    {
                        return this.trainingProcess.removeObject(object.original.id);
                    });
                }).then(() =>
                {
                    return {
                        "type": "batchPrepared",
                        "batchNumber": message.batchNumber,
                        "objects": objects
                    };
                });
            });
        }
        else
        {
            return Promise.reject(new Error(`Unknown message type ${message.type}.`));
        }
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





};


module.exports = EBTrainModelWorker;