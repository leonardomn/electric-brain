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
 * The all important interpretation class. This class serves as the foundation for transforming
 * input data into more enhanced formats, and ultimately for input to the neural network.
 */
class EBInterpretationBase
{
    /**
     * Base constructor.
     * 
     * @param {string} name The machine name of the interpretation.
     */
    constructor(name)
    {
        this.name = name;
    }


    /**
     * This method should return the list of interpretations that this interpretation can
     * transform from.
     *
     * @return [String] An array of strings with the type-names for each of the higher interpretations
     */
    getUpstreamInterpretations()
    {
        throw new Error("Unimplemented");
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
        return Promise.rejected(new Error("Unimplemented"));
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
        return Promise.rejected(new Error("Unimplemented"));
    }




    /**
     * This method should transform a given value, assuming its following this interpretation.
     *
     * @param {*} value The value to be transformed
     * @return {Promise} A promise that resolves to a new value.
     */
    transformValue(value)
    {
        return Promise.rejected(new Error("Unimplemented"));
    }




    /**
     * This method should return information about fields that need to be graphed on
     * the frontend for this interpretation.
     *
     * @param {*} value The value to be transformed
     * @return {Promise} A promise that resolves to an array of statistics
     */
    listStatistics(value)
    {
        return Promise.rejected(new Error("Unimplemented"));
    }




    /**
     * This method should transform an example into a value that is small enough to be
     * stored with the schema and shown on the frontend.
     *
     * @param {*} value The value to be transformed
     * @return {Promise} A promise that resolves to a transformed example object
     */
    transformExample(value)
    {
        return Promise.rejected(new Error("Unimplemented"));
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
        throw new Error("Unimplemented");
    }
    

    /**
     * This method should return a schema for the metadata associated with this interpretation
     *
     * @return {jsonschema} A schema representing the metadata for this interpretation
     */
    static metadataSchema()
    {
        throw Promise.rejected(new Error("Unimplemented"));
    }
}

module.exports = EBInterpretationBase;