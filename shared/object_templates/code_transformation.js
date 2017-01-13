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

const jsDefault = `
/**
 * This function will get called once for each value. You are expected to return a new value.
 * It is possible that the new value is a different type then the originating value, or even
 * an object with multiple values. E.g. if you have a Date("June 1, 2016"), you might output:
 * {
 *   monthInYear: 0.5,
 *   dayInMonth: 0.0
 * }
 *
 * which would allow you to have two outputs created for the given input.
 *
 * @param {anything} value This is the value that is being transformed.
 * @param {array} parents This is an array with references to each of
 *                        of the parents of the value. This will be ordered
 *                        with the first element being the root object, and
 *                        each subsequent element being the subobject or
 *                        array that eventually contains the given value.
 *
 */
module.exports = function transform(value, parents)
{
    return value;
}
`;

module.exports = {
    javascript: {
        type: "code",
        language: "javascript",
        code: jsDefault
    }
};
