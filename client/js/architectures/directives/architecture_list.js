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
angular.module('eb').directive('ebArchitectureList', function ebArchitectureList(EBArchitectureService, $timeout)
{
    return {
        controller($scope)
        {
            EBArchitectureService.getArchitectures({select: ["_id", "name"]}).success(function success(data)
            {
                $scope.architectures = data.architectures;
            });

            $scope.selectArchitecture = function selectArchitecture(architecture)
            {
                EBArchitectureService.getArchitecture(architecture._id).then(function(response)
                {
                    $scope.selectedArchitecture = response.data;
                    if ($scope.onArchitectureClicked)
                    {
                        $timeout(function()
                        {
                            $scope.onArchitectureClicked(response.data);
                        });
                    }
                });
            };
        },
        templateUrl: "views/architectures/directives/architecture_list.html",
        restrict: "E",
        scope: {
            onArchitectureClicked: "=",
            selectedArchitecture: "=",
            showRadioSelection: '='
        }
    };
});
