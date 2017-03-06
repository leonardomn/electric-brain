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
    EBNumberHistogram = require('../../../shared/models/EBNumberHistogram'),
    EBSchema = require('../../../shared/models/EBSchema'),
    EBValueHistogram = require("../../../shared/models/EBValueHistogram"),
    moment = require('moment'),
    underscore = require('underscore');

/**
 * The date interpretation is used for all strings that look like dates
 */
class EBDateInterpretation extends EBInterpretationBase
{
    /**
     * Constructor. Requires the interpretation registry in order to recurse properly
     *
     * @param {EBInterpretationRegistry} interpretationRegistry The registry
     */
    constructor(interpretationRegistry)
    {
        super('date');
        this.interpretationRegistry = interpretationRegistry;

        // This is the list of date formats that we the system will accept
        this.validDateFormats = [
            'YYYY-MM-DDTHH:mm:ss',
            'YYYY-MM-DDTHH:mm:ss.SSSZ',
            "MM-DD-YYYY",
            "YYYY-MM-DD",
            "YYYY-DD-MM",
            "DD-MM-YYYY",
            "MM/DD/YYYY",
            "YYYY/MM/DD",
            "YYYY/DD/MM",
            "DD/MM/YYYY",
            "MM DD YYYY",
            "YYYY MM DD",
            "YYYY DD MM",
            "DD MM YYYY"
        ];
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
        if (value instanceof Date)
        {
            return Promise.resolve(true);
        }
        else if (underscore.isString(value))
        {
            const date = moment(value, this.validDateFormats, true);
            if (date.isValid())
            {
                return Promise.resolve(true);
            }

            return Promise.resolve(false);
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
        return Promise.resolve(value);
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
        return Promise.resolve(value);
    }


    /**
     * This method should transform the given schema for input to the neural network.
     *
     * @param {EBSchema} schema The schema to be transformed
     * @return {Promise} A promise that resolves to a new value.
     */
    transformSchemaForNeuralNetwork(schema)
    {
        // Create an object composed of several properties
        const dateComponentProperties = {};
        if (schema.configuration.interpretation.includeYear)
        {
            dateComponentProperties.year = new EBSchema({
                title: `${schema.title}.year`,
                type: "number",
                configuration: {included: true}
            });
        }
        if (schema.configuration.interpretation.includeDayOfYear)
        {
            dateComponentProperties.dayOfYear = new EBSchema({
                title: `${schema.title}.dayOfYear`,
                type: "number",
                configuration: {included: true}
            });
        }
        if (schema.configuration.interpretation.includeMonth)
        {
            const numberOfMonths = 12;
            dateComponentProperties.month = new EBSchema({
                title: `${schema.title}.month`,
                type: "number",
                enum: underscore.range(0, numberOfMonths),
                configuration: {included: true}
            });
        }
        if (schema.configuration.interpretation.includeDayOfMonth)
        {
            dateComponentProperties.dayOfMonth = new EBSchema({
                title: `${schema.title}.dayOfMonth`,
                type: "number",
                configuration: {included: true}
            });
        }
        if (schema.configuration.interpretation.includeDayOfWeek)
        {
            const numberOfDaysInWeek = 7;
            dateComponentProperties.dayOfWeek = new EBSchema({
                title: `${schema.title}.dayOfWeek`,
                type: "number",
                enum: underscore.range(0, numberOfDaysInWeek),
                configuration: {included: true}
            });
        }
        if (schema.configuration.interpretation.includeTimeOfDay)
        {
            dateComponentProperties.timeOfDay = new EBSchema({
                title: `${schema.title}.timeOfDay`,
                type: "number",
                configuration: {included: true}
            });
        }
        return new EBSchema({
            title: schema.title,
            type: "object",
            properties: dateComponentProperties,
            configuration: {included: true}
        });
    }


    /**
     * This method should prepare a given value for input into the neural network
     *
     * @param {*} value The value to be transformed
     * @param {EBSchema} schema The schema for the value to be transformed
     * @return {Promise} A promise that resolves to a new value.
     */
    transformValueForNeuralNetwork(value, schema)
    {
        const date = moment(value);
        const output = {};
        if (schema.configuration.interpretation.includeYear)
        {
            output.year = date.year();
        }
        if (schema.configuration.interpretation.includeDayOfYear)
        {
            output.dayOfYear = date.dayOfYear() / 366;
        }
        if (schema.configuration.interpretation.includeMonth)
        {
            output.month = date.month();
        }
        if (schema.configuration.interpretation.includeDayOfMonth)
        {
            output.dayOfMonth = date.date() / date.daysInMonth();
        }
        if (schema.configuration.interpretation.includeDayOfWeek)
        {
            output.dayOfWeek = date.day();
        }
        if (schema.configuration.interpretation.includeTimeOfDay)
        {
            const startOfDay = moment(date).startOf('day');
            output.timeOfDay = Math.abs(date.diff(startOfDay)) / 86400000;
        }
        return output;
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
        throw new Error("Unimplemented.");
    }


    /**
     * This method should generate the default configuration for the given schema
     *
     * @param {EBSchema} schema The schema for the value to be transformed
     * @return {object} An object which follows the schema returned from configurationSchema
     */
    generateDefaultConfiguration(schema)
    {
        return {
            includeYear: false,
            includeDayOfYear: true,
            includeMonth: true,
            includeDayOfMonth: false,
            includeDayOfWeek: true,
            includeTimeOfDay: true
        };
    }


    /**
     * This method should compare two values according to the given schema, in order to determine the accuracy
     * of the neural network.
     *
     * @param {*} expected The value the network was expected to produce, e.g. the correct answer
     * @param {*} actual The actual value the network produced.
     * @param {EBSchema} schema The schema for the value to be compared
     * @param {boolean} accumulateStatistics Whether or not statistics on the results should be accumulated into the EBSchema object.
     * @return {number} accuracy The accuracy of the result. should be a number between 0 and 1
     */
    compareNetworkOutputs(expected, actual, schema, accumulateStatistics)
    {
        throw new Error("Unimplemented");
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
        const self = this;
        // Create a subclass and immediately instantiate it.
        return new (class extends EBFieldAnalysisAccumulatorBase
        {
            constructor()
            {
                super();
                this.years = [];
                this.months = [];
                this.daysOfWeek = [];
            }

            accumulateValue(value)
            {
                const date = moment(value, this.validDateFormats, true);
                if (date.isValid())
                {
                    this.years.push(date.format("YYYY"));
                    this.months.push(date.format("MMMM"));
                    this.daysOfWeek.push(date.format("dddd"));
                }
            }

            getFieldStatistics()
            {
                return {
                    yearHistogram: EBValueHistogram.computeHistogram(this.years),
                    monthHistogram: EBValueHistogram.computeHistogram(this.months),
                    dayOfWeekHistogram: EBValueHistogram.computeHistogram(this.daysOfWeek)
                };
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
            "id": "EBDateInterpretation.statisticsSchema",
            "type": "object",
            "properties": {
                yearHistogram: EBValueHistogram.schema(),
                monthHistogram: EBValueHistogram.schema(),
                dayOfWeekHistogram: EBValueHistogram.schema()
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
            "id": "EBDateInterpretation.configurationSchema",
            "type": "object",
            "properties": {
                includeYear: {"type": "boolean"},
                includeDayOfYear: {"type": "boolean"},
                includeMonth: {"type": "boolean"},
                includeDayOfMonth: {"type": "boolean"},
                includeDayOfWeek: {"type": "boolean"},
                includeTimeOfDay: {"type": "boolean"}
            }
        };
    }


    /**
     * This method should return a schema for accumulating accuracy results from values in this interpretation
     *
     * @return {jsonschema} A schema representing whatever is needed to store results
     */
    static resultsSchema()
    {
        return {
            "id": "EBDateInterpretation.resultsSchema",
            "type": "object",
            "properties": {}
        };
    }
}

module.exports = EBDateInterpretation;