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
    assert = require('assert'),
    EBApplication = require("../../server/EBApplication"),
    EBTrainModelTask = require("../../server/tasks/EBTrainModelTask"),
    idUtilities = require("../../server/utilities/id"),
    models = require("../../shared/models/models"),
    Promise = require("bluebird");

// Give each test 5 minutes. This is because core machine learning tests can take a while.
const testTimeout = 5 * 60 * 1000;

describe.only("End to end tests", function()
{
    this.timeout(testTimeout)
    const application = new EBApplication();
    before(function(done)
    {
        application.initializeDatabase(function(err)
        {
            if (err)
            {
                return done(err);
            }

            application.initializeBackgroundTask(function(err)
            {
                if (err)
                {
                    return done(err);
                }

                application.initializeSocketIO(null, function(err)
                {
                    if (err)
                    {
                        return done(err);
                    }

                    require('../../server/tasks/task_registry').initializeRealtimeTaskObservation(application, function(err)
                    {
                        if (err)
                        {
                            return done(err);
                        }

                        return done();
                    });
                });
            });
        });
    });
    
    
    it("Should be able to train a model using the copy-value data-set.", function()
    {
        // First step is to sample the data and prepare an EBDataSource object
        function createDataSource()
        {
            const dataSource = new models.EBDataSource({
                name: "copy_value",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "copy_value"
                }
            });

            return application.dataSourcePluginDispatch.detectSchema(dataSource).then(function(resultSchema)
            {
                dataSource.dataSchema = resultSchema;
                dataSource.dataSchema.find('.inputLetter').setIncluded(true);
                dataSource.dataSchema.find('.outputLetter').setIncluded(true);
                return dataSource;
            });
        }

        // The next step is to take that data source and create an EBArchitecture object
        function createArchitecture(dataSource)
        {
            const architecture = new models.EBArchitecture({
                name: "copy_value",
                dataSource: dataSource,
                inputTransformations: []
            });

            architecture.inputSchema = new models.EBSchema(dataSource.dataSchema);
            architecture.inputSchema.find('.inputLetter').setIncluded(true);
            architecture.inputSchema.find('.outputLetter').setIncluded(false);
            architecture.outputSchema = new models.EBSchema(dataSource.dataSchema);
            architecture.outputSchema.find('.inputLetter').setIncluded(false);
            architecture.outputSchema.find('.outputLetter').setIncluded(true);

            architecture.inputSchema.walk((field) =>
            {
                field.configuration.interpretation = application.interpretationRegistry.getInterpretation(field.metadata.mainInterpretation).generateDefaultConfiguration(field);
            });
            architecture.outputSchema.walk((field) =>
            {
                field.configuration.interpretation = application.interpretationRegistry.getInterpretation(field.metadata.mainInterpretation).generateDefaultConfiguration(field);
            });

            return Promise.resolve(architecture);
        }

        // Next create an EBModel object
        function createModel(architecture)
        {
            const model = new models.EBModel({
                name: "copy_value",
                running: false,
                architecture: architecture,
                parameters: {
                    batchSize: 16,
                    testingBatchSize: 4,
                    iterations: 100
                }
            });

            return Promise.fromCallback((next) =>
            {
                idUtilities.getUniqueID(application, 'model', next);
            }).then((id) =>
            {
                model._id = id;
                return application.db.collection('EBModel').insert(model).then((result) =>
                {
                    return model;
                });
            });
        }

        // Then we attempt to train that model
        function trainModel(model)
        {
            const task = new EBTrainModelTask(application);

            // Create a fake Beaver task object
            const fakeBeaverTask = {
                log: (task, msg, callback) => {
                    console.log(msg);
                    return callback();
                }
            };
            
            return task.run(fakeBeaverTask, {_id: model._id});
        }

        // Finally, we check the final model
        function checkResults(model)
        {
            // Make sure the result came back as a model object
            // and that it has all the steps marked as complete
            assert(model instanceof models.EBModel);
            assert.equal(model.codeGeneration.status, 'complete');
            assert.equal(model.dataScanning.status, 'complete');
            assert.equal(model.training.status, 'complete');
            assert.equal(model.testing.status, 'complete');

            assert.equal(model.testing.accuracy, 1.0);

            return Promise.resolve();
        }

        // String everything together
        return createDataSource().then(createArchitecture).then(createModel).then(trainModel).then(checkResults);
    });
});
