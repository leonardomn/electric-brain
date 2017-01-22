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
    EBBinaryInterpretation = require('./EBBinaryInterpretation'),
    EBBooleanInterpretation = require('./EBBooleanInterpretation'),
    EBHexInterpretation = require('./EBHexInterpretation'),
    EBStringInterpretation = require('./EBStringInterpretation'),
    EBNumberInterpretation = require('./EBNumberInterpretation'),
    EBSequenceInterpretation = require('./EBSequenceInterpretation'),
    EBObjectInterpretation = require('./EBObjectInterpretation'),
    Promise = require("bluebird"),
    underscore = require('underscore');


/**
 * The interpretation detector takes all of the registered interpretations, and will
 * analyze values with with.
 * 
 * TODO: Consolidate with EBSchemaDetector?
 */
class EBInterpretationDetector
{
    /**
     * Base constructor.
     */
    constructor()
    {
        this.binaryIntepretation = new EBBinaryInterpretation();
        this.booleanInterpretation = new EBBooleanInterpretation();
        this.hexInterpretation = new EBHexInterpretation();
        this.stringInterpretation = new EBStringInterpretation();
        this.numberInterpretation = new EBNumberInterpretation();
        this.sequenceInterpretation = new EBSequenceInterpretation();
        this.objectInterpretation = new EBObjectInterpretation();

        
        this.interpretations = [];
        this.interpretations.push(this.binaryIntepretation);
        this.interpretations.push(this.booleanInterpretation);
        this.interpretations.push(this.hexInterpretation);
        this.interpretations.push(this.stringInterpretation);
        this.interpretations.push(this.numberInterpretation);
        this.interpretations.push(this.sequenceInterpretation);
        this.interpretations.push(this.objectInterpretation);
        
        this.interpretationMap = {};
        this.interpretations.forEach((interpretation) =>
        {
            this.interpretationMap[interpretation.name] = interpretation;
        })
    }

    /**
     * This method will return the interpretation object for the given interpetation machine name
     *
     * @param {String} name The machine name for the interpretation
     */
    getInterpretation(name)
    {
        return this.interpretationMap[name];
    }


    /**
     * This method will determine the best interpretation chain for the given value.
     *
     * @param {*} value Can be practically anything.
     * @return {Promise} A promise that that resolves to an array with the sequence of interpretations that this value should go through
     */
    detectInterpretationChain(value)
    {
        const analyze = (value, currentInterpretation) =>
        {
            if (!currentInterpretation)
            {
                // Determine the starting interpretation based entirely on the fields type
                if (underscore.isString(value))
                {
                    return Promise.resolve(this.stringInterpretation);
                }
                else if (underscore.isBoolean(value))
                {
                    return Promise.resolve(this.booleanInterpretation);
                }
                else if (underscore.isNumber(value))
                {
                    return Promise.resolve(this.numberInterpretation);
                }
                else if (value instanceof Buffer)
                {
                    return Promise.resolve(this.binaryIntepretation);
                }
                else if (underscore.isArray(value))
                {
                    return Promise.resolve(this.sequenceInterpretation);
                }
                else if (underscore.isObject(value))
                {
                    return Promise.resolve(this.objectInterpretation);
                }
                else
                {
                    throw new Error("null interpretation here?");
                }
            }
            else
            {
                // Find all of the interpretations that are downstream from this one
                const availableInterpretations = underscore.filter(this.interpretations, (interpretation) =>
                {
                    const upstream = interpretation.getUpstreamInterpretations();
                    return upstream.indexOf(currentInterpretation) !== -1;
                });

                // Find a suitable interpretation
                return Promise.map(availableInterpretations, (interpretation) =>
                {
                    return interpretation.checkValue(value).then((result) =>
                    {
                        return {
                            result: result,
                            interpretation: interpretation
                        }
                    });
                }).then((interpretationResults) =>
                {
                    // If there are multiple possible interpretations, then perhaps it needs to be automatically detected
                    // which one to go with
                    const successfulInterpretations = underscore.filter(interpretationResults, (interpretationResult) =>
                    {
                        return interpretationResult.result;
                    });

                    if (successfulInterpretations.length === 0)
                    {
                        return null;
                    }
                    else
                    {
                        return interpretationResults[0].interpretation;
                    }
                });
            }
        };

        const recurse = (value, currentInterpretation) =>
        {
            // console.log('recursing', value, currentInterpretation);
            return analyze(value, currentInterpretation).then((interpretation) =>
            {
                if (!interpretation)
                {
                    return [];
                }
                else
                {
                    const chain = [interpretation];
                    const transformed = interpretation.transformValue(value);

                    return recurse(transformed, chain[0].name).then((subChain) =>
                    {
                        return chain.concat(subChain);
                    });
                }
            });
        };

        
        return recurse(value, null);
    }
}

module.exports = EBInterpretationDetector;