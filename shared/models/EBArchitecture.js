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
    criterionTemplate = require("../../build/torch/criterion"),
    deepcopy = require('deepcopy'),
    EBCustomTransformation = require("../components/architecture/EBCustomTransformation"),
    EBDataSource = require('./EBDataSource'),
    EBSchema = require('./EBSchema'),
    EBTorchModule = require("./EBTorchModule"),
    EBTorchNode = require("./EBTorchNode"),
    EBTorchCustomModule = require("./EBTorchCustomModule"),
    Promise = require ('bluebird'),
    stream = require('stream'),
    Promise = require('bluebird'),
    trainingScriptTemplate = require("../../build/torch/training_script"),
    underscore = require('underscore');

const _inputTorchTransformer = Symbol('_inputTorchTransformer');
const _outputTorchTransformer = Symbol('_outputTorchTransformer');

/**
 * This class represents a neural network architectures. It specifies where the data comes from and how
 * it gets transformed for the neural network. It then specifies the design of that neural network.
 */
class EBArchitecture
{
    /**
     * This constructs a full architecture object from the given raw JSON data.
     *
     * @param {object} rawArchitecture The raw JSON data describing a architecture
     */
    constructor(rawArchitecture)
    {
        const self = this;
        Object.keys(rawArchitecture).forEach(function(key)
        {
            if (key === 'inputSchema' || key === 'outputSchema')
            {
                if (rawArchitecture[key])
                {
                    self[key] = new EBSchema(rawArchitecture[key]);
                }
                else
                {
                    self[key] = null;
                }
            }
            else if (key === 'dataSource')
            {
                if (rawArchitecture[key])
                {
                    self[key] = new EBDataSource(rawArchitecture[key]);
                }
                else
                {
                    self[key] = null;
                }
            }
            else
            {
                self[key] = rawArchitecture[key];
            }
        });
    }

    /**
     * Returns a machine name for this architecture
     */
    get machineName()
    {
        const self = this;

        // strip out symbols into spaces
        const stripped = self.name.replace(/[^\w\s]/g, " ").replace(/_/g, " ");

        // title case the rest
        const titleCased = stripped.replace(/\w\S*/g, function(txt)
        {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }).replace(/\s+/g, "");

        return titleCased;
    }

    /**
     * This method returns a NodeJS stream that can be used to transform objects into the inputs
     * and outputs for the neural network
     *
     * @param {EBInterpretationRegistry} registry The registry for the transformation stream
     * @returns {Stream} A standard NodeJS transformation stream that you can write() to, read()
     *                   from, and pipe() wherever you want
     */
    getObjectTransformationStream(registry)
    {
        const self = this;

        const inputSchema = self.neuralNetworkInputSchema(registry);
        const outputSchema = self.neuralNetworkOutputSchema(registry);

        // Set a default value of 0 for everything
        inputSchema.walk(function(schema)
        {
            if (schema.isField)
            {
                schema.default = 0;
            }
        });
        outputSchema.walk(function(schema)
        {
            if (schema.isField)
            {
                schema.default = 0;
            }
        });

        const filterInputFunction = inputSchema.filterFunction();
        const filterOutputFunction = outputSchema.filterFunction();

        return new stream.Transform({
            highWaterMark: 1,
            readableObjectMode: true,
            writableObjectMode: true,
            transform(object, encoding, next)
            {
                const transform = this;

                const inputObject = deepcopy(object);
                const outputObject = deepcopy(object);

                try
                {
                    const inputPromise = registry.getInterpretation('object').transformValueForNeuralNetwork(inputObject, self.inputSchema.filterIncluded());
                    const outputPromise = registry.getInterpretation('object').transformValueForNeuralNetwork(outputObject, self.outputSchema.filterIncluded());
                    Promise.join(inputPromise, outputPromise).then((transformed) =>
                    {
                        const transformedInputObject = transformed[0];
                        const transformedOutputObject = transformed[1];

                        try
                        {
                            transform.push({
                                input: filterInputFunction(transformedInputObject),
                                output: filterOutputFunction(transformedOutputObject),
                                original: object
                            });

                            return next();
                        }
                        catch (err)
                        {
                            console.error(`Object in our database is not valid according to our data schema: ${err.toString()}`);
                            console.error(err.stack);

                            return next();
                        }
                    }, (err) => next(err))
                }
                catch(err)
                {
                    console.log(err);
                }
            }
        });
    }

    /**
     * This method returns a NodeJS stream that can be used to transform outputs from the network
     * back into their original output objects
     *
     * @param {EBInterpretationRegistry} registry The registry for the transformation stream
     * @returns {Stream} A standard NodeJS transformation stream that you can write() to, read()
     *                   from, and pipe() wherever you want
     */
    getNetworkOutputTransformationStream(registry)
    {
        const self = this;

        // First, reduce the inputSchema to only variables that have been marked as included.
        const outputSchema = self.neuralNetworkOutputSchema(registry);

        return new stream.Transform({
            highWaterMark: 1,
            readableObjectMode: true,
            writableObjectMode: true,
            transform(object, encoding, next)
            {
                const transform = this;

                const outputObject = deepcopy(object);
                
                // Next, apply transformations
                const outputPromise = registry.getInterpretation('object').transformValueBackFromNeuralNetwork(outputObject, self.outputSchema.filterIncluded());
                outputPromise.then((transformedOutputObject) =>
                {
                    try
                    {
                        transform.push(transformedOutputObject);
                        return next();
                    }
                    catch (err)
                    {
                        console.error(`Object in our database is not valid according to our data schema: ${err.toString()}`);
                        console.error(err.stack);
                        return next();
                    }
                }, (err) => next(err));
            }
        });
    }

    /**
     * This method converts a single network output back to its original
     *
     * @param {EBInterpretationRegistry} registry The interpretation registry
     * @param {object} networkOutput The output from the network
     * @return {Promise} Resolves a promise Which will receive the transformed object
     */
    convertNetworkOutputObject(registry, networkOutput)
    {
        const self = this;
        return Promise.fromCallback((callback) =>
        {
            const stream = self.getNetworkOutputTransformationStream(registry);
            stream.on("data", (output) =>
            {
                return callback(null, output);
            });
            stream.on("error", (error) =>
            {
                return callback(error);
            });
            stream.end(networkOutput);
        });
    }


    /**
     * This method returns whether or not the chosen fields for the input and output schema
     * are valid.
     *
     * @returns {boolean} True if the chosen input/output fields are valid. Otherwise false.
     */
    validInputOutputSchemas()
    {
        const self = this;

        // First, make sure we even have an input and output schema
        if (!self.inputSchema || !self.outputSchema)
        {
            return false;
        }

        // Next, create a map of all the fields in the schemas that are set as included
        const includedInputSchemas = [];
        const includedInputFields = [];
        const includedOutputSchemas = [];
        const includedOutputFields = [];
        self.inputSchema.walk((schema) =>
        {
            if (schema.configuration.included)
            {
                includedInputSchemas.push(schema.variablePath);
                if (schema.isField)
                {
                    includedInputFields.push(schema.variablePath);
                }
            }
        });
        self.outputSchema.walk((schema) =>
        {
            if (schema.configuration.included)
            {
                includedOutputSchemas.push(schema.variablePath);
                if (schema.isField)
                {
                    includedOutputFields.push(schema.variablePath);
                }
            }
        });

        // There must be at least one field for both the input and output
        if (includedInputFields.length === 0 || includedOutputFields.length === 0)
        {
            return false;
        }

        // There must not be any fields in common between the input and output
        if (underscore.intersection(includedInputFields, includedOutputFields).length > 0)
        {
            return false;
        }

        // None of the output fields can be a binary, since this would involve generating
        // data (currently not supported)
        let outputBinaryFound = false;
        self.outputSchema.walk((schema) =>
        {
            if (schema.configuration.included && schema.isBinary)
            {
                outputBinaryFound = true;
            }
        });
        if (outputBinaryFound)
        {
            return false;
        }

        // Any arrays on the output must also exist on the input. The system
        // Isn't going to generate arrays for you (yet!)
        let foundOutputOnlyArray = false;
        self.outputSchema.walk((field) =>
        {
            if (field.isArray && field.configuration.included)
            {
                // Check to see that this array also exists on the input
                if (includedInputSchemas.indexOf(field.variablePath) === -1)
                {
                    foundOutputOnlyArray = true;
                }
            }
        });
        if (foundOutputOnlyArray)
        {
            return false;
        }

        // None of our failing conditions have been hit, then this architectures schemas are indeed valid!
        // Yay!
        return true;
    }
    


    /**
     * Returns the schema for the input of the neural network
     *
     * @param {EBInterpretationRegistry} registry The registry for the interpretations
     * @returns {EBSchema} The schema object for the inputs to the neural network.
     */
    neuralNetworkInputSchema(registry)
    {
        return registry.getInterpretation('object').transformSchemaForNeuralNetwork(this.inputSchema.filterIncluded());
    }


    /**
     * Returns the output for the input of the neural network
     *
     * @param {EBInterpretationRegistry} registry The registry for interpretations
     * @returns {EBSchema} The schema object for the outputs to the neural network
     */
    neuralNetworkOutputSchema(registry)
    {
        return registry.getInterpretation('object').transformSchemaForNeuralNetwork(this.outputSchema.filterIncluded());
    }

    /**
     * This method generates all the files for this neural network architecture
     *
     * @param {EBInterpretationRegistry} registry The registry for the transformation stream
     * @param {EBNeuralNetworkComponentDispatch} neuralNetworkComponentDispatch A reference the the globally initialized componentDispatch method
     * @returns {[object]} The an array of objects describing the generated files.
     *                     Each object has two properties, 'path' for the files
     *                     path and filename, and 'data' for the contents of the
     *                     file
     */
    generateFiles(registry, neuralNetworkComponentDispatch)
    {
        const self = this;
        
        const inputSchema = this.neuralNetworkInputSchema(registry);
        const outputSchema = this.neuralNetworkOutputSchema(registry);

        const rootModuleName = `${self.machineName}Module`;
        const rootCriterionName = `${self.machineName}Criterion`;

        // Create a list of files that need to be written
        const files = [];

        const inputNode = new EBTorchNode(new EBTorchModule("nn.Identity", []), null, `${rootModuleName}_input`);
        const inputStack = neuralNetworkComponentDispatch.generateInputStack(inputSchema, inputNode);
        const outputStack = neuralNetworkComponentDispatch.generateOutputStack(outputSchema, inputStack.outputNode, inputStack.outputTensorSchema);
        const mainModule = new EBTorchCustomModule(rootModuleName, inputNode, outputStack.outputNode, (inputStack.additionalModules.concat(outputStack.additionalModules).map((module) => module.name)));

        const allModules = [mainModule].concat(inputStack.additionalModules).concat(outputStack.additionalModules);

        // Create a file for each module
        allModules.forEach((module) =>
        {
            const file = {
                path: module.filename,
                data: module.generateLuaCode()
            };

            files.push(file);
        });


        // Create a file for the criterion
        files.push({
            path: `${rootCriterionName}.lua`,
            // Create the criterion template for the output schema
            data: criterionTemplate({
                criterionName: rootCriterionName,
                mainCriterion: neuralNetworkComponentDispatch.generateCriterion(outputSchema)
            })
        });

        files.push({
            path: "TrainingScript.lua",
            data: trainingScriptTemplate({
                convertDataIn: neuralNetworkComponentDispatch.generateTensorInputCode.bind(neuralNetworkComponentDispatch),
                convertDataOut: neuralNetworkComponentDispatch.generateTensorOutputCode.bind(neuralNetworkComponentDispatch),
                prepareBatch: neuralNetworkComponentDispatch.generatePrepareBatchCode.bind(neuralNetworkComponentDispatch),
                unwindBatchOutput: neuralNetworkComponentDispatch.generateUnwindBatchCode.bind(neuralNetworkComponentDispatch),
                rootModuleName: rootModuleName,
                rootCriterionName: rootCriterionName,
                optimizationAlgorithm: "adamax",
                inputSchema,
                outputSchema
            })
        });
        
        return files;
    }


    /**
     * Returns a JSON-Schema schema for this architectures
     *
     * @returns {object} The JSON-Schema that can be used for validating this architectures in its raw form
     */
    static schema()
    {
        return {
            "id": "EBArchitecture",
            "type": "object",
            "properties": {
                "_id": {},
                "name": {"type": "string"},
                "dataSource": EBDataSource.schema(),
                "inputTransformations": {
                    "type": "array",
                    "items": EBCustomTransformation.schema()
                },
                "inputSchema": EBSchema.schema(),
                "outputSchema": EBSchema.schema(),
                "options": {
                    "sequenceProcessorInternalSize": {"type": "number"},
                    "summaryVectorSize": {"type": "number"}
                }
            }
        };
    }
}

module.exports = EBArchitecture;
