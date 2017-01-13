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
    async = require('async'),
    fileType = require('file-type'),
    jshashes = require('jshashes'),
    EBFieldMetadata = require("../../../shared/models/EBFieldMetadata"),
    EBNumberHistogram = require('../../../shared/models/EBNumberHistogram'),
    EBValueHistogram = require("../../../shared/models/EBValueHistogram"),
    jimp = require("jimp"),
    underscore = require('underscore');

const SHA1 = new jshashes.SHA1();

const _stringValues = Symbol("_stringValues");
const _numberValues = Symbol("_numberValues");
const _arrayLengths = Symbol("_arrayLengths");
const _binaryMimeTypes = Symbol("_binaryMimeTypes");
const _imageWidths = Symbol("_imageWidths");
const _imageHeights = Symbol("_imageHeights");
const _fingerprints = Symbol("_fingerprints");

// This needs to be moved to a configuration file of some sort
const maxStringLengthForHistogram = 250;

/**
 * This class is used to analyze values from a field and determine schema information about that
 * field. At the end, this accumulator produces an EBFieldMetadata object.
 */
class EBFieldAnalysisAccumulator
{
    /**
     * This creates an empty accumulator.
     */
    constructor()
    {
        const self = this;

        this.metadata = new EBFieldMetadata();


        if (!self[_numberValues])
        {
            self[_numberValues] = [];
        }

        if (!self[_stringValues])
        {
            self[_stringValues] = [];
        }

        if (!self[_fingerprints])
        {
            self[_fingerprints] = new Set();
        }

        if (!self[_arrayLengths])
        {
            self[_arrayLengths] = [];
        }

        if (!self[_binaryMimeTypes])
        {
            self[_binaryMimeTypes] = new Set();
        }

        if (!self[_imageWidths])
        {
            self[_imageWidths] = [];
        }

        if (!self[_imageHeights])
        {
            self[_imageHeights] = [];
        }


    }

    /**
     * This method accumulates a value into the field metadata.
     *
     * @param {anything} value The value that should be analyzed
     * @param {boolean} keepForExample Whether or not this value should be
     *                                 kept as an "example" value.
     * @param {function(err)} callback The callback after recursion
     */
    accumulateValue(value, keepForExample, callback)
    {
        const self = this;

        if (!callback)
        {
            console.log(new Error().stack);
        }

        function fingerprint32(value)
        {
            // Create the hash, and obtain 32 bits of entropy, and convert it to a
            // nice, tight integer we can use as a fingerprint
            return parseInt(`0x${SHA1.hex(value).slice(0, 8)}`);
        }

        async.series([
            function keepExample(next)
            {
                if (keepForExample)
                {
                    if (self.metadata.examples.indexOf(value) === -1)
                    {
                        if (value instanceof Buffer)
                        {
                            self.metadata.examples.push(value.toString('base64'));
                        }
                        else
                        {
                            self.metadata.examples.push(value);
                        }
                    }
                }
                return next();
            },
            function analyzeString(next)
            {
                if (underscore.isString(value))
                {
                    if (self.metadata.types.indexOf('string') === -1)
                    {
                        self.metadata.types.push('string');
                    }

                    // Only add it to the list of values if its below 250 characters in length. This prevents
                    // The system from storing fields that may have enormous strings that are totally unique
                    // to the field - a common case.
                    if (value.length < maxStringLengthForHistogram)
                    {
                        self[_stringValues].push(value);
                    }

                    self[_fingerprints].add(fingerprint32(value));
                }
                return next();
            },
            function analyzeNumber(next)
            {
                if (underscore.isNumber(value))
                {
                    if (self.metadata.types.indexOf('number') === -1)
                    {
                        self.metadata.types.push('number');
                    }

                    self[_numberValues].push(value);

                    self[_fingerprints].add(fingerprint32(String(value)));
                }
                return next();
            },
            function analyzeBoolean(next)
            {
                if (underscore.isBoolean(value))
                {
                    if (self.metadata.types.indexOf('boolean') === -1)
                    {
                        self.metadata.types.push('boolean');
                    }

                    self[_fingerprints].add(fingerprint32(String(value)));
                }
                return next();
            },
            function analyzeBinary(next)
            {
                if (value instanceof Buffer)
                {
                    if (self.metadata.types.indexOf('binary') === -1)
                    {
                        self.metadata.types.push('binary');
                    }

                    self[_fingerprints].add(fingerprint32(value.toString('base64')));

                    // First, analyze this value
                    const analysis = self.analyzeBinaryData(value, function(err, result)
                    {
                        if (err)
                        {
                            return next(err);
                        }

                        self[_binaryMimeTypes].add(result.mimeType);
                        if (result.image)
                        {
                            self.metadata.binaryHasImage = true;
                            self[_imageWidths].push(result.imageWidth);
                            self[_imageHeights].push(result.imageHeight);
                        }

                        return next();
                    });
                }
                else
                {
                    return next();
                }
            },
            function analyzeArray(next)
            {
                if (underscore.isArray(value))
                {
                    if (self.metadata.types.indexOf('array') === -1)
                    {
                        self.metadata.types.push('array');
                    }

                    self[_arrayLengths].push(value.length);
                }
                return next();
            },
            function analyzeObject(next)
            {
                if (underscore.isObject(value) && !(value instanceof Buffer))
                {
                    if (self.metadata.types.indexOf('object') === -1)
                    {
                        self.metadata.types.push('object');
                    }
                }
                return next();
            }
        ], function(err)
        {
            if (err)
            {
                return callback(err);
            }

            self.metadata.distinct = self[_fingerprints].size;
            self.metadata.total += 1;
            self.metadata.cardinality = self[_fingerprints].size / self.metadata.total;

            return async.nextTick(callback);
        });
    }


    /**
     * This method analyzes the given binary data to try and determine what it is and information about it
     *
     * @param {Buffer} value The binary data to be analyzed
     * @param {function(err, result)} callback The callback after the data has been analyzed
     */
    analyzeBinaryData(value, callback)
    {
        const type = fileType(value);

        if (!type)
        {
            return callback(null, {
                mimeType: "application/binary",
                image: false,
                imageWidth: null,
                imageHeight: null
            });
        }

        const result = {
            mimeType: type.mime,
            image: false,
            imageWidth: null,
            imageHeight: null
        };

        // If the data is an image, analyze it further
        if (type.mime.indexOf('image') === 0)
        {
            result.image = true;
            jimp.read(value, function (err, image)
            {
                if (err)
                {
                    return callback(err);
                }

                // Get the width and height of the image
                result.imageWidth = image.bitmap.width;
                result.imageHeight = image.bitmap.height;
                return callback(null, result);
            });
        }
        else
        {
            return callback(null, result);
        }
    }


    /**
     * This method recomputes the histograms for this field
     */
    recomputeHistograms()
    {
        const self = this;

        // Decide whether to compute the value histogram
        if (self.metadata.types.indexOf('string') !== -1)
        {
            self.metadata.valueHistogram = EBValueHistogram.computeHistogram(self[_stringValues]);
        }
        else
        {
            self.metadata.valueHistogram = new EBValueHistogram();
        }

        // Decide whether to compute the number histogram
        if (self.metadata.types.indexOf('number') !== -1)
        {
            self.metadata.numberHistogram = EBNumberHistogram.computeHistogram(self[_numberValues]);
        }
        else
        {
            self.metadata.numberHistogram = new EBNumberHistogram();
        }

        // Decide whether to compute the array length histogram
        if (self.metadata.types.indexOf('array') !== -1)
        {
            self.metadata.arrayLengthHistogram = EBNumberHistogram.computeHistogram(self[_arrayLengths]);
        }
        else
        {
            self.metadata.arrayLengthHistogram = new EBNumberHistogram();
        }

        // Decide whether to compute the image width
        if (self.metadata.types.indexOf('binary') !== -1)
        {
            self.metadata.binaryMimeTypeHistogram = EBValueHistogram.computeHistogram(self[_binaryMimeTypes]);
            self.metadata.imageWidthHistogram = EBNumberHistogram.computeHistogram(self[_imageWidths]);
            self.metadata.imageHeightHistogram = EBNumberHistogram.computeHistogram(self[_imageHeights]);
        }
        else
        {
            self.metadata.binaryMimeTypeHistogram = new EBValueHistogram();
            self.metadata.imageWidthHistogram = new EBNumberHistogram();
            self.metadata.imageHeightHistogram = new EBNumberHistogram();
        }
    }


    /**
     * Returns a JSON-Schema schema for EBFieldAnalysisAccumulator
     *
     * @returns {object} The JSON-Schema that can be used for validating this model object
     */
    static schema()
    {
        return {
            "id": "EBFieldAnalysisAccumulator",
            "type": "object",
            "properties": {
                _id: {},
                variableName: {"type": "string"},
                variablePath: {"type": "string"},
                types: {
                    "type": "array",
                    "items": {"type": "string"}
                },
                cardinality: {"type": "number"},
                distinct: {"type": "number"},
                total: {"type": "number"},
                valueHistogram: EBValueHistogram.schema(),
                numberHistogram: EBNumberHistogram.schema(),
                arrayLengthHistogram: EBNumberHistogram.schema(),
                binaryHasImage: {"type": "boolean"},
                binaryMimeTypeHistogram: EBValueHistogram.schema(),
                imageWidthHistogram: EBNumberHistogram.schema(),
                imageHeightHistogram: EBNumberHistogram.schema(),
                examples: {"type": "array"},
                number: {
                    "type": "object",
                    "properties": {
                        min: {"type": "number"},
                        average: {"type": "number"},
                        max: {"type": "number"}
                    }
                }
            }
        };
    }
}

module.exports = EBFieldAnalysisAccumulator;
