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
 * This represents a single layer within the EB stack editor
 */
angular.module('eb').directive('ebNeuralLayer', function ebNeuralStackEditor($timeout)
{
    const controller = function($scope)
    {

        $scope.removeConvNetLayer = function(scope)
        {
            // console.log($scope.field.configuration.interpretation.layers.length);
            if ($scope.field.configuration.interpretation.layers.length > 1)
            {
                scope.remove();
            }
        };
        $scope.toggleConvNetDetails = function(scope)
        {
            scope.toggle();
        };

        $scope.layers = EBImageNetworkLayerTypes.layerTypes;

        $scope.addNewLayers = function(newLayer)
        {
            $scope.field.configuration.interpretation.layers.push(_.clone(newLayer));
        };

        $scope.moveLastToTheBeginning = function ()
        {
            // var a = $scope.data.pop();
            // $scope.data.splice(0,0, a);
        };
        $scope.newSubItem = function(scope)
        {
            var nodeData = scope.$modelValue;
            var tempData = {
                "id": nodeData.id,
                "title": nodeData.title,
                "layerType": nodeData.layerType
            };
            $scope.field.configuration.interpretation.layers.push(tempData);
        };
        $scope.collapseAll = function() {
            $scope.$broadcast('collapseAll');
        };
        $scope.expandAll = function() {
            $scope.$broadcast('expandAll');
        };

    };

    return {
        templateUrl: "views/general/directives/neural_stack_editor.html",
        controller,
        restrict: "E",
        scope: {}
    };
});
