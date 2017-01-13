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
 * This element is used to provide a list of data sources, which can be used to select a single data source
 */
angular.module('eb').directive('ebDataSourceList', function ebDataSourceList(EBDataSourceService, $timeout)
{
    return {
        controller($scope)
        {
            EBDataSourceService.getDataSources({select: ["_id", "name"]}).success(function success(data)
            {
                $scope.dataSources = data.dataSources;
            });

            $scope.selectDataSource = function selectDataSource(dataSource)
            {
                EBDataSourceService.getDataSource(dataSource._id).success(function success(data)
                {
                    $scope.selectedDataSource = data;
                    if ($scope.onDataSourceClicked)
                    {
                        $timeout(function()
                        {
                            $scope.onDataSourceClicked(data);
                        });
                    }
                });
            };
        },
        templateUrl: "views/data_sources/directives/data_source_list.html",
        restrict: "E",
        scope: {
            onDataSourceClicked: "=",
            selectedDataSource: "=",
            showRadioSelection: '='
        }
    };
});
