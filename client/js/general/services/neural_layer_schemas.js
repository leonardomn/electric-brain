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
 * This service provides general information on various types of supported Neural network layers
 */
angular.module('eb').service('EBNeuralLayerSchemas', function EBNeuralLayerSchemas()
{
    // An array of layers
    let layers = [];

    // HardTanh
    layers.push({
        name: 'HardTanh',
        parameters: [
            {
                name: 'min_value',
                value: -1
            },
            {
                name: 'max_value',
                value: 1
            }
        ]
    });

    // HardShrink
    layers.push({
        name: 'HardShrink',
        parameters: [
            {
                name: 'lambda',
                value: 0.5
            }
        ]
    });

    // SoftShrink
    layers.push({
        name: 'SoftShrink',
        parameters: [
            {
                name: 'lambda',
                value: 0.5
            }
        ]
    });

    // SoftMax
    layers.push({
        name: 'SoftMax',
        parameters: []
    });

    // SoftMin
    layers.push({
        name: 'SoftMin',
        parameters: []
    });

    // SoftPlus
    layers.push({
        name: 'SoftPlus',
        parameters: []
    });

    // SoftSign
    layers.push({
        name: 'SoftSign',
        parameters: []
    });

    // LogSigmoid
    layers.push({
        name: 'LogSigmoid',
        parameters: []
    });

    // LogSoftMax
    layers.push({
        name: 'LogSoftMax',
        parameters: []
    });

    // Sigmoid
    layers.push({
        name: 'Sigmoid',
        parameters: []
    });

    // Tanh
    layers.push({
        name: 'Tanh',
        parameters: []
    });

    // ReLU
    layers.push({
        name: 'ReLU',
        parameters: []
    });

    // ReLU6
    layers.push({
        name: 'ReLU6',
        parameters: []
    });

    // PReLU
    layers.push({
        name: 'PReLU',
        parameters: []
    });

    // RReLU
    layers.push({
        name: 'RReLU',
        parameters: [
            {
                name: 'l',
                value: (1.0 / 8.0)
            },
            {
                name: 'u',
                value: (1.0 / 3.0)
            }
        ]
    });

    // ELU
    layers.push({
        name: 'ELU',
        parameters: [
            {
                name: 'alpha',
                value: 1.0
            }
        ]
    });

    // LeakyReLU
    layers.push({
        name: 'LeakyReLU',
        parameters: [
            {
                name: 'negval',
                value: 1.0 / 100.0
            }
        ]
    });

    // SpatialSoftMax
    layers.push({
        name: 'SpatialSoftMax',
        parameters: [
        ]
    });

    // SpatialLogSoftMax
    layers.push({
        name: 'SpatialLogSoftMax',
        parameters: [
        ]
    });

    // AddConstant
    layers.push({
        name: 'AddConstant',
        parameters: [
            {
                name: 'constant',
                value: 1.0
            }
        ]
    });

    // MulConstant
    layers.push({
        name: 'MulConstant',
        parameters: [
            {
                name: 'constant',
                value: 1.0
            }
        ]
    });

    // Linear
    layers.push({
        name: 'Linear',
        parameters: [
            {
                name: 'inputDimension',
                value: 1.0
            },
            {
                name: 'outputDimension',
                value: 1.0
            }
        ]
    });

    // SparseLinear
    layers.push({
        name: 'SparseLinear',
        parameters: [
            {
                name: 'inputDimension',
                value: 1.0
            },
            {
                name: 'outputDimension',
                value: 1.0
            }
        ]
    });

    layers = _.sortBy(layers, (layer) =>
    {
        return layer.name;
    });

    return layers;
});
