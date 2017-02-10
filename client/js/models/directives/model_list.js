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
 * This element is used to provide a list of models
 */
angular.module('eb').directive('ebModelList', function ebModelList(EBModelService, $timeout)
{
    return {
        controller($scope)
        {
            EBModelService.getModels({select: ["_id", "name"]}).success(function success(data)
            {
                $scope.models = data.models;
            });

            $scope.selectModel = function selectModel(model)
            {
                EBModelService.getModel(model._id).success(function success(model)
                {
                    $scope.selectedModel = model;

                    if ($scope.onModelClicked)
                    {
                        $timeout(function()
                        {
                            $scope.onModelClicked(model);
                        });
                    }
                });
            };
        },
        templateUrl: "views/models/directives/model_list.html",
        restrict: "E",
        scope: {
            onModelClicked: "=",
            selectedModel: "=",
            showRadioSelection: '='
        }
    };
});
