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
    assert = require('assert'),
    randomUtilities = require("../../../shared/utilities/random");

describe("random utilities", function()
{
    describe("randomUtilities.getRandomIntegers", function()
    {
        it("should return a the full list of integers when the same count as max", function()
        {
            const expectedArray = [];
            for (let index = 1; index < 100; index += 1)
            {
                expectedArray.push(index - 1);
                const result = randomUtilities.getRandomIntegers(index, index);
                assert.equal(result.length, index);
                assert.deepEqual(result, expectedArray);
            }
        });

        it("should the correct number of integers", function()
        {
            const expectedArray = [];
            for (let index = 1; index < 1000; index += 1)
            {
                expectedArray.push(index - 1);
                const result = randomUtilities.getRandomIntegers(10000, index);
                assert.equal(result.length, index);
            }
        });
    });
});
