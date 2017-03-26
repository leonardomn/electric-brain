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

/**
 * EB - controller
 */


angular.module('eb').controller('EBDataSourceSelectTableController', function EBDataSourceSelectTableController($scope, $timeout, $state, EBDataSourceService, config, EBLoaderService, EBNavigationBarService)
{
    const promise = EBDataSourceService.detectDatabase($scope.dataSource.type).success(function(data)
    {
        $scope.mongoDatabases = data.databases;
    });
    
    EBLoaderService.showLoaderWith('page', promise);

    $scope.selectedDatabase = null;
    $scope.selectMongoDatabase = function selectMongoDatabase(mongoDatabase)
    {
        $scope.selectedDatabase = mongoDatabase;
        $scope.dataSource.database = {
            uri: `mongodb://localhost:27017/${mongoDatabase.name}`
        };
    };
    
    $scope.selectMongoCollection = function selectMongoCollection(mongoCollection)
    {
        $scope.dataSource.name = mongoCollection.name;
        $scope.dataSource.database.collection = mongoCollection.name;
        const promise = EBDataSourceService.createDataSource($scope.dataSource).then((body) =>
        {
            $state.go('edit_data_source.select_fields', {id: body.data._id, refreshSchema: true});
            EBNavigationBarService.refreshNavigationBar();
            return body;
        });
        EBLoaderService.showLoaderWith('menu', promise);
    };
});
