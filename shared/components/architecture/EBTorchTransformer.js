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

const EBArchitectureElement = require('./EBArchitectureElement'),
    EBSchema = require("../../models/EBSchema"),
    underscore = require('underscore');

const enumCardinalityCutoff = 0.05;

/**
 * This class is used to transform the data into a format that the torch modules will accept.
 *
 * It also validates that its inputs are acceptable
 */
class EBTorchTransformer extends EBArchitectureElement
{
    /**
     * This constructs the EBTorchTransformer object from raw JSON data.
     *
     * The raw JSON data is the data we send verbatim over http endpoints and store in the database.
     *
        Object.keys(rawDataTransformation).forEach(function(key)
        {
            self[key] = rawDataTransformation[key];
        });

        self[_inputSchema] = inputSchema;
     * @param {object} rawTorchTransformer The raw JSON data describing the torch transformation object
     */
    constructor(rawTorchTransformer)
    {
        super();
        const self = this;
        if (!rawTorchTransformer)
        {
            rawTorchTransformer = {};
        }
        
        if (rawTorchTransformer._inputSchema)
        {
            self.updateInputSchema(new EBSchema(rawTorchTransformer._inputSchema));
        }
        else
        {
            self._inputSchema = null;
            self._outputSchema = null;
        }
    }


    /**
     *  This method is used for updating the input schema for this element.
     *
     *  It should update its output schema accordingly, if needed.
     *
     *  @param {EBSchema} newInputSchema The new input schema to this architecture element.
     */
    updateInputSchema(newInputSchema)
    {
        const self = this;
        self._inputSchema = newInputSchema.clone();
        self._outputSchema = newInputSchema.transform(function(schema)
        {
            if (schema.isString && !schema.enum)
            {
                // Decide whether to represent this string as an enum or a sequence
                const representAsEnum = schema.configuration.neuralNetwork.string.mode === 'classification';
                if (representAsEnum)
                {
                    schema.type = ['number'];
                    schema.enum = [null];
                    schema.metadata.valueHistogram.values.forEach(function(number, index)
                    {
                        schema.enum.push(index);
                    });
                    return schema;
                }
                else
                {
                    // Vanilla ascii sequence representation
                    const asciiLength = 128;
                    return new EBSchema({
                        title: schema.title,
                        type: "array",
                        items: {
                            title: `${schema.title}.[]`,
                            type: "object",
                            properties: {
                                character: {
                                    title: `${schema.title}.[].character`,
                                    type: "number",
                                    enum: underscore.range(0, asciiLength),
                                    configuration: {included: true}
                                }
                            },
                            configuration: {included: true}
                        },
                        configuration: {included: true}
                    });
                }
            }
            else
            {
                return true;
            }
        });
    }


    /**
     * Returns the input schema for this torch transformation
     */
    get inputSchema()
    {
        return this._inputSchema;
    }

    /**
     * Return the output schema from this torch transformation.
     *
     * The output schema should be ready for use to generate a torch neural network graph
     */
    get outputSchema()
    {
        return this._outputSchema;
    }


    /**
     * This function takes the given object matching the inputSchema, and turns it into a
     * transformed version matching the output schema.
     *
     * @param {object} object The object to be transformed
     * @param {function(err, transformObject)} callback A callback that will receive the resulting object
     *
     * @returns {object} The transformed object. Should fit the expected output schema.
     */
    transform(object, callback)
    {
        callback(null, this._inputSchema.transformObject(object, function(key, value, schema, parent, parentSchema)
        {
            // First, if the input is a string and we are representing it as an enum,
            // set the enum property
            if (schema.isString)
            {
                // Decide whether to represent this string as an enum or a sequence
                const representAsEnum = schema.configuration.neuralNetwork.string.mode === 'classification';
                if (representAsEnum)
                {
                    schema.enum = underscore.map(schema.metadata.valueHistogram.values, (value) => value.value);
                }
            }

            if (schema.enum)
            {
                console.log(schema.enum);
                const index = schema.enum.indexOf(value);
                if (index === -1)
                {
                    console.log('enum value not found: ', value);
                    // console.log(self.values);
                    return 0;
                }
                else
                {
                    return index + 1;
                }
            }
            else if (schema.isString)
            {
                const output = [];
                const asciiLength = 128;
                for (let characterIndex = 0; characterIndex < value.toString().length; characterIndex += 1)
                {
                    let charCode = value.toString().charCodeAt(characterIndex);
                    if (charCode >= asciiLength)
                    {
                        charCode = 0;
                    }

                    output.push({character: charCode});
                }
                return output;
            }
            else if (schema.isNumber)
            {
                if (value === null)
                {
                    return 0;
                }
                
                return value;
            }
            else if (schema.isBoolean)
            {
                return value ? 1 : 0;
            }
            else if (schema.isBinary)
            {
                return value.toString('base64');
            }
            else
            {
                return value;
            }
        }));
    }

    /**
     * This function takes an object matching the output schema and transforms
     * it back to an object matching the input schema.
     *
     * @param {object} object The object to be transformed
     * @param {function(err, transformObject)} callback A callback that will receive the resulting object
     *
     * @returns {object} The transformed object. Should fit the input schema.
     */
    transformBack(object, callback)
    {
        callback(null, this._inputSchema.transformObject(object, function(key, value, schema, parent, parentSchema)
        {
            // First, if the input is a string and we are representing it as an enum,
            // set the enum property
            if (schema.isString)
            {
                // Decide whether to represent this string as an enum or a sequence
                const representAsEnum = schema.configuration.neuralNetwork.string.mode === 'classification';
                if (representAsEnum)
                {
                    schema.enum = underscore.map(schema.metadata.valueHistogram.values, (value) => value.value);
                }
            }

            if (schema.enum)
            {
                if (value === 0)
                {
                    return null;
                }
                else
                {
                    return schema.enum[value - 1];
                }
            }
            else if (schema.isString)
            {
                let output = "";
                value.forEach(function(character)
                {
                    output += String.fromCharCode(character.character);
                });
                return output;
            }
            else if (schema.isNumber)
            {
                return value;
            }
            else if (schema.isBoolean)
            {
                return value;
            }
            else if (schema.isBinary)
            {
                return Buffer.from(value, 'base64');
            }
            else
            {
                return value;
            }
        }));
    }



    
    /**
     * Returns a JSON-Schema schema for this architectures
     *
     * @returns {object} The JSON-Schema that can be used for validating this architectures in its raw form
     */
    static schema()
    {
        return {
            "id": "EBDataTransformation",
            "type": "object",
            "properties": {
                "type": {
                    "type": "string",
                    "enum": ["none", "code", "string", "number", "enum", "boolean"]
                }
            },
            "anyOf": [
                {
                    "id": "#/CodeTransformation",
                    "properties": {
                        "language": {
                            "type": "string",
                            "enum": ["javascript", "lua"]
                        },
                        "code": {"type": "string"}
                    }
                },
                {
                    "id": "#/NumberTransformation",
                    "properties": {
                        "minimum": {"type": "number"},
                        "maximum": {"type": "number"}
                    }
                },
                {
                    "id": "#/StringTransformation",
                    "properties": {}
                },
                {
                    "id": "#/EnumTransformation",
                    "properties": {
                        "method": {"enum": ["one_hot", "fixed_value"]},
                        "values": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "value": {"type": "string"},
                                    "embedding": {"type": "number"}
                                }
                            }
                        }
                    }
                },
                {
                    "id": "#/BooleanTransformation",
                    "properties": {
                        "trueValue": {"type": "number"},
                        "falseValue": {"type": "number"}
                    }
                }
            ]
        };
    }
}

module.exports = EBTorchTransformer;
