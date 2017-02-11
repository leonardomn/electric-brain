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
    EBFieldAnalysisAccumulatorBase = require('./../../../server/components/datasource/EBFieldAnalysisAccumulatorBase'),
    EBFieldMetadata = require('../../../shared/models/EBFieldMetadata'),
    EBInterpretationBase = require('./../../../server/components/datasource/EBInterpretationBase'),
    EBSchema = require("../../../shared/models/EBSchema"),
    EBValueHistogram = require('../../../shared/models/EBValueHistogram'),
    Promise = require('bluebird'),
    underscore = require('underscore');

/**
 * The hex interpretation will work on any strings that contain
 * only hexidecimal characters. It will be converted into binary
 * data.
 */
class EBHexInterpretation extends EBInterpretationBase 
{
    /**
     * Constructor. Requires the interpretation registry in order to recurse properly
     *
     * @param {EBInterpretationRegistry} interpretationRegistry The registry
     */
    constructor(interpretationRegistry)
    {
        super('hex');
        this.interpretationRegistry = interpretationRegistry;

        this.mapping = {
            "0": 0,
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5,
            "6": 6,
            "7": 7,
            "8": 8,
            "9": 9,
            "a": 10,
            "b": 11,
            "c": 12,
            "d": 13,
            "e": 14,
            "f": 15
        };

        this.inverseMapping = underscore.invert(this.mapping);
    }


    /**
     * This method should return the list of interpretations that this interpretation is dependent
     * on. This interpretation won't be checked unless the dependent interpretation is the next
     * one up in the chain.
     *
     * If the list of dependencies is empty, then this interpretation is assumed to be able to
     * operate directly on raw-values from JSON.
     *
     * @return [String] An array of strings with the type-names for each of the higher interpretations
     */
    getUpstreamInterpretations()
    {
        return ['string'];
    }




    /**
     * This method returns the raw javascript type of value that this interpretation applies to.
     *
     * @return {string} Can be one of: 'object', 'array', 'number', 'string', 'boolean', 'binary'
     */
    getJavascriptType()
    {
        return 'string';
    }



    /**
     * This method should look at the given value and decide whether it can be handled by this
     * interpretation.
     *
     * @param {*} value Can be practically anything.
     * @return {Promise} A promise that resolves to either true or false on whether that value
     *                   can be handled by that interpretation.
     */
    checkValue(value)
    {
        if (underscore.isString(value) && /^(?:[abcdef0123456789]{2})+$/i.test(value))
        {
            return Promise.resolve(true);
        }
        else
        {
            return Promise.resolve(false);
        }
    }



    /**
     * This method should transform a given schema for a value following this interpretation.
     * It should return a new schema for the interpreted version.
     *
     * @param {EBSchema} schema The schema for a field that wants to be interpreted by this interpretation.
     * @return {Promise} A promise that resolves to a new EBSchema object.
     */
    transformSchema(schema)
    {
        return Promise.resolve(schema);
    }




    /**
     * This method should transform a given value, assuming its following this interpretation.
     *
     * @param {*} value The value to be transformed
     * @return {Promise} A promise that resolves to a new value.
     */
    transformValue(value)
    {
        return Promise.resolve(new Buffer(`0x${value}`, 'hex'));
    }




    /**
     * This method should transform an example into a value that is small enough to be
     * stored with the schema and shown on the frontend. Information can be destroyed
     * in this transformation in order to allow the data to be stored easily.
     *
     * @param {*} value The value to be transformed
     * @return {Promise} A promise that resolves to a new object that is similar to the old one to a human, but with size truncated for easy storage.
     */
    transformExample(value)
    {
        if (value.length > 50)
        {
            return Promise.resolve(value.substr(0, 50).toString('hex') + "...");
        }
        else
        {
            return Promise.resolve(value.toString('hex'));
        }
    }


    /**
     * This method should transform the given schema for input to the neural network.
     *
     * @param {EBSchema} schema The schema to be transformed
     * @return {Promise} A promise that resolves to a new value.
     */
    transformSchemaForNeuralNetwork(schema)
    {
        // Straight up hexadecimal representation
        return new EBSchema({
            title: schema.title,
            type: "array",
            items: {
                title: `${schema.title}.[]`,
                type: "object",
                properties: {
                    hex: {
                        title: `${schema.title}.[].hex`,
                        type: "number",
                        enum: underscore.range(0, 16),
                        configuration: {included: true}
                    }
                },
                configuration: {included: true}
            },
            configuration: {included: true}
        });
    }


    /**
     * This method should prepare a given value for input into the neural network
     *
     * @param {EBSchema} value The value to be transformed
     * @return {Promise} A promise that resolves to a new value.
     */
    transformValueForNeuralNetwork(value)
    {
        const hexValues = [];
        for (let n = 0; n < value.length; n += 1)
        {
            if (this.mapping[value[n].toLowerCase()])
            {
                hexValues.push({hex: value[n].toLowerCase()});
            }
            else
            {
                throw new Error(`Unknown hexadecimal character: ${value[n]}`);
            }
        }
        return hexValues;
    }


    /**
     * This method should take output from the neural network and transform it back
     *
     * @param {*} value The value to be transformed
     * @param {EBSchema} schema The schema for the value to be transformed
     * @return {Promise} A promise that resolves to a new value
     */
    transformValueBackFromNeuralNetwork(value, schema)
    {
        // TODO: Special hack here.
        if (underscore.isString(value))
        {
            return value;
        }

        let output = "";
        value.forEach((value) =>
        {
            output += this.inverseMapping[value.hex];
        });
        return output;
    }


    /**
     * This method should generate the default configuration for the given schema
     *
     * @param {EBSchema} schema The schema for the value to be transformed
     * @return {object} An object which follows the schema returned from configurationSchema
     */
    generateDefaultConfiguration(schema)
    {
        return {};
    }


    /**
     * This method should create a new field accumulator, a subclass of EBFieldAnalysisAccumulatorBase.
     *
     * This accumulator can be used to analyze a bunch of values through the lens of this interpretation,
     * and calculate statistics that the user may use to analyze the situation.
     *
     * @return {EBFieldAnalysisAccumulatorBase} An instantiation of a field accumulator.
     */
    createFieldAccumulator()
    {
        // This needs to be moved to a configuration file of some sort
        const maxHexLengthForHistogram = 250;

        // Create a subclass and immediately instantiate it.
        return new (class extends EBFieldAnalysisAccumulatorBase
        {
            constructor()
            {
                super();
                this.values = [];
            }

            accumulateValue(value)
            {
                // Only add it if its short
                if (value.length < maxHexLengthForHistogram)
                {
                    this.values.push(value);
                }
            }
            
            getFieldStatistics()
            {
                return {valueHistogram: EBValueHistogram.computeHistogram(this.values)};
            }
        })();
    }


    /**
     * This method should return a schema for the metadata associated with this interpretation
     *
     * @return {jsonschema} A schema representing the metadata for this interpretation
     */
    static statisticsSchema()
    {
        return {
            "id": "EBHexInterpretation.statisticsSchema",
            "type": "object",
            "properties": {
                valueHistogram: EBValueHistogram.schema()
            }
        };
    }


    /**
     * This method should return a schema for the configuration for this interpretation
     *
     * @return {jsonschema} A schema representing the configuration for this interpretation
     */
    static configurationSchema()
    {
        return {
            "id": "EBHexInterpretation.configurationSchema",
            "type": "object",
            "properties": {
            }
        };
    }
}

module.exports = EBHexInterpretation;