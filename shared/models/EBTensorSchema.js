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

const assert = require('assert'),
    validatorUtilities = require("../utilities/validator");

/**
 *  This class represents a tensor schema. Its like a schema, but specifically designed to map
 *  the tensors that flow within the neural network.
 */
class EBTensorSchema
{
    /**
     * This creates a new tensor schema object from the raw tensor schema data
     *
     * @param {rawTensorSchema} rawTensorSchema A raw tensor schema object
     */
    constructor(rawTensorSchema)
    {
        validatorUtilities.getJSONValidator(EBTensorSchema.schema()).then((validationFunction) =>
        {
            const result = validationFunction(rawTensorSchema);
            if (!result)
            {
                console.log(validationFunction.errors);
            }
            assert(!result);
        });

        assert(rawTensorSchema.type);
        assert(rawTensorSchema.variableName);

        this.type = rawTensorSchema.type;
        this.variableName = rawTensorSchema.variableName;
        this.tensorDimensions = rawTensorSchema.tensorDimensions;
        this.tensorMap = rawTensorSchema.tensorMap;

        if (rawTensorSchema.items)
        {
            this.items = new EBTensorSchema(rawTensorSchema.items);
        }

        if (rawTensorSchema.properties)
        {
            this.properties = rawTensorSchema.properties.map((property) => new EBTensorSchema(property));
        }
    }

    /**
     * If this schema is a tensor-schema, then this will return the total size of the tensor.
     *
     * It will otherwise return 0.
     *
     * @return {number} The size of this tensor
     */
    get tensorSize()
    {
        if (this.type === 'tensor')
        {
            let size = 1;
            this.tensorDimensions.forEach((dimension) =>
            {
                size *= dimension.size;
            });
            return size;
        }
        else
        {
            return 0;
        }
    }

    /**
     * Assuming this is an object schema, this will return the index of the property with
     * the given name within this tensor schema.
     *
     * Returns null of the property is not found.
     *
     * If this EBTensorSchema is an array or tensor schema, then this will always return null.
     *
     * @param {string} name The name of the property to search
     * @return {number} The index of this property
     */
    getPropertyIndex(name)
    {
        let index = null;
        if (this.type === 'object')
        {
            this.properties.forEach((property, propertyIndex) =>
            {
                if (property.variableName === name)
                {
                    index = propertyIndex;
                }
            });
        }

        return index;
    }

    /**
     * Returns true if this schema is representing a tensor
     *
     * @return {boolean} True/false if this schema represents a tensor
     */
    get isTensor()
    {
        return this.type === 'tensor';
    }

    /**
     * Returns true if this schema represents an object, which in Lua is represented by a table
     *
     * @return {boolean} True/false if this schema represents an object
     */
    get isObject()
    {
        return this.type === 'object';
    }

    /**
     * Returns true if this schema represents an array, which in Lua is represented by a table
     *
     * @return {boolean} True/false if this schema represents an array
     */
    get isArray()
    {
        return this.type === 'array';
    }

    /**
     * A quick convenience for generating a tensor-schema containing a data tensor of the given size.
     *
     * @param {number} size The size of the data for the output of the tensor schema
     * @param {string} name The name of the variable for this tensor schema
     *
     * @return {EBTensorSchema} A new tensor schema object
     */
    static generateDataTensorSchema(size, name)
    {
        return new EBTensorSchema({
            "type": "tensor",
            "variableName": name,
            "tensorDimensions": [
                {
                    "size": 1,
                    "label": "batch"
                },
                {
                    "size": size,
                    "label": "data"
                }
            ],
            "tensorMap": {
                [name]: {
                    "start": 1,
                    "size": size
                }
            }
        });
    }


    /**
     * Returns a JSON-Schema schema for EBTensorSchema
     *
     * This schema is technically recursive.
     *
     * @returns {object} The JSON-Schema that can be used for validating this architecture in its raw form
     */
    static schema()
    {
        return {
            "id": "EBTensorSchema",
            "$schema": "EBTensorSchema",
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["tensor", "array", "object"]
                },
                "variableName": {"type": "string"},
                "tensorDimensions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "size": {"type": "number"},
                            "label": {"type": "string"}
                        }
                    }
                },
                "tensorMap": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "number"},
                            "size": {"type": "number"}
                        }
                    }
                },
                "items": {"$ref": "#"},
                "properties": {
                    "type": "array",
                    "items": {"$ref": "#"}
                }
            }
        };
    }
}

module.exports = EBTensorSchema;
