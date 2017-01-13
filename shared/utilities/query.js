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

const underscore = require('underscore');

/**
 *  This function is used to convert between frontend query objects and a regular Mongo query
 */
module.exports.convertFrontendQueryToMongQuery = function convertFrontendQueryToMongQuery(query)
{
    query = underscore.defaults({}, query, {
        operator: 'AND',
        rules: []
    });

    function addRuleToQuery(mongoQuery, rule)
    {
        const mongoFieldName = rule.field.replace(/\[\]\./g, "");
        if (rule.condition === '=')
        {
            mongoQuery[mongoFieldName] = rule.data;
        }
        else if (rule.condition === '<')
        {
            mongoQuery[mongoFieldName] = {$lt: rule.data};
        }
        else if (rule.condition === '<=')
        {
            mongoQuery[mongoFieldName] = {$lte: rule.data};
        }
        else if (rule.condition === '>')
        {
            mongoQuery[mongoFieldName] = {$gt: rule.data};
        }
        else if (rule.condition === '>=')
        {
            mongoQuery[mongoFieldName] = {$gte: rule.data};
        }
        else if (rule.condition === '<>')
        {
            mongoQuery[mongoFieldName] = {$ne: rule.data};
        }
    }

    if (query.operator === 'AND')
    {
        const mongoQuery = {};
        function processRule(rule)
        {
            if (rule.query)
            {
                if (rule.query.operator === 'AND')
                {
                    rule.query.rules.forEach(processRule);
                }
                else if (rule.query.operator === 'OR')
                {
                    mongoQuery.$or = module.exports.convertFrontendQueryToMongQuery(rule.query);
                }
            }
            else
            {
                addRuleToQuery(mongoQuery, rule);
            }
        }

        query.rules.forEach(processRule);
        return mongoQuery;
    }
    else if (query.operator === 'OR')
    {
        const orConditions = [];

        function processRule(rule)
        {
            let mongoQuery = {};
            if (rule.query)
            {
                if (rule.query.operator === 'AND')
                {
                    mongoQuery = module.exports.convertFrontendQueryToMongQuery(rule.query);
                }
                else if (rule.query.operator === 'OR')
                {
                    mongoQuery.$or = module.exports.convertFrontendQueryToMongQuery(rule.query);
                }
            }
            else
            {
                addRuleToQuery(mongoQuery, rule);
            }

            orConditions.push(mongoQuery);
        }

        query.rules.forEach(processRule);

        return orConditions;
    }
};
