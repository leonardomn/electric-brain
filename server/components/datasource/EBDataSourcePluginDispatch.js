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

const EBDataSourcePlugin = require("./EBDataSourcePlugin"),
    Promise = require('bluebird'),
    underscore = require('underscore');

/**
 *  This is registers all of the available EBDataSourcePlugins and will dispatch the methods
 *  to the appropriate plugin depending on the type of data source.
 */
class EBDataSourcePluginDispatch
{
    /**
     * Creates an EBDataSourcePluginDispatch object.
     */
    constructor()
    {
        this.plugins = {};
    }

    /**
     * This method returns a list of supported data source plugins
     *
     * @return {[EBDataSourcePlugin]} Returns all of the plugin objects
     */
    getSupportedDataSources(type, plugin)
    {
        return underscore.values(this.plugins);
    }

    /**
     * This method registers a plugin with the dispatch.
     *
     * @param {string} type The machine name of the data source type
     * @param {EBDataSourcePlugin} plugin The plugin to be registered.
     */
    registerPlugin(type, plugin)
    {
        this.plugins[type] = plugin;
    }


    /**
     * This method tests the connection to the data source.
     *
     * @param {EBDataSource} dataSource This should be an EBDataSource object to test the connection with.
     * @returns {Promise} A promise that will resolve successfully if the connection is available
     */
    test(dataSource)
    {
        if (!dataSource.type)
        {
            return Promise.rejected(new Error("Your dataSource has no type!"));
        }

        if (!this.plugins[dataSource.type])
        {
            return Promise.rejected(new Error(`There are no available plugins for ${dataSource.type} data sources.`));
        }
        
        return this.plugins[dataSource.type].test(dataSource);
    }


    /**
     * This method lists all of the different tables within the database.
     *
     * @param {EBDataSource} This should be the EBDataSource object to find the tables with it
     * @returns {Promise} A promise that will resolve to the list of tables in the database.
     */
    lookupTables(dataSource)
    {
        if (!dataSource.type)
        {
            return Promise.rejected(new Error("Your dataSource has no type!"));
        }

        if (!this.plugins[dataSource.type])
        {
            return Promise.rejected(new Error(`There are no available plugins for ${dataSource.type} data sources.`));
        }

        return this.plugins[dataSource.type].lookupTables(dataSource);
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
        if (!dataSource.type)
        {
            return Promise.rejected(new Error("Your dataSource has no type!"));
        }

        if (!this.plugins[dataSource.type])
        {
            return Promise.rejected(new Error(`There are no available plugins for ${dataSource.type} data sources.`));
        }

        return this.plugins[dataSource.type].count(dataSource);
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
        if (!dataSource.type)
        {
            return Promise.rejected(new Error("Your dataSource has no type!"));
        }

        if (!this.plugins[dataSource.type])
        {
            return Promise.rejected(new Error(`There are no available plugins for ${dataSource.type} data sources.`));
        }

        return this.plugins[dataSource.type].sample(count, dataSource, iterator);
    }


    /**
     * This method is used for fetching specific objects from the data set
     *
     * @param {object} dataSource The data source object describing the database connection
     * @param {object} query The query to be used to fetch objects with.
     * @param {number} [limit] optional The maximum number of objects to fetch. A default value of 25.
     * @returns {Promise} A promise that will resolve to the total number of objects in the data source.
     *
     */
    fetch(dataSource, query, limit)
    {
        if (!dataSource.type)
        {
            return Promise.rejected(new Error("Your dataSource has no type!"));
        }

        if (!this.plugins[dataSource.type])
        {
            return Promise.rejected(new Error(`There are no available plugins for ${dataSource.type} data sources.`));
        }

        return this.plugins[dataSource.type].fetch(dataSource, query, limit);
    }


    /**
     * This method should sample the data from the data-source and determine what the schema is.
     *
     * @param {EBDataSource} This should be the EBDataSource object to find the tables with it
     * @returns {Promise} A promise that will resolve to the EBSchema object for this data-source.
     */
    detectSchema(dataSource)
    {
        if (!dataSource.type)
        {
            return Promise.rejected(new Error("Your dataSource has no type!"));
        }

        if (!this.plugins[dataSource.type])
        {
            return Promise.rejected(new Error(`There are no available plugins for ${dataSource.type} data sources.`));
        }

        return this.plugins[dataSource.type].detectSchema(dataSource);
    }
}

module.exports = EBDataSourcePluginDispatch;
