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
angular.module('eb').directive('ebNeuralStackEditor', function ebNeuralStackEditor($timeout, EBImageNetworkLayerTypes)
{
    const controller = function($scope)
    {
        $scope.$watch('layers', function(newValue, oldValue)
        {
            if (newValue)
            {
                // If any of the layers aren't module objects, change them into module objects
                if (_.any($scope.layers, (layer) => !(layer instanceof shared.models.EBNeuralNetworkEditorModule)))
                {
                    $scope.layers = _.map(newValue, (layer) => new shared.models.EBNeuralNetworkEditorModule(layer));
                }
            }
        });

        if ($scope.mode === 'fixed')
        {
            $scope.layerSchemas = _.filter(_.values(shared.models.EBNeuralNetworkEditorModule.knownLayers), (layerSchema) => layerSchema.fixed);

            $scope.templates = [
                {
                    name: "Small MLP",
                    generateTemplate: function()
                    {
                        return shared.models.EBNeuralNetworkTemplateGenerator.generateMultiLayerPerceptronTemplate('small');
                    }
                },
                {
                    name: "Medium MLP",
                    generateTemplate: function()
                    {
                        return shared.models.EBNeuralNetworkTemplateGenerator.generateMultiLayerPerceptronTemplate('medium');
                    }
                },
                {
                    name: "Large MLP",
                    generateTemplate: function()
                    {
                        return shared.models.EBNeuralNetworkTemplateGenerator.generateMultiLayerPerceptronTemplate('large');
                    }
                }
            ];
        }
        else if ($scope.mode === 'sequence')
        {
            $scope.layerSchemas = _.filter(_.values(shared.models.EBNeuralNetworkEditorModule.knownLayers), (layerSchema) => layerSchema.sequence);

            $scope.templates = [
                {
                    name: "Small LSTM",
                    generateTemplate: function()
                    {
                        return shared.models.EBNeuralNetworkTemplateGenerator.generateMultiLayerLSTMTemplate('small', 1);
                    }
                },
                {
                    name: "Medium LSTM",
                    generateTemplate: function()
                    {
                        return shared.models.EBNeuralNetworkTemplateGenerator.generateMultiLayerLSTMTemplate('medium', 1);
                    }
                },
                {
                    name: "Large LSTM",
                    generateTemplate: function()
                    {
                        return shared.models.EBNeuralNetworkTemplateGenerator.generateMultiLayerLSTMTemplate('large', 1);
                    }
                }
            ];
        }

        $scope.newLayerSelected = function(layerSchema)
        {
            // Create a deep clone of the new layer and add it to our list
            $scope.layers.unshift(shared.models.EBNeuralNetworkEditorModule.createNewLayer(layerSchema.name));

            $scope.newLayerType = null;
        };


        $scope.templateNetworkSelected = function(template)
        {
            // Clone each of the layers
            $scope.layers = _.map(template.generateTemplate(), (layer) => new shared.models.EBNeuralNetworkEditorModule(layer));
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

        $scope.treeOptions = {
            accept: accept
        };


        function accept(sourceNodeScope, destNodesScope, destIndex)
        {
            // We don't allow any manipulation of the order of locked layers
            if ($scope.layers[destIndex].locked)
            {
                return false;
            }
            return true;
        }
    };

    return {
        templateUrl: "views/general/directives/neural_stack_editor.html",
        controller,
        restrict: "E",
        scope: {
            layers: '=',
            mode: '@'
        }
    };
});
