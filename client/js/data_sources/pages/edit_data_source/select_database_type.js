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


angular.module('eb').controller('EBDataSourceSelectDatabaseTypeController', function EBDataSourceSelectDatabaseTypeController($scope, $timeout, $state, EBDataSourceService)
{
    EBDataSourceService.getPlugins().then(function success(results)
    {
        const allDatabases = results.data.types;
        
        $scope.databases = allDatabases;
        $scope.selectDatabase = function selectDatabase(db)
        {
            $scope.dataSource.type = db.name;
            if (db.name === 'csv')
            {
                $state.go('^.upload_file', {type: db.name});
            }
            else if (db.name === 'mongo')
            {
                $state.go('^.select_table', {type: db.name});
            }
            else
            {
                $state.go('^.select_postgres', {type: db.name});
            }
        };
    });
});
