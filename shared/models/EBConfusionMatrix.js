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

const _mapping = Symbol("_mapping");

/**
 *  EBConfusionMatrix is a class that is used for keeping track of which classifications
 *  are being misidentified as which others.
 */
class EBConfusionMatrix
{
    /**
     * Creates an EBConfusionMatrix from the given raw data
     *
     * @param {object} rawConfusionMatrix The raw JSON data for this confusion matrix
     */
    constructor(data)
    {
        const self = this;
        
        if (!data)
        {
            data = {};
        }

        if (data.expectedValues)
        {
            self.expectedValues = data.expectedValues;
        }
        else
        {
            self.expectedValues = [];
        }

        if (data.historySize)
        {
            self.historySize = data.historySize;
        }
        else
        {
            // Default size is 100
            self.historySize = 100;
        }

        self[_mapping] = {};
        self.expectedValues.forEach(function(expectedValue)
        {
            self[_mapping][expectedValue.value] = expectedValue;
        });
    }

    /**
     * Accumulates a result into the confusion matrix.
     */
    accumulateResult(expectedValue, actualValue)
    {
        const self = this;

        if (!self[_mapping][expectedValue])
        {
            self[_mapping][expectedValue] = {
                value: expectedValue,
                actualValues: []
            };

            self.expectedValues.push(self[_mapping][expectedValue]);
        }

        // Add the value to the history. If the history is too long,
        // pop off the oldest value
        self[_mapping][expectedValue].actualValues.push(actualValue);
        if (self[_mapping][expectedValue].actualValues.length > self.historySize)
        {
            self[_mapping][expectedValue].actualValues.shift();
        }
    }


    /**
     * Returns a JSON-Schema schema for EBNumberHistogram
     *
     * @returns {object} The JSON-Schema that can be used for validating this model object
     */
    static schema()
    {
        return {
            "id": "EBConfusionMatrix",
            "type": "object",
            "properties": {
                historySize: {type: "number"},
                expectedValues: {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            value: {},
                            actualValues: {
                                "type": "array",
                                "items": {}
                            }
                        }
                    }
                }
            }
        };
    }
}

module.exports = EBConfusionMatrix;
