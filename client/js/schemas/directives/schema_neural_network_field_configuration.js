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
 * Represents a single field being configured within the neural network
 */
angular.module('eb').directive('ebSchemaFieldNeuralNetworkConfiguration', function ebSchemaFieldNeuralNetworkConfiguration($timeout, EBDataService, EBDataSourceService)
{
    function controller($scope, $element, $attrs)
    {
        $scope.$watch('field.configuration.neuralNetwork.image.layers', function(newValue, oldValue)
        {
            if (newValue)
            {
                const inputWidth = $scope.field.configuration.neuralNetwork.image.inputWidth;
                const inputHeight = $scope.field.configuration.neuralNetwork.image.inputHeight;

                // Make sure that all of the values are kept within acceptable bounds
                $scope.field.configuration.neuralNetwork.image.layers.forEach(function(layer)
                {
                    layer._maxConvolutionalKernelSize = Math.min(layer.inputWidth - 1, layer.inputHeight - 1);
                    layer.convolutionPadSize = Math.min(layer.convolutionKernelSize, layer.convolutionPadSize) || 0;

                    layer._maxPoolingKernelSize = Math.min(layer.convolutionOutputWidth - 1, layer.convolutionOutputHeight - 1);
                    layer.poolingPadSize = Math.min(layer.poolingKernelSize, layer.poolingPadSize) || 0;
                });

                shared.models.EBSchemaNeuralNetworkConfiguration.recomputeConvolutionalLayerSizes(inputWidth, inputHeight, $scope.field.configuration.neuralNetwork.image.layers);
            }
        }, true);
    }

    return {
        templateUrl: "views/schemas/directives/schema_field_neural_network_configuration.html",
        controller,
        restrict: "E",
        scope: {
            field: '='
        }
    };
});
