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
    Ajv = require('ajv'),
    httpStatus = require('http-status-codes'),
    validator = require('../middleware/validator');


class EBAPIRoot
{
    /**
     * Creates a new EBAPIRoot
     *
     * @param {object} application The top level EBApplication object
     */
    constructor(application)
    {
        this.application = application;
    }

    /**
     * Register a single endpoint configuration with the express application
     *
     * @param {object} expressApplication This is an express application object.
     * @param {object} endpoint This is a configuration describing the endpoint
     */
    registerEndpoint(expressApplication, endpoint)
    {
        const outputValidatorPromise = validator.getJSONValidator(endpoint.outputSchema);
        expressApplication[endpoint.method.toLowerCase()](`/api${endpoint.uri}`,
            validator.inputValidator(endpoint),
            function(req, res, next)
            {
                outputValidatorPromise.then(function(validateOutput)
                {
                    try
                    {
                        endpoint.handler(req, res, function(err, responseBody)
                        {
                            if (err)
                            {
                                console.error(err);
                                return next(err);
                            }
                            else
                            {
                                const valid = validateOutput(responseBody);
                                const errors = validateOutput.errors;
                                if (!valid)
                                {
                                    res.status(httpStatus.INTERNAL_SERVER_ERROR);
                                    res.send("Internal error experienced. Invalid output.");
                                    console.error("Invalid output on endpoint " + endpoint.uri + ": ");
                                    console.error(JSON.stringify(errors, null, 2));
                                    console.error("On the output of:")
                                    console.error(JSON.stringify(responseBody, null, 2));
                                }
                                else
                                {
                                    res.type('application/json');
                                    res.status(httpStatus.OK);
                                    res.send(responseBody);
                                }
                            }
                        });
                    }
                    catch (err)
                    {
                        return next(err);
                    }
                }, function(err)
                {
                    return next(new Error(`Failure while compiling the input validator: ${err.toString()}`));
                });
            }
        );
    }


    setupEndpoints()
    {

    }
}

module.exports = EBAPIRoot;
