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
 * This is an abstract base class representing a single step in the pipeline of data for an architecture.
 */
class EBArchitectureElement
{
    /**
     *  This method is used for updating the input schema for this element.
     *
     *  It should update its output schema accordingly, if needed.
     *
     *  @param {EBSchema} newInputSchema The new input schema to this architecture element.
     */
    updateInputSchema(newInputSchema)
    {
        throw new Error("EBArchitectureElement::updateInputSchema is not implemented");
    }


    /**
     * Return the input EBSchema for this element.
     */
    get inputSchema()
    {
        throw new Error("EBArchitectureElement::inputSchema is not implemented");
    }


    /**
     * Return the output EBSchema for this element.
     */
    get outputSchema()
    {
        throw new Error("EBArchitectureElement::outputSchema is not implemented");
    }


    /**
     * This method should transform the given object, returning the new object.
     *
     * @param {object} object An arbitrary input object that matches the inputSchema for this element.
     */
    transformObject(object)
    {
        throw new Error("EBArchitectureElement::transformObject is not implemented");
    }


    /**
     * Returns a JSON-Schema schema for this architectures
     *
     * @returns {object} The JSON-Schema that can be used for validating this architectures in its raw form
     */
    static schema()
    {
        return {
            "id": "rawArchitectureElement",
            "type": "object",
            "properties": {
                "_id": {},
                "name": {"type": "string"},
                "type": {"type": "string"}
            }
        };
    }
}

module.exports = EBArchitectureElement;
