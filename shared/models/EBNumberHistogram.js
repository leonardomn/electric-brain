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

const quantile = require("compute-quantile");

/**
 * This represents a histogram showing the most common values for a particular field.
 */
class EBNumberHistogram
{
    /**
     * This constructs an EBNumberHistogram object from the given raw JSON data.
     *
     * @param {object} rawHistogram The raw JSON data describing the histogram
     */
    constructor(rawHistogram)
    {
        const self = this;

        if (!rawHistogram)
        {
            rawHistogram = {};
        }

        if (rawHistogram.buckets)
        {
            self.buckets = rawHistogram.buckets;
        }
        else
        {
            self.buckets = [];
        }
    }

    /**
     * This function will compute the number histogram from the given set of numbers
     *
     * @param {[value]} values The list of values to compute the histogram for
     * @returns {EBNumberHistogram} The resulting histogram
     */
    static computeHistogram(values)
    {
        // The number of buckets
        let desiredNumberOfBuckets = 20;

        if (values.length === 0)
        {
            return new EBNumberHistogram();
        }

        // Compute the 10% and 90% quantiles
        const lower = 0.1;
        const upper = 0.8;
        const lowerQuantile = quantile(values, lower);
        const upperQuantile = quantile(values, upper);

        // We create a bucket that covers the inner 80% of the data thoroughly and spills over to the edges
        let bucketSize = (upperQuantile - lowerQuantile) / (desiredNumberOfBuckets * 0.8);
        let start = lowerQuantile - bucketSize;
        let singleValue = false;

        // If there is only one number, then bucketSize will be 0. We have to treat this case special
        if (bucketSize === 0)
        {
            bucketSize = 1;
            desiredNumberOfBuckets = 3;
            start = lowerQuantile - 1;
            singleValue = true;
        }

        const buckets = [];
        for (let bucket = 0; bucket < desiredNumberOfBuckets; bucket += 1)
        {
            const lowerBound = start + (bucket * bucketSize);
            const upperBound = start + ((bucket + 1) * bucketSize);

            let frequency = 0;

            // Go through all the values and count up how many fall into this bucket
            values.forEach(function(value)
            {
                if ((value >= lowerBound && value < upperBound) || (singleValue && value === lowerBound))
                {
                    frequency += 1;
                }
            });

            buckets.push({
                lowerBound: lowerBound,
                upperBound: upperBound,
                frequency: frequency
            });
        }

        return new EBNumberHistogram({buckets: buckets, singleValue: singleValue});
    }

    /**
     * Returns a JSON-Schema schema for EBNumberHistogram
     *
     * @returns {object} The JSON-Schema that can be used for validating this model object
     */
    static schema()
    {
        return {
            "id": "EBNumberHistogram",
            "type": "object",
            "properties": {
                singleValue: {"type": "boolean"},
                buckets: {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            lowerBound: {"type": "number"},
                            upperBound: {"type": "number"},
                            frequency: {"type": "number"}
                        }
                    }
                }
            }
        };
    }
}

module.exports = EBNumberHistogram;
