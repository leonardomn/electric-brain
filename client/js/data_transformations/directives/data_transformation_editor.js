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
 * This element allows you to configure a data transformation
 */
angular.module('eb').directive('ebDataTransformationEditor', function ebDataTransformationEditor()
{
    return {
        controller($scope)
        {
            $scope.transformations = {[$scope.field.configuration.transformation.type]: $scope.field.configuration.transformation};
            $scope.transformationType = $scope.field.configuration.transformation.type;

            $scope.$watch("transformationType", function(newValue)
            {
                if (newValue)
                {
                    if (!$scope.transformations[$scope.transformationType])
                    {
                        $scope.transformations[$scope.transformationType] = shared.models.EBDataTransformation.getDefaultTransformation($scope.transformationType, $scope.field);
                    }
                    $scope.field.configuration.transformation = $scope.transformations[$scope.transformationType];
                }
            });
        },
        templateUrl: "views/data_transformations/directives/data_transformation_editor.html",
        restrict: "E",
        scope: {field: "="}
    };
});
