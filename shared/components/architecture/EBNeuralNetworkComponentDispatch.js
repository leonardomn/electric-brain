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

const Promise = require('bluebird'),
    underscore = require('underscore');

/**
 *  This is registers all of the available EBDataSourcePlugins and will dispatch the methods
 *  to the appropriate plugin depending on the type of data source.
 */
class EBNeuralNetworkComponentDispatch
{
    /**
     * Creates an EBNeuralNetworkComponentDispatch object.
     */
    constructor()
    {
        this.plugins = {};
    }

    /**
     * This method returns a list of all neural network components
     *
     * @return {[EBNeuralNetworkComponentBase]} Returns all of the neural network components
     */
    getSupportedDataSources(type, plugin)
    {
        return underscore.values(this.plugins);
    }

    /**
     * This method registers a plugin with the dispatch.
     *
     * @param {string} type The machine name of the data source type
     * @param {EBDataSourcePlugin} plugin The plugin to be registered.
     */
    registerPlugin(type, plugin)
    {
        this.plugins[type] = plugin;
    }


    /**
     * This method gets the correct neural network plugin for the given EBSchema
     */
    getPluginForSchema(schema)
    {
        if (schema.isObject)
        {
            return this.plugins['object'];
        }
        else if (schema.isArray)
        {
            return this.plugins['sequence'];
        }
        else if (schema.enum)
        {
            return this.plugins['classification'];
        }
        else if (schema.isNumber)
        {
            return this.plugins['number'];
        }
        else if (schema.metadata.mainInterpretation === 'image')
        {
            return this.plugins['image'];
        }
        else if (schema.isString)
        {
            return this.plugins['word'];
        }
        else
        {
            throw new Error(`Unknown plugin for EBSchema: ${schema.toString()}`);
        }
    }


    /**
     * Method returns the tensor schema for input data to the network
     *
     * @param {EBSchema} schema The regular schema from which we will determine the tensor schema
     * @returns {EBTensorSchema} The mapping of tensors.
     */
    getTensorSchema(schema)
    {
        return this.getPluginForSchema(schema).getTensorSchema(schema);
    }


    /**
     * Method returns the size of the fixed input tensor for a given schema
     *
     * @param {EBSchema} schema The schema to get the tensor size of
     * @returns {number} The size of the tensor
     */
    getInputTensorSize(schema)
    {
        return this.getPluginForSchema(schema).getInputTensorSize(schema);
    }


    /**
     * Method returns the size of the table outputs for the given schema
     *
     * @param {EBSchema} schema The schema to get the table size of
     * @returns {number} The size of the table
     */
    getInputTableSize(schema)
    {
        return this.getPluginForSchema(schema).getInputTableSize(schema);
    }


    /**
     * Method generates Lua code to create a tensor from the JSON of this variable
     *
     * @param {EBSchema} schema The schema to generate this conversion code for.
     * @param {string} name The name of the lua function to be generated.
     */
    generateTensorInputCode(schema, name)
    {
        if (!name)
        {
            name = 'generateTensor';
        }
        return this.getPluginForSchema(schema).generateTensorInputCode(schema, name);
    }

    /**
     * Method generates Lua code to turn a tensor back into a JSON
     *
     * @param {EBSchema} schema The schema to generate this conversion code for
     * @param {string} name The name of the Lua function to be generated
     */
    generateTensorOutputCode(schema, name)
    {
        if (!name)
        {
            name = 'generateJSON';
        }
        return this.getPluginForSchema(schema).generateTensorOutputCode(schema, name);
    }

    /**
     * Method generates Lua code that can prepare a combined batch tensor from
     * multiple samples.
     *
     * @param {EBSchema} schema The schema to generate this conversion code for
     * @param {string} name The name of the Lua function to be generated
     */
    generatePrepareBatchCode(schema, name)
    {
        if (!name)
        {
            name = 'prepareBatch';
        }
        return this.getPluginForSchema(schema).generatePrepareBatchCode(schema, name);
    }

    /**
     * Method generates Lua code that can takes a batch and breaks it apart
     * into the individual samples
     *
     * @param {EBSchema} schema The schema to generate this unwinding code for
     * @param {string} name The name of the Lua function to be generated
     */
    generateUnwindBatchCode(schema, name)
    {
        if (!name)
        {
            name = 'unwindBatch';
        }
        return this.getPluginForSchema(schema).generateUnwindBatchCode(schema, name);
    }


    /**
     * This method should generate an input stack for this variable
     *
     * @param {EBSchema} schema The schema to generate this stack for
     * @param {EBTorchNode} inputNode The input node for this variable
     * @returns {object} An object with the following structure:
     *                      {
     *                          "outputNode": EBTorchNode || null,
     *                          "outputTensorSchema": EBTensorSchema || null,
     *                          "additionalModules": [EBCustomModule]
     *                      }
     */
    generateInputStack(schema, inputNode)
    {
        return this.getPluginForSchema(schema).generateInputStack(schema, inputNode);
    }


    /**
     * This method should generate the output stack for this variable
     *
     * @param {EBSchema} outputSchema The schema to generate this output stack for
     * @param {EBTorchNode} inputNode The input node for this stack
     * @param {EBTensorSchema} inputTensorSchema The schema for the intermediary tensors from which we construct this output stack
     * @returns {object} An object with the following structure:
     *                      {
     *                          "outputNode": EBTorchNode || null,
     *                          "outputTensorSchema": EBTensorSchema || null,
     *                          "additionalModules": [EBCustomModule]
     *                      }
     */
    generateOutputStack(outputSchema, inputNode, inputTensorSchema)
    {
        return this.getPluginForSchema(outputSchema).generateOutputStack(outputSchema, inputNode, inputTensorSchema);
    }


    /**
     * This method should generate the criterion for a schema
     *
     * @param {EBSchema} outputSchema The schema to generate the criterion for
     * @returns {object} An object with the following structure:
     *                      {
     *                          "outputCriterion": EBTorchModule || null
     *                      }
     */
    generateCriterion(outputSchema)
    {
        return this.getPluginForSchema(outputSchema).generateCriterion(outputSchema);
    }
}

module.exports = EBNeuralNetworkComponentDispatch;
