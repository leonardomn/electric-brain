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


angular.module('eb').service('EBDataSourceService', function EBDataSourceService($rootScope, $http, $timeout)
{
    const service = {};

    service.getSupportedDataSources = function getSupportedDataSources(databaseType)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: '/api/data-source-types',
            headers,
            params: {}
        });
    };

    service.detectDatabase = function detectDatabase(databaseType)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: '/api/database/detect',
            headers,
            params: {type: databaseType}
        });
    };

    service.getDatabaseInfo = function getDatabaseInfo(database)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: '/api/database',
            headers,
            params: database
        });
    };

    service.getCollectionSchema = function getCollectionSchema(dataSource)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: '/api/database/schema',
            headers,
            params: dataSource,
            transformResponse(data, headersGetter, status)
            {
                return {dataSchema: new shared.models.EBSchema(JSON.parse(data).dataSchema)};
            }
        });
    };

    service.sampleDataSource = function sampleDataSource(dataSource)
    {
        const headers = {};
        return $http({
            method: 'POST',
            url: `/api/dataSource/${dataSource._id}/sample`,
            headers,
            data: dataSource
        });
    };

    service.createDataSource = function createDataSource(data)
    {
        const headers = {};
        return $http({
            method: 'POST',
            url: '/api/data-sources',
            headers,
            data
        });
    };

    service.getDataSources = function getDataSources(query)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: '/api/data-sources',
            headers,
            params: query,
            transformResponse(data, headersGetter, status)
            {
                return {dataSources: _.map(JSON.parse(data).dataSources, (dataSource) => new shared.models.EBDataSource(dataSource))};
            }
        });
    };

    service.getDataSource = function getDataSource(id)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: `/api/data-sources/${id}`,
            headers,
            transformResponse(data, headersGetter, status)
            {
                return new shared.models.EBDataSource(JSON.parse(data));
            }
        });
    };

    service.saveDataSource = function saveDataSource(dataSource)
    {
        const headers = {};
        return $http({
            method: 'PUT',
            url: `/api/data-sources/${dataSource._id}`,
            headers,
            data: dataSource
        });
    };

    service.deleteDataSource = function deleteDataSource(dataSource)
    {
        const headers = {};
        return $http({
            method: 'DELETE',
            url: `/api/data-sources/${dataSource._id}`,
            headers
        });
    };

    service.findObjects = function findObjects(dataSource, query, limit)
    {
        const headers = {};
        return $http({
            method: 'GET',
            url: '/api/database/objects',
            headers,
            params: {
                dataSource: _.pick(dataSource, 'database', 'file', 'type'),
                query: query,
                limit: limit
            },
            transformResponse(data, headersGetter, status)
            {
                return JSON.parse(data);
            }
        });
    };

    return service;
});
