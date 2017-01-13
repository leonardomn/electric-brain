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
 *  EBRollingAverage is a simple tool that keeps track of a rolling average over some time scale
 */
class EBRollingAverage
{
    /**
     * Creates a EBRollingAverage object.
     *
     * @param {number} period The number of items to keep in the rolling average.
     */
    constructor(period)
    {
        const self = this;
        self.period = period;
        self.values = [];
    }

    /**
     * Accumulates another value
     */
    accumulate(value)
    {
        const self = this;
        self.values.push(value);
        if (self.values.length > self.period)
        {
            self.values.shift();
        }

    }

    /**
     * Get the current average value
     */
    get average()
    {
        const self = this;
        if (self.values.length === 0)
        {
            return null;
        }

        let total = 0;
        self.values.forEach((value) => (total += value));
        return total / self.values.length;
    }
}

module.exports = EBRollingAverage;
