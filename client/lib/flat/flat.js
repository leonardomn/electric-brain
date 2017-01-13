/*
 THIS MODULE ISN'T AVAILABLE THROUGH BOWER.
 IT WAS TAKEN AND MODIFIED FROM https://github.com/hughsk/flat

 Copyright (c) 2014, Hugh Kennedy
 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 3. Neither the name of the  nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


var flat = flatten;
flatten.flatten = flatten;
flatten.unflatten = unflatten;

function flatten (target, opts)
{
    opts = opts || {};

    var delimiter = opts.delimiter || '.';
    var maxDepth = opts.maxDepth;
    var currentDepth = 1;
    var output = {};

    function step (object, prev)
    {
        Object.keys(object).forEach(function (key)
        {
            var value = object[key];
            var isarray = opts.safe && Array.isArray(value);
            var type = Object.prototype.toString.call(value);
            var isobject = (
                type === "[object Object]" ||
                type === "[object Array]"
            );

            var newKey = prev
                ? prev + delimiter + key
                : key;

            if (!opts.maxDepth)
            {
                maxDepth = currentDepth + 1;
            }

            if (!isarray && isobject && Object.keys(value).length && currentDepth < maxDepth)
            {
                ++currentDepth;
                return step(value, newKey)
            }

            output[newKey] = value
        })
    }

    step(target);

    return output
}

function unflatten (target, opts)
{
    opts = opts || {};

    var delimiter = opts.delimiter || '.';
    var overwrite = opts.overwrite || false;
    var result = {};

    if (Object.prototype.toString.call(target) !== '[object Object]')
    {
        return target
    }

    // safely ensure that the key is
    // an integer.
    function getkey (key)
    {
        var parsedKey = Number(key);

        return (
            isNaN(parsedKey) ||
            key.indexOf('.') !== -1
        ) ? key
            : parsedKey
    }

    Object.keys(target).forEach(function (key)
    {
        var split = key.split(delimiter);
        var key1 = getkey(split.shift());
        var key2 = getkey(split[0]);
        var recipient = result;

        while (key2 !== undefined)
        {
            var type = Object.prototype.toString.call(recipient[key1]);
            var isobject = (
                type === "[object Object]" ||
                type === "[object Array]"
            );

            // do not write over falsey, non-undefined values if overwrite is false
            if (!overwrite && !isobject && typeof recipient[key1] !== 'undefined')
            {
                return
            }

            if ((overwrite && !isobject) || (!overwrite && recipient[key1] == null))
            {
                recipient[key1] = (
                    typeof key2 === 'number' && !opts.object ? [] : {}
                )
            }

            recipient = recipient[key1];
            if (split.length > 0)
            {
                key1 = getkey(split.shift());
                key2 = getkey(split[0])
            }
        }

        // unflatten again for 'messy objects'
        recipient[key1] = unflatten(target[key], opts)
    });

    return result
}
