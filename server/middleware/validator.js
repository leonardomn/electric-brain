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
    request = require('request'),
    validatorUtilities = require("../../shared/utilities/validator");


module.exports.inputValidator = function inputValidator(endpoint)
{
    const validatorPromise = validatorUtilities.getJSONValidator(endpoint.inputSchema);

    return function(req, res, next)
    {
        validatorPromise.then(function(validate)
        {
            let body = null;
            if (endpoint.method === 'GET')
            {
                body = req.query;
            }
            else
            {
                body = req.body;
            }

            const valid = validate(body);
            const errors = validate.errors;
            if (valid)
            {
                return next();
            }
            else
            {
                console.error(errors);
                res.type("application/json");
                res.status(httpStatus.BAD_REQUEST);
                res.send(errors);
            }
        },
        function()
        {
            return next(new Error("Error compiling the json validators"));
        });
    };
};
