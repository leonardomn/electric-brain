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
    convertDataInTemplate = require("../../build/torch/convert_data_in"),
    convertDataOutTemplate = require("../../build/torch/convert_data_out"),
    criterionTemplate = require("../../build/torch/criterion"),
    deepcopy = require('deepcopy'),
    EBCustomTransformation = require("../components/architecture/EBCustomTransformation"),
    EBDataSource = require('./EBDataSource'),
    EBSchema = require('./EBSchema'),
    EBTorchNeuralNetwork = require("./EBTorchNeuralNetwork"),
    EBTorchTransformer = require("../components/architecture/EBTorchTransformer"),
    prepareBatchTemplate = require("../../build/torch/prepare_batch"),
    unwindBatchOutputTemplate = require("../../build/torch/unwind_batch_output"),
    stream = require('stream'),
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

        self[_inputTorchTransformer] = new EBTorchTransformer();
        self[_outputTorchTransformer] = new EBTorchTransformer();
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
     * @returns {Stream} A standard NodeJS transformation stream that you can write() to, read()
     *                   from, and pipe() wherever you want
     */
    getObjectTransformationStream()
    {
        const self = this;

        // First, reduce the inputSchema to only variables that have been marked as included.
        self[_inputTorchTransformer].updateInputSchema(self.inputSchema.filterIncluded());
        self[_outputTorchTransformer].updateInputSchema(self.outputSchema.filterIncluded());

        const inputSchema = self[_inputTorchTransformer].outputSchema;
        const outputSchema = self[_outputTorchTransformer].outputSchema;

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

                // Next, apply transformations
                self[_inputTorchTransformer].transform(inputObject, function(err, transformedInputObject)
                {
                    if (err)
                    {
                        return next(err);
                    }

                    // Next, apply transformations
                    self[_outputTorchTransformer].transform(outputObject, function(err, transformedOutputObject)
                    {
                        if (err)
                        {
                            return next(err);
                        }

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
                    });
                });
            }
        });
    }

    /**
     * This method returns a NodeJS stream that can be used to transform outputs from the network
     * back into their original output objects
     *
     * @returns {Stream} A standard NodeJS transformation stream that you can write() to, read()
     *                   from, and pipe() wherever you want
     */
    getNetworkOutputTransformationStream()
    {
        const self = this;

        // First, reduce the inputSchema to only variables that have been marked as included.
        self[_outputTorchTransformer].updateInputSchema(self.outputSchema.filterIncluded());

        const outputSchema = self[_outputTorchTransformer].outputSchema;

        return new stream.Transform({
            highWaterMark: 1,
            readableObjectMode: true,
            writableObjectMode: true,
            transform(object, encoding, next)
            {
                const transform = this;

                const outputObject = deepcopy(object);
                
                // Next, apply transformations
                self[_outputTorchTransformer].transformBack(outputObject, function(err, transformedOutputObject)
                {
                    if (err)
                    {
                        return next(err);
                    }

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
                });
            }
        });
    }

    /**
     * This method converts a single network output back to its original
     *
     * @param {object} networkOutput The output from the network
     * @param {function(err, transformed)} callback Which will receive the transformed object
     */
    convertNetworkOutputObject(networkOutput, next)
    {
        const self = this;
        const stream = self.getNetworkOutputTransformationStream();
        stream.on("data", function(output)
        {
            return next(null, output);
        });
        stream.on("error", function(error)
        {
            return next(error);
        });
        stream.end(networkOutput);
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
        self.inputSchema.walk(function(schema)
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
        self.outputSchema.walk(function(schema)
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
        self.outputSchema.walk(function(schema)
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
        self.outputSchema.walk(function(field)
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
     * @returns {EBSchema} The schema object for the inputs to the neural network.
     */
    get neuralNetworkInputSchema()
    {
        this[_inputTorchTransformer].updateInputSchema(this.inputSchema.filterIncluded());
        return this[_inputTorchTransformer].outputSchema;
    }


    /**
     * Returns the output for the input of the neural network
     *
     * @returns {EBSchema} The schema object for the outputs to the neural network
     */
    get neuralNetworkOutputSchema()
    {
        this[_outputTorchTransformer].updateInputSchema(this.outputSchema.filterIncluded());
        return this[_outputTorchTransformer].outputSchema;
    }

    /**
     * This method generates all the files for this neural network architecture
     *
     * @returns {[object]} The an array of objects describing the generated files.
     *                     Each object has two properties, 'path' for the files
     *                     path and filename, and 'data' for the contents of the
     *                     file
     */
    generateFiles()
    {
        const self = this;
        
        const inputSchema = self.neuralNetworkInputSchema;
        const outputSchema = self.neuralNetworkOutputSchema;

        const rootModuleName = `${self.machineName}Module`;
        const rootCriterionName = `${self.machineName}Criterion`;

        // Create a list of files that need to be written
        const files = [];
        const network = EBTorchNeuralNetwork.generateNeuralNetwork(rootModuleName, inputSchema, outputSchema);

        // Create a file for each module
        network.modules.forEach(function(module)
        {
            files.push({
                path: module.filename,
                data: module.generateLuaCode()
            });
        });

        // Create a file for the criterion
        files.push({
            path: `${rootCriterionName}.lua`,
            // Create the criterion template for the output schema
            data: criterionTemplate({
                criterionTemplate: criterionTemplate,
                criterionName: rootCriterionName,
                outputSchema
            })
        });

        files.push({
            path: "TrainingScript.lua",
            data: trainingScriptTemplate({
                convertDataIn: convertDataInTemplate,
                convertDataOut: convertDataOutTemplate,
                prepareBatch: prepareBatchTemplate,
                unwindBatchOutput: unwindBatchOutputTemplate,
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
