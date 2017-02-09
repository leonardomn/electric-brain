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

/**
 * This is a base class for 
 */
class EBNeuralNetworkObjectComponent extends EBNeuralNetworkComponentBase
{
    /**
     * Constructor
     */
    constructor()
    {
        this.variableName = 'a';
        this.machineVariableName ='b';
    }


    /**
     * Method generates Lua code to create a tensor from the JSON of this variable
     *
     * @param {EBSchema} schema The schema to generate this conversion code for
     */
    generateTensorInputCode(schema, depth)
    {
        // First, ensure that the schema we are dealing with is an object
        assert(schema.isObject);

        let code = '';
        let topLevelFields = schema.topLevelFields;
        let hasFixedTensor = schema.tensorSize > 0 ? 1 : 0;

        code += `local transformed{{=it.depth}} = {}`;

        if (hasFixedTensor)
        {
            code += `transformed${depth}[1] = torch.zeros(1, 1, ${schema.tensorSize})`;
        }

        Object.keys(schema.properties).forEach((subSchema) =>
        {
            if (subSchema.tensorSize)
            {

            }
        });




    }



    /**
     * Method generates Lua code to turn this variable back into a tensor
     */
    generateTensorOutputCode()
    {
        throw new Error("Unimplemented");
    }


    /**
     * Method generates Lua code that can prepare a combined batch tensor from
     * multiple samples.
     */
    generatePrepareBatchCode()
    {
        throw new Error("Unimplemented");
    }


    /**
     * This method should generate the EBTorchNode graph for this neural network
     */
    generateNeuralNetwork(inputNode, outputNode)
    {
        throw new Error("Unimplemented");
    }

    /**
     * Returns a JSON-Schema schema for this architectures
     *
     * @returns {object} The JSON-Schema that can be used for validating this architectures in its raw form
     */
    static schema()
    {
        throw new Error('Unimplemented');
    }
}

module.exports = EBNeuralNetworkObjectComponent;
