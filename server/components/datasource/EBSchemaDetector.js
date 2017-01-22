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
    EBFieldAnalysisAccumulator = require("./EBFieldAnalysisAccumulator"),
    EBInterpretationDetector = require("./interpretation/EBInterpretationDetector"),
    FieldInterpretationModel = require('../../../build/models/fieldinterpretation/ebbundle').EBBundleScript,
    models = require('../../../shared/models/models'),
    path = require('path'),
    underscore = require('underscore');

/**
 *  EBSchemaDetector is a tool for automatically detecting the schema of provided data.
 *
 *  It works by processing units of data in a map-reduce like fashion.
 */
class EBSchemaDetector
{
    /**
     * Creates a EBSchemaDetector
     */
    constructor()
    {
        const self = this;

        self.fieldAccumulators = new Map();
        self.interpretationChains = new Map();
        self.objectsAccumulated = 0;
        self.knownValueEnumCutOff = 250;

        self.fieldIntepretation = new FieldInterpretationModel(path.join(__dirname, '../../../build/models/fieldinterpretation'));
        self.fieldIntepretationStartPromise = self.fieldIntepretation.startModelProcess();
        
        self.interpretationDetector = new EBInterpretationDetector();
    }


    /**
     *  This method will accumulate the given object into the internal buffer.
     *
     *  @param {object} object The object to be analyzed by the schema detector
     *  @param {boolean} [keepForExample] Whether or not the values on the object
     *                                    should be kept for as examples. Defaults
     *                                    to false.
     *  @param {function(err)} callback The callback after the object has been
     *                                  successfully accumulated
     */
    accumulateObject(object, keepForExample, callback)
    {
        const self = this;

        self.fieldIntepretationStartPromise.then(() =>
        {
            /**
             * This function is used internally to recurse through a JSON object
             *
             * @param {string} rootVariablePath The variablePath leading from the root of the object down to this field
             * @param {anything} value The value being analyzed
             * @param {function(err)} callback The callback after recursion
             */
            function recurse(rootVariablePath, value, callback)
            {
                if (!self.interpretationChains.has(rootVariablePath))
                {
                    self.interpretationChains.set(rootVariablePath, new Set());
                }

                if (!self.fieldAccumulators.has(rootVariablePath))
                {
                    self.fieldAccumulators.set(rootVariablePath, {});
                }

                self.interpretationDetector.detectInterpretationChain(value).then((chain) =>
                {
                    const chainId = chain.map((chain) => chain.name).join("=>");
                    const lastInterpretation = chain[chain.length - 1];

                    // Record this interpretation chain for this value
                    self.interpretationChains.get(rootVariablePath).add(chainId);
                    //
                    // // Now record data for this interpretation
                    if (!self.fieldAccumulators.get(rootVariablePath)[lastInterpretation.name])
                    {
                        self.fieldAccumulators.get(rootVariablePath)[lastInterpretation.name] = self.interpretationDetector.getInterpretation(lastInterpretation.name);
                    }

                    // Put the variable through each the transformation for each interpretation, and on the last
                    // one, we accumulate it for statistical purposes
                    let currentValue = null;
                    Promise.each(chain, (interpretationName) =>
                    {
                        const interpretation = self.interpretationDetector.getInterpretation(interpretationName);
                    });



                }, (err) => console.error(err));

                if (underscore.isArray(value))
                {
                    async.eachSeries(value, function(arrayValue, next)
                    {
                        recurse(`${rootVariablePath}.[]`, arrayValue, next);
                    }, function(err)
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        self.fieldAccumulators.get(rootVariablePath).accumulateValue(value, false, callback);
                    });
                }
                else if (value instanceof Buffer)
                {
                    self.fieldAccumulators.get(rootVariablePath).accumulateValue(value, keepForExample, callback);
                }
                else if (underscore.isObject(value))
                {
                    const fields = Object.keys(value);
                    async.eachSeries(fields, function(field, next)
                    {
                        let variablePath = (rootVariablePath ? `${rootVariablePath}.` : "");
                        variablePath += field;
                        recurse(variablePath, value[field], next);
                    }, function(err)
                    {
                        if (err)
                        {
                            return callback(err);
                        }

                        self.fieldAccumulators.get(rootVariablePath).accumulateValue(value, false, callback);
                    });
                }
                else
                {
                    self.fieldAccumulators.get(rootVariablePath).accumulateValue(value, keepForExample, callback);
                }
            }

            self.objectsAccumulated += 1;

            recurse("", object, callback);
        }, (err) => callback(err));
    }


    /**
     *  This method will return the schema based on the current set of accumulated objects.
     *
     *  @returns {EBSchema} The schema that results from all the objects accumulated thus far
     */
    getSchema()
    {
        const self = this;
        const fields = [];

        // First step, we create a flat list of values
        for (const field of self.fieldAccumulators.keys())
        {
            const fieldAccumulator = self.fieldAccumulators.get(field);
            fieldAccumulator.recomputeHistograms();

            const fieldMetadata = fieldAccumulator.metadata;
            
            // Only include this in fields if its a field
            if (fieldMetadata.types.indexOf('object') === -1 && fieldMetadata.types.indexOf('array') === -1)
            {
                fields.push({
                    name: field,
                    metadata: fieldMetadata
                });
            }
        }

        const getFieldHead = function(fieldName)
        {
            if (fieldName.indexOf(".") !== -1)
            {
                return fieldName.substr(0, fieldName.indexOf('.'));
            }
            else
            {
                return fieldName;
            }
        };

        // Now we need to recursively assemble a schema
        const assembleSchema = function(root, allSchemaFields, depth)
        {
            let schemaFields = allSchemaFields;

            const variablePath = root.substr(0, root.length - 1);
            const schema = {title: variablePath};
            const removeRoot = function(id)
            {
                return id.substr(root.length);
            };

            // First, we need to decide whether the root is an object, array, or some native type
            if (schemaFields.length === 1 && removeRoot(schemaFields[0].name).indexOf('.') === -1 && !(/\[\]\.$/g.test(root)))
            {
                schema.type = schemaFields[0].metadata.types;
                schema.metadata = schemaFields[0].metadata;
                return schema;
            }
            else if (schemaFields.length === 0)
            {
                return {};
            }

            // Otherwise, we need to remove any fields that refer
            // directly to the root, if they exist
            schemaFields = underscore.filter(schemaFields, (field) => (`${field.name}.` !== root));

            // Grab the metadata for this field
            schema.metadata = self.fieldAccumulators.get(variablePath).metadata;

            // Decide whether we are dealing with an object or an array
            if (getFieldHead(removeRoot(schemaFields[0].name)) === '[]')
            {
                // Its an array!
                schema.type = ['array'];

                // Build up a schema for the array items.
                schema.items = assembleSchema(`${root}[].`, schemaFields, depth + 1);
            }
            else
            {
                schema.type = ['object'];

                // Group the fields by the root of their name
                const groupedFields = underscore.groupBy(schemaFields, (field) => getFieldHead(removeRoot(field.name)));

                // Now for each root, create a new schema entry under properties
                schema.properties = {};
                Object.keys(groupedFields).forEach(function(fieldRoot)
                {
                    if (fieldRoot === "")
                    {
                        return;
                    }

                    const subFields = groupedFields[fieldRoot];
                    schema.properties[fieldRoot] = assembleSchema(`${root}${fieldRoot}.`, subFields, depth + 1);
                });
            }

            return schema;
        };

        const sortedFields = underscore.sortBy(fields, (field) => (field.name));
        const schema = assembleSchema("", sortedFields, 1);

        return new models.EBSchema(schema);
    }
}

module.exports = EBSchemaDetector;
