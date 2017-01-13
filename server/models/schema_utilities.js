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

// This file holds a bunch of utilities for manipulating json-schemas

const assert = require('assert');

/**
 *  This function can take the given json schema, and reduce it to just the
 *  fields that are allowed by the given reduction schema. The reduction
 *  schema is just an object that parallels the structure of the json schema,
 *  and specifies whether a given field is allowed in the output.
 *
 *  @param {string} name This should be a new name that will be given to the reduced schema
 *  @param {object} jsonSchema This is the original json schema that we are going to reduce
 *  @param {object} reductionSchema This is an object that mirrors the structure of a real
 *                                  object in this schema, which as 'true' for every property
 *                                  that should be in the output.
 *
 *  @returns {object} A new jsonSchema that only contains the allowed fields
 */
module.exports.getReducedSchema = function getReducedSchema(name, jsonSchema, reductionSchema)
{
    // First make some basic assumptions, like the root of the given json schema is an object
    assert.equal(jsonSchema.type, "object");

    // Now we make a clone of the given json schema.
    const resultSchema = JSON.parse(JSON.stringify(jsonSchema));

    // Now go through each of the property names in the given schema, and see if they are provided
    // in the reduction schema.
    const propertyNames = Object.keys(jsonSchema.properties);
    propertyNames.forEach(function(propertyName)
    {
        if (!reductionSchema[propertyName])
        {
            delete resultSchema.properties[propertyName];
            if (resultSchema.required && resultSchema.required.indexOf(propertyName) !== -1)
            {
                resultSchema.required.splice(resultSchema.required.indexOf(propertyName), 1);
            }
        }
        else if (resultSchema.properties[propertyName].type === 'object' && reductionSchema[propertyName] instanceof Object)
        {
            resultSchema.properties[propertyName] = module.exports.getReducedSchema(null, resultSchema.properties[propertyName], reductionSchema[propertyName]);
        }
    });

    if (name)
    {
        resultSchema.id = name;
    }

    return resultSchema;
};

