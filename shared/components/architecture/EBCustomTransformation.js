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

const EBArchitectureElement = require('./EBArchitectureElement');

const _inputSchema = Symbol("_inputSchema");

/**
 * This class represents a custom data transformation within our system. Users are able
 * to provide custom code to transform objects before they are input into an
 * architecture.
 */
class EBCustomTransformation extends EBArchitectureElement
{
    /**
     * This constructs a full EBCustomTransformation object given the raw JSON data.
     *
     * The raw JSON data is the data we send verbatim over http endpoints and store in the database.
     *
     * @param {object} rawCustomTransformation The raw JSON data describing the custom transformation.
     * @param {EBSchema} inputSchema An EBSchema object representing the input to this custom transformation
     */
    constructor(rawCustomTransformation, inputSchema)
    {
        super();
        const self = this;
        Object.keys(rawCustomTransformation).forEach(function(key)
        {
            self[key] = rawCustomTransformation[key];
        });

        self[_inputSchema] = inputSchema;
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
                "language": {
                    "type": "string",
                    "enum": ["javascript", "lua"]
                },
                "name": {"type": "string"},
                "code": {"type": "string"}
            }
        };
    }
}

module.exports = EBCustomTransformation;
