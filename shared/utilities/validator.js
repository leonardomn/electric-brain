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

const Ajv = require('ajv'),
    httpStatus = require('http-status-codes'),
    request = require('request');

/**
 * This method constructs a validator for the given schema.
 * 
 * @param {json-schema} A json-schema that should be validated with Ajv
 * @returns {Promise} A promise that will resolve to a validation function
 */
module.exports.getJSONValidator = function getJSONValidator(schema)
{
    /**
     * This function is used by json-schema to request referenced schemas, such as json-schema spec itself which is used internally
     *
     * @param {string} uri The URI of the referenced schema resource
     * @param {function} callback The callback to be called with the result.
     */
    function loadSchema(uri, callback)
    {
        request.json(uri, function(err, res, body)
        {
            if (err || res.statusCode >= httpStatus.BAD_REQUEST)
            {
                return callback(err || new Error(`Error while loading a JSON schema: ${res.statusCode}`));
            }
            else
            {
                return callback(null, body);
            }
        });
    }

    const ajv = new Ajv({
        "allErrors": true,
        // "removeAdditional": true,
        "coerceTypes": true,
        loadSchema
    });

    const compilePromise = new Promise(function(resolve, reject)
    {
        ajv.compileAsync(schema, function(err, validate)
        {
            if (err)
            {
                reject(err);
            }
            else
            {
                resolve(validate);
            }
        });
    });

    return compilePromise;
};