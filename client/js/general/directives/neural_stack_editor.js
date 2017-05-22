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
 * The neural stack editor allows you to customize the neural network
 */
angular.module('eb').directive('ebNeuralStackEditor', function ebNeuralStackEditor($timeout, EBNeuralLayerSchemas, EBImageNetworkLayerTypes, EBNeuralNetworkTemplates)
{
    const controller = function($scope)
    {
        $scope.layers = [];

        $scope.layerSchemas = EBNeuralLayerSchemas;
        $scope.templates = EBNeuralNetworkTemplates;
        
        $scope.newLayerSelected = function(layerSchema)
        {
            // Create a deep clone of the new layer and add it to our list
            $scope.layers.unshift(JSON.parse(JSON.stringify(layerSchema)));

            $scope.newLayerType = null;
        };


        $scope.templateNetworkSelected = function(template)
        {
            $scope.layers = JSON.parse(JSON.stringify(template.layers));

            $scope.newTemplateNetwork = null;
        };
        
        
        $scope.toggleLayerDetails = function(scope)
        {
            // scope.toggle();
            scope.isEditorOpen = !scope.isEditorOpen;
        }

        $scope.removeLayer = function(layer)
        {
            $scope.layers.splice($scope.layers.indexOf(layer), 1);
        };
    };

    return {
        templateUrl: "views/general/directives/neural_stack_editor.html",
        controller,
        restrict: "E",
        scope: {}
    };
});
