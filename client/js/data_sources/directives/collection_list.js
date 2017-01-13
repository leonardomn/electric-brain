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
 * The collection list is an element that allows you to view the list of tables/collections that are contained within a database
 */
angular.module('eb').directive('ebCollectionList', function ebCollectionList($timeout, EBDataService, EBDataSourceService)
{
    const controller = function($scope)
    {
        $scope.updateCollectionList = function updateCollectionList()
        {
            $scope.collections = null;
            EBDataSourceService.getDatabaseInfo({"database": $scope.database}).success(function(body)
            {
                $scope.collections = body.collections;
            });
        };

        $scope.$watch("database.uri", function(newValue)
        {
            if (newValue)
            {
                $scope.updateCollectionList();
            }
        }, true);

        $scope.selectCollection = function selectCollection(collection)
        {
            $scope.selectedCollection = collection.name;
        };
    };

    return {
        templateUrl: "views/data_sources/directives/collection_list.html",
        controller,
        restrict: "E",
        scope: {
            database: '=',
            selectedCollection: '='
        }
    };
});
