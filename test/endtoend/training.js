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
    EBModelTest = require("../utilities/EBModelTest");

// Give each test 5 minutes. This is because core machine learning tests can take a while.
const testTimeout = 5 * 60 * 1000;

describe("End to end tests", function()
{
    this.timeout(testTimeout);
    const application = new EBApplication();
    before((done) =>
    {
        application.initializeDatabase((err) =>
        {
            if (err)
            {
                return done(err);
            }

            application.initializeBackgroundTask((err) =>
            {
                if (err)
                {
                    return done(err);
                }

                application.initializeSocketIO(null, (err) =>
                {
                    if (err)
                    {
                        return done(err);
                    }

                    require('../../server/tasks/task_registry').initializeRealtimeTaskObservation(application, (err) =>
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


    it("Should be able to train a model using the copy-value data-set.", () =>
    {
        const test = new EBModelTest({
            dataSource: {
                name: "copy_value",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "copy_value"
                }
            },
            inputFields: ['.inputLetter'],
            outputFields: ['.outputLetter'],
            modelParameters: {
                batchSize: 16,
                testingBatchSize: 4,
                iterations: 100
            },
            results: {minimumAccuracy: 1.0}
        });

        return test.run(application);
    });


    it("Should be able to train a model using the dual-copy-value data-set.", () =>
    {
        const test = new EBModelTest({
            dataSource: {
                name: "dual_copy_value",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "dual_copy_value"
                }
            },
            inputFields: ['.inputLetter', '.inputStatus'],
            outputFields: ['.outputLetter', '.outputStatus'],
            modelParameters: {
                batchSize: 16,
                testingBatchSize: 4,
                iterations: 100
            },
            results: {minimumAccuracy: 1.0}
        });

        return test.run(application);
    });


    it("Should be able to train a model using the sequence-copy data set", () =>
    {
        const test = new EBModelTest({
            dataSource: {
                name: "sequence_copy",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "sequence_copy"
                }
            },
            inputFields: ['.letters.[].inputLetter'],
            outputFields: ['.letters.[].outputLetter'],
            modelParameters: {
                batchSize: 16,
                testingBatchSize: 4,
                iterations: 400
            },
            results: {minimumAccuracy: 1.0}
        });

        return test.run(application);
    });


    it("Should be able to train a model using the sequence dual copy data set", () =>
    {
        const test = new EBModelTest({
            dataSource: {
                name: "sequence_dual_copy",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "sequence_dual_copy"
                }
            },
            inputFields: ['.letters.[].inputLetter', '.letters.[].inputStatus'],
            outputFields: ['.letters.[].outputLetter', '.letters.[].outputStatus'],
            modelParameters: {
                batchSize: 16,
                testingBatchSize: 4,
                iterations: 400
            },
            results: {minimumAccuracy: 1.0}
        });

        return test.run(application);
    });


    it("Should be able to train a model using the sequence identification data set", () =>
    {
        const test = new EBModelTest({
            dataSource: {
                name: "sequence_identification",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "sequence_identification"
                }
            },
            inputFields: ['.inputLetters.[].letter'],
            outputFields: ['.outputIdentity'],
            modelParameters: {
                batchSize: 16,
                testingBatchSize: 4,
                iterations: 350
            },
            results: {minimumAccuracy: 1.0}
        });

        return test.run(application);
    });


    it("Should be able to train a model using the sequence classification data set", () =>
    {
        const test = new EBModelTest({
            dataSource: {
                name: "sequence_classification",
                type: "mongo",
                database: {
                    uri: "mongodb://localhost:27017/electric_brain_testing",
                    collection: "sequence_classification"
                }
            },
            inputFields: ['.inputLetters.[].letter'],
            outputFields: ['.outputFirstClassification', '.outputSecondClassification'],
            modelParameters: {
                batchSize: 16,
                testingBatchSize: 4,
                iterations: 400
            },
            results: {minimumAccuracy: 1.0}
        });

        return test.run(application);
    });
});
