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

const Promise = require('bluebird'),
    randomUtilities = require('../../../shared/utilities/random'),
    EBSchemaDetector = require("../../../server/components/datasource/EBSchemaDetector");

/**
 *  This is the base class for different possible sources of data for the Electric Brain engine.
 */
class EBDataSourcePlugin
{
    /**
     * This method returns the machine name for the data source
     *
     * @returns {string} A string containing the machine name
     */
    get name()
    {
        throw new Error("Unimplemented");
    }
    
    
    /**
     * This method returns the URL for the icon of the data source
     *
     * @returns {string} A string containing a URL that can be loaded from the frontend API
     */
    get icon()
    {
        throw new Error("Unimplemented");
    }

    /**
     * This method tests the connection to the data source.
     *
     * @param {EBDataSource} This should be an EBDataSource object to test the connection with.
     * @returns {Promise} A promise that will resolve successfully if the connection is available
     */
    test(dataSource)
    {
        return Promise.rejected(new Error('Unimplemented'));
    }


    /**
     * This method lists all of the different tables within the database.
     *
     * @param {EBDataSource} This should be the EBDataSource object to find the tables with it
     * @returns {Promise} A promise that will resolve to the list of tables in the database.
     */
    lookupTables(dataSource)
    {
        return Promise.rejected(new Error('Unimplemented'));
    }


    /**
     * This method counts the number of objects that are available for sampling from a given data source
     *
     * @param {object} dataSource The data source object describing the database connection
     * @returns {Promise} A promise that will resolve to the total number of objects in the data source.
     *
     */
    count(dataSource)
    {
        return Promise.rejected(new Error('Unimplemented'));
    }


    /**
     * This method samples the given data source object, returning objects to the iterator
     *
     * @param {number} count The number of database objects to sample
     * @param {object} dataSource The data source object describing the database connection
     * @param {function(object)} iterator A callback that will be called once for each object returned in the random sample. The iterator should return a Promise.
     * @returns {Promise} A promise that will resolve when the sample is finished
     *
     */
    sample(count, dataSource, iterator)
    {
        return Promise.rejected(new Error('Unimplemented'));
    }


    /**
     * This method is used for fetching specific objects from the data set
     *
     * @param {object} dataSource The data source object describing the database connection
     * @param {object} query The query to be used to fetch objects with.
     * @param {number} [limit] The maximum number of matching objects to return
     * @returns {Promise} A promise that will resolve to the total number of objects in the data source.
     *
     */
    fetch(dataSource, query, limit)
    {
        return Promise.rejected(new Error('Unimplemented'));
    }


    /**
     * This method should sample the data from the data-source and determine what the schema is.
     *
     * @param {EBDataSource} dataSource This should be the EBDataSource object to find the tables with it
     * @param {function(dataSchema, objectsCompleted, objectsTotal)} [iterator] This is an iterator function that is called with the intermediary schemas as they are being assembled.
     * @returns {Promise} A promise that will resolve to the EBSchema object for this data-source.
     */
    detectSchema(dataSource, iterator)
    {
        const maxNumberOfObjectsToSample = dataSource.sampleSize;
        const examplesToKeep = 10;
        const objectsBetweenIteratorCalls = 25;
        const exampleIndexes = randomUtilities.getRandomIntegers(maxNumberOfObjectsToSample, examplesToKeep);

        const schemaDetector = new EBSchemaDetector(this.application);
        let objectIndex = 0;

        return this.sample(maxNumberOfObjectsToSample, dataSource,
            (object) =>
            {
                let keepForSample = false;
                if (exampleIndexes.indexOf(objectIndex) !== -1)
                {
                    keepForSample = true;
                }

                // Accumulate the converted version of the object
                objectIndex += 1;

                return schemaDetector.accumulateObject(object, keepForSample).then(() =>
                {
                    let iteratorPromise = Promise.resolve();
                    if (objectIndex % objectsBetweenIteratorCalls === 0)
                    {
                        iteratorPromise = iterator(schemaDetector.getSchema(), objectIndex, maxNumberOfObjectsToSample);
                    }

                    return iteratorPromise;
                });
            }).then(() =>
        {
            const schema = schemaDetector.getSchema();
            return iterator(schema, maxNumberOfObjectsToSample, maxNumberOfObjectsToSample).then(() =>
            {
                return schema;
            });
        });
    }
}

module.exports = EBDataSourcePlugin;
