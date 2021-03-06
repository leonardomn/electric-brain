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
    EBStdioJSONStreamProcess = require("../../../server/components/EBStdioJSONStreamProcess"),
    EBModelProcessBase = require("../../../server/components/architecture/EBModelProcessBase"),
    fs = require('fs'),
    math = require("mathjs"),
    path = require('path'),
    Promise = require('bluebird'),
    temp = require('temp'),
    underscore = require('underscore');

/**
 * This class is used to manage the tensorflow sub-process for a given architecture
 */
class EBTransformProcess extends EBModelProcessBase
{
    /**
     * Creates the process object for the given EBTransformArchitecture object.
     *
     * @param {EBTransformArchitecture} architecture The transform architecture object that we are creating the tensorflow process for.
     * @param {EBArchitecturePluginBase} architecturePlugin The plugin for the architecture object
     * @param {string} [scriptFolder] Optional directory where the script files should be written
     */
    constructor(architecture, architecturePlugin, scriptFolder)
    {
        super(architecture, architecturePlugin, scriptFolder, "transform_model_script.py");
        const self = this;
        self.architecture = architecture;
        self.architecturePlugin = architecturePlugin;
        
        self.processes = [];
        self.allLoadedEntries = [];
        self.testingSet = {};
        self.numProcesses = 1;
    }

    /**
     * This method initializes the TensorFlow process.
     *
     * @param {EBInterpretationRegistry} registry The registry for interpretations, used during initialization
     * @returns {Promise} A promise that will resolve when the model has been initialized
     */
    initialize(registry)
    {
        const inputSchema = registry.getInterpretation('object').transformSchemaForNeuralNetwork(this.architecture.inputSchema.filterIncluded());
        const outputSchema = registry.getInterpretation('object').transformSchemaForNeuralNetwork(this.architecture.outputSchema.filterIncluded());

        return Promise.each(this.processes, (process) =>
        {
            // Now we handshake with the process and get version / name information
            return process.writeAndWaitForMatchingOutput({
                type: "initialize",
                inputSchema: inputSchema,
                outputSchema: outputSchema
            }, {"type": "initialized"});
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
    loadObject(id, input, output)
    {
        const self = this;
        const message = {
            type: "store",
            id: id,
            input: input,
            output: output
        };
        const writeAndWaitPromise = Promise.each(self.processes,(process) =>
        {
            return process.writeAndWaitForMatchingOutput(message, {type: "stored"});
        });
        writeAndWaitPromise.then(() =>
        {
            self.allLoadedEntries.push(id);
        });
        return writeAndWaitPromise;
    }


    /**
     * This method runs a set of objects through the network and returns their processed versions
     *
     * @param {objects} objects The objects that need to be processed
     * @param {function(err, accuracy, output)} callback The callback function which will receive the accuracy of the test, along with the output object
     */
    processObjects(objects)
    {
        const message = {
            type: "evaluate",
            samples: objects,
            ids: objects.map((object, index) => (index + 1).toString())
        };

        return this.processes[0].writeAndWaitForMatchingOutput(message, {type: "evaluationCompleted"});
    }


    /**
     * This method runs a prepared batch through the network
     *
     * @param {string} inputBatchFilename The filename of the batch
     * @param {function(err, accuracy, output)} callback The callback function which will receive the accuracy of the test, along with the output object
     */
    processBatch(inputBatchFilename)
    {
        // Choose a bunch of random samples from the set that we have
        const message = {
            type: "evaluateBatch",
            batchFilename: inputBatchFilename
        };

        // TODO: Make this work with multiple sub-processes!
        return this.processes[0].writeAndWaitForMatchingOutput(message, {type: "evaluationCompleted"}).then((result) =>
        {
            return result.objects;
        });
    }


    /**
     * This method will execute a single training iteration with the given batch.
     *
     * @param {[string]} inputBatchFilename The filename that contains this input batch
     * @param {[string]} outputBatchFilename The filename that contains this output batch
     * @param {Promise} A Promise that will resolve when batch is complete
     */
    executeTrainingIteration(inputBatchFilename, outputBatchFilename)
    {
        // Choose a bunch of random samples from the set that we have
        const message = {
            type: "iteration",
            inputBatchFilename: inputBatchFilename,
            outputBatchFilename: outputBatchFilename
        };

        // TODO: Make this work with multiple sub-processes!
        return this.processes[0].writeAndWaitForMatchingOutput(message, {type: "iterationCompleted"});
    }


    /**
     * This method tells the process to create an input-batch file
     *
     * @param {string} ids This the ids for each of the objects being saved
     * @param {objects} objects This contains of objects that are being saved
     * @param {string} fileName The filename to write the result too
     *
     * @return {Promise} A promise that will resolve when the batch has been saved
     */
    prepareInputBatch(ids, objects, fileName)
    {
        const self = this;

        const message = {type: "prepareInputBatch", ids: ids, samples: objects, fileName: fileName};
        return self.processes[0].writeAndWaitForMatchingOutput(message, {type: "batchInputPrepared", fileName: fileName});
    }


    /**
     * This method tells the process to create a batch and save it to a file
     *
     * @param {string} ids This the ids for each of the objects being saved
     * @param {objects} objects This contains of objects that are being saved
     * @param {string} fileName The filename to write the result too
     *
     * @return {Promise} A promise that will resolve when the batch has been saved
     */
    prepareOutputBatch(ids, objects, fileName)
    {
        const self = this;
        const message = {type: "prepareOutputBatch", ids: ids, samples: objects, fileName: fileName};
        return self.processes[0].writeAndWaitForMatchingOutput(message, {type: "batchOutputPrepared", fileName: fileName});
    }
}

module.exports = EBTransformProcess;
