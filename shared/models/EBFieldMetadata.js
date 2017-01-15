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
    EBNumberHistogram = require('./EBNumberHistogram'),
    EBValueHistogram = require("./EBValueHistogram"),
    underscore = require('underscore');


/**
 * This class represents statistical metadata gathered about a field. Examples must be a histogram of the
 * values, etc..
 */
class EBFieldMetadata
{
    /**
     * This constructs a full EBFieldMetadata object from the given raw JSON data.
     *
     * @param {object} rawFieldMetadata The raw JSON data describing the field metadata
     */
    constructor(rawFieldMetadata)
    {
        const self = this;

        if (!rawFieldMetadata)
        {
            rawFieldMetadata = {};
        }

        if (rawFieldMetadata.types)
        {
            self.types = rawFieldMetadata.types;
        }
        else
        {
            self.types = [];
        }

        if (rawFieldMetadata.valueHistogram)
        {
            self.valueHistogram = new EBValueHistogram(rawFieldMetadata.valueHistogram);
        }
        else
        {
            self.valueHistogram = new EBValueHistogram();
        }

        if (rawFieldMetadata.numberHistogram)
        {
            self.numberHistogram = new EBNumberHistogram(rawFieldMetadata.numberHistogram);
        }
        else
        {
            self.numberHistogram = new EBNumberHistogram();
        }

        if (rawFieldMetadata.arrayLengthHistogram)
        {
            self.arrayLengthHistogram = new EBNumberHistogram(rawFieldMetadata.arrayLengthHistogram);
        }
        else
        {
            self.arrayLengthHistogram = new EBNumberHistogram();
        }

        if (rawFieldMetadata.binaryMimeTypeHistogram)
        {
            self.binaryMimeTypeHistogram = new EBValueHistogram(rawFieldMetadata.binaryMimeTypeHistogram);
        }
        else
        {
            self.binaryMimeTypeHistogram = new EBValueHistogram();
        }

        if (rawFieldMetadata.imageWidthHistogram)
        {
            self.imageWidthHistogram = new EBNumberHistogram(rawFieldMetadata.imageWidthHistogram);
        }
        else
        {
            self.imageWidthHistogram = new EBNumberHistogram();
        }

        if (rawFieldMetadata.imageHeightHistogram)
        {
            self.imageHeightHistogram = new EBNumberHistogram(rawFieldMetadata.imageHeightHistogram);
        }
        else
        {
            self.imageHeightHistogram = new EBNumberHistogram();
        }

        if (rawFieldMetadata.total)
        {
            self.total = rawFieldMetadata.total;
        }
        else
        {
            self.total = 0;
        }

        if (rawFieldMetadata.distinct)
        {
            self.distinct = rawFieldMetadata.distinct;
        }
        else
        {
            self.distinct = 0;
        }

        if (rawFieldMetadata.cardinality)
        {
            self.cardinality = rawFieldMetadata.cardinality;
        }
        else
        {
            self.cardinality = 0;
        }

        if (rawFieldMetadata.variableName)
        {
            self.variableName = rawFieldMetadata.variableName;
        }
        if (rawFieldMetadata.variablePath)
        {
            self.variablePath = rawFieldMetadata.variablePath;
        }
        if (rawFieldMetadata.binaryHasImage)
        {
            self.binaryHasImage = true;
        }
        else
        {
            self.binaryHasImage = false;
        }

        if (rawFieldMetadata.examples)
        {
            self.examples = rawFieldMetadata.examples;
        }
        else
        {
            self.examples = [];
        }

        if (rawFieldMetadata.interpretation)
        {
            self.interpretation = rawFieldMetadata.interpretation;
        }
        else
        {
            self.interpretation = null;
        }
    }


    /**
     * Returns a JSON-Schema schema for EBFieldMetadata
     *
     * @returns {object} The JSON-Schema that can be used for validating this model object
     */
    static schema()
    {
        return {
            "id": "EBFieldMetadata",
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
                },
                interpretation: {
                    "type": ["string", "null"],
                    "enum": [
                        "base32",
                        "base64",
                        "boolean",
                        "date",
                        "datetime",
                        "hex",
                        "mstimestamp",
                        "number",
                        "text",
                        "time",
                        "unixtimestamp",
                        null
                    ]
                }
            }
        };
    }
}

module.exports = EBFieldMetadata;
