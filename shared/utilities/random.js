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
 * This is an efficient algorithm for sampling a set of count random integers
 * between [0, max). No integer will ever be repeated in the output of the
 * sample.
 *
 * @param {number} max The size of the pool of integers to sample from
 * @param {number} n The number of random integers to create
 */
module.exports.getRandomIntegers = function getRandomIntegers(max, n)
{
    const res = new Set();
    const count = max;
    for(let index = count - n; index < count; index += 1)
    {
        const item = Math.floor(Math.random() * (index + 1));
        if (res.has(item))
        {
            res.add(index);
        }
        else
        {
            res.add(item);
        }
    }
    
    return underscore.sortBy(Array.from(res), (item) => item);
};
