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

// Copyright 2014, 2015 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

const leftPad = require("left-pad");

function get(options, key, defaultValue)
{
    return (key in options ? options[key] : defaultValue);
}

function lineNumbers(code, options)
{
    const getOption = get.bind(null, options || {});
    const transform = getOption("transform", Function.prototype);
    const padding = getOption("padding", " ");
    const before = getOption("before", " ");
    const after = getOption("after", " | ");
    const start = getOption("start", 1);
    const isArray = Array.isArray(code);
    const lines = (isArray ? code : code.split("\n"));
    const end = start + lines.length - 1;
    const width = String(end).length;
    const numbered = lines.map(function(line, index)
    {
        const number = start + index;
        const params = {
            before: before,
            number: number,
            width: width,
            after: after,
            line: line
        };
        transform(params);
        return params.before + leftPad(params.number, width, padding) +
            params.after + params.line;
    });
    return (isArray ? numbered : numbered.join("\n"));
}

module.exports.lineNumbers = lineNumbers;

module.exports.toTitleCase = function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};