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
 * This service provides neural network templates
 */
angular.module('eb').service('EBNeuralNetworkTemplates', function EBNeuralNetworkTemplates(EBNeuralLayerSchemas)
{
    // An array of templates
    const templates = [];

    // A function to create templates from a simplified form
    function createFullTemplateObject(simpleTemplate)
    {
        const fullObject = {
            name: simpleTemplate.name,
            layers: []
        }
        
        simpleTemplate.layers.forEach(function(layer)
        {
            // Find the layer in the list of full layer objects
            EBNeuralLayerSchemas.forEach(function(layerSchema)
            {
                if (layerSchema.name === layer.name)
                {
                    const newLayerObject = JSON.parse(JSON.stringify(layerSchema));

                    newLayerObject.parameters.forEach(function(parameter)
                    {
                        if (layer[parameter.name] !== undefined)
                        {
                            parameter.value = layer[parameter.name];
                        }
                    });
                    
                    fullObject.layers.push(newLayerObject);
                }
            });
        });
        
        return fullObject;
    }


    templates.push(createFullTemplateObject({
        name: "Small MLP",
        layers: [
            {
                name: 'Linear',
                inputSize: null,
                outputSize: 100
            },
            {
                name: 'Tanh'
            },
            {
                name: 'Linear',
                inputSize: 100,
                outputSize: 100
            },
            {
                name: 'Tanh'
            },
            {
                name: 'Linear',
                inputSize: 100,
                outputSize: null
            }
        ]
    }));


    return templates;
});
