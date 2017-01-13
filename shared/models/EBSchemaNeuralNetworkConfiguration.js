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


const enumCardinalityCutoff = 0.05;

/**
 * Represents the configuration for a particular field as far as the neural network is concerned
 */
class EBSchemaNeuralNetworkConfiguration
{
    /**
     * This constructs an EBSchemaNeuralNetworkConfiguration object from the raw data
     *
     * @param {object} rawNeuralNetworkConfiguration The raw JSON data describing the neural network configuration
     */
    constructor(rawNeuralNetworkConfiguration)
    {
        const self = this;

        if (!rawNeuralNetworkConfiguration)
        {
            rawNeuralNetworkConfiguration = {};
        }

        // Copy in all of the values
        Object.keys(rawNeuralNetworkConfiguration).forEach(function(key)
        {
            self[key] = rawNeuralNetworkConfiguration[key];
        });
    }

    /**
     * This method generates the default neural network configuration for the given schema
     *
     * @param {EBSchema} schema The schema object to generate the configuration for.
     * @returns {EBSchemaNeuralNetworkConfiguration} Returns the new configuration object
     */
    static generateDefaultConfigurationForField(field)
    {
        if (field.isArray)
        {
            return new EBSchemaNeuralNetworkConfiguration({
                sequence: {
                    layers: [
                        {
                            type: "lstm",
                            internalSize: 100,
                            bidirectional: true
                        },
                        {
                            type: "lstm",
                            internalSize: 100,
                            bidirectional: true
                        }
                    ],
                    dropout: 0.5,
                    fixedSummaryVectorSize: 50
                },
                field: null,
                image: null
            });
        }
        else if (field.metadata.binaryHasImage)
        {
            // By default, the goal is to convolve the network right down to a single pixel
            const desiredOutputWidth = 1;
            const desiredOutputHeight = 1;
            const maxNumberOfConvolutionalLayers = 8;
            const defaultConvolutionalKernelSize = 5;
            const defaultConvolutionalStepSize = 1;
            const defaultPoolingKernelSize = 2;
            const defaultPoolingStepSize = 2;

            // Use the median width / height.
            const widthBucket = field.metadata.imageWidthHistogram.buckets[Math.floor(field.metadata.imageWidthHistogram.buckets.length / 2)];
            const heightBucket = field.metadata.imageHeightHistogram.buckets[Math.floor(field.metadata.imageHeightHistogram.buckets.length / 2)];

            const width = Math.floor((widthBucket.upperBound - widthBucket.lowerBound) / 2) + widthBucket.lowerBound;
            const height = Math.floor((heightBucket.upperBound - heightBucket.lowerBound) / 2) + heightBucket.lowerBound;

            // Keep creating layers until we reach one pixel
            let currentLayerInputWidth = width;
            let currentLayerInputHeight = height;
            const layers = [];
            let layerIndex = 0;
            // Max 10 layers, no matter what
            while (layerIndex < maxNumberOfConvolutionalLayers)
            {
                const layer = {};
                layer.inputWidth = currentLayerInputWidth;
                layer.inputHeight = currentLayerInputHeight;
                layer.convolutionKernelSize = Math.max(1, Math.min(currentLayerInputHeight, Math.min(currentLayerInputWidth, defaultConvolutionalKernelSize)));
                layer.convolutionStepSize = defaultConvolutionalStepSize;
                layer.convolutionPadSize = Math.floor((layer.convolutionKernelSize - 1) / 2);
                layer.numKernels = 32;
                layer.poolingMethod = "max";
                layer.poolingKernelSize = Math.max(1, Math.min(currentLayerInputHeight, Math.min(currentLayerInputWidth, defaultPoolingKernelSize)));
                layer.poolingStepSize = defaultPoolingStepSize;
                layer.poolingPadSize = Math.floor((layer.poolingKernelSize - 1) / 2);
                
                layerIndex += 1;

                layers.push(layer);

                EBSchemaNeuralNetworkConfiguration.recomputeConvolutionalLayerSizes(width, height, layers);
                
                // Only add the output layer
                if (layer.outputWidth && layer.outputHeight && layer.outputWidth > 1 && layer.outputHeight > 1)
                {
                    currentLayerInputWidth = layer.outputWidth;
                    currentLayerInputHeight = layer.outputHeight;
                }
                else
                {
                    layers.slice(layers.pop());

                    EBSchemaNeuralNetworkConfiguration.recomputeConvolutionalLayerSizes(width, height, layers);

                    break;
                }
            }

            return new EBSchemaNeuralNetworkConfiguration({
                sequence: null,
                image: {
                    inputDimensions: 3,
                    inputWidth: width,
                    inputHeight: height,
                    layers: layers
                },
                field: null
            });
        }
        else if (field.isString)
        {
            if (field.metadata.cardinality < enumCardinalityCutoff)
            {
                return new EBSchemaNeuralNetworkConfiguration({
                    sequence: null,
                    string: {
                        mode: "classification"
                    },
                    field: null,
                    image: null
                });
            }
            else {
                return new EBSchemaNeuralNetworkConfiguration({
                    sequence: null,
                    string: {
                        mode: "sequence"
                    },
                    field: null,
                    image: null
                });
            }
        }
        else
        {
            return new EBSchemaNeuralNetworkConfiguration({
                sequence: null,
                field: null,
                image: null
            });

        }
    }

    static recomputeConvolutionalLayerSizes(inputWidth, inputHeight, layers)
    {
        let currentLayerInputWidth = inputWidth;
        let currentLayerInputHeight = inputHeight;
        layers.forEach(function(layer)
        {
            layer.inputWidth = currentLayerInputWidth;
            layer.inputHeight = currentLayerInputHeight;

            const convolutionalOutputSize = EBSchemaNeuralNetworkConfiguration.computeConvolutionOutputSize(
                currentLayerInputWidth,
                currentLayerInputHeight,
                layer.convolutionKernelSize,
                layer.convolutionKernelSize,
                layer.convolutionStepSize,
                layer.convolutionStepSize,
                layer.convolutionPadSize,
                layer.convolutionPadSize,
                0,
                0
            );

            layer.convolutionOutputWidth = convolutionalOutputSize.width;
            layer.convolutionOutputHeight = convolutionalOutputSize.height;

            const poolingOutputSize = EBSchemaNeuralNetworkConfiguration.computeMaxPoolingOutputSize(
                convolutionalOutputSize.width,
                convolutionalOutputSize.height,
                layer.poolingKernelSize,
                layer.poolingKernelSize,
                layer.poolingStepSize,
                layer.poolingStepSize,
                layer.poolingPadSize,
                layer.poolingPadSize,
                0,
                0
            );

            layer.outputWidth = poolingOutputSize.width;
            layer.outputHeight = poolingOutputSize.height;

            currentLayerInputWidth = layer.outputWidth;
            currentLayerInputHeight = layer.outputHeight;
        });
    }

    static computeConvolutionOutputSize(inputWidth, inputHeight, kernelWidth, kernelHeight, stepWidth, stepHeight, padWidth, padHeight)
    {
        return {
            width: Math.floor(((inputWidth + (2 * padWidth) - kernelWidth) / stepWidth) + 1),
            height: Math.floor(((inputHeight + (2 * padHeight) - kernelHeight) / stepHeight) + 1)
        };
    }

    static computeMaxPoolingOutputSize(width, height, kernelWidth, kernelHeight, stepWidth, stepHeight, padWidth, padHeight)
    {
        return {
            width: Math.floor(((width + (2 * padWidth) - kernelWidth) / stepWidth) + 1),
            height: Math.floor(((height + (2 * padHeight) - kernelHeight) / stepHeight) + 1)
        };
    }


    /**
     * Returns a JSON-Schema schema for EBNumberHistogram
     *
     * @returns {object} The JSON-Schema that can be used for validating this model object
     */
    static schema()
    {
        return {
            "id": "EBSchemaNeuralNetworkConfiguration",
            "type": "object",
            "properties": {
                sequence: {
                    "type": ["object", "null"],
                    "properties": {
                        layers: {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    type: {
                                        "type": "string",
                                        "enum": ["lstm", "gru"]
                                    },
                                    internalSize: {"type": "number"},
                                    bidirectional: {"type": "boolean"}
                                }
                            }
                        },
                        dropout: {"type": "number"},
                        fixedSummaryVectorSize: {"type": "number"}
                    }
                },
                field: {
                    "type": ["object", "null"],
                    "properties": {
                        mode: {
                            "type": "string",
                            "enum": ["number", "enum", "vector", "image"]
                        }
                    }
                },


                string: {
                    "type": ["object", "null"],
                    "properties": {
                        mode: {
                            "type": "string",
                            "enum": ["classification", "sequence"]
                        }
                    }
                },



                image: {
                    "type": ["object", "null"],
                    "properties": {
                        inputDimensions: {"type": "number"},
                        inputWidth: {"type": "number"},
                        inputHeight: {"type": "number"},
                        layers: {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    inputWidth: {"type": "number"},
                                    inputHeight: {"type": "number"},
                                    convolutionKernelSize: {"type": "number"},
                                    convolutionStepSize: {"type": "number"},
                                    convolutionPadSize: {"type": "number"},
                                    convolutionOutputWidth: {"type": "number"},
                                    convolutionOutputHeight: {"type": "number"},
                                    numKernels: {"type": "number"},
                                    poolingMethod: {"type": "string"},
                                    poolingKernelSize: {"type": "number"},
                                    poolingStepSize: {"type": "number"},
                                    poolingPadSize: {"type": "number"},
                                    outputWidth: {"type": "number"},
                                    outputHeight: {"type": "number"}
                                }
                            }
                        }
                    }
                }
            }
        };
    }
}

module.exports = EBSchemaNeuralNetworkConfiguration;
