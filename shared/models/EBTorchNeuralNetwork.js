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

const
    EBTorchCustomModule = require("./EBTorchCustomModule"),
    EBTorchModule = require("./EBTorchModule"),
    EBTorchNode = require("./EBTorchNode"),
    EBSchema = require("./EBSchema"),
    underscore = require('underscore');

/**
 *  This class represents a whole neural network in torch, which may be composed of several custom modules,
 *  and criterions
 */
class EBTorchNeuralNetwork
{
    /**
     * This creates a new torch node
     *
     * @param {string} name The name of the whole neural network
     * @param {[EBTorchCustomModule]} modules A list of custom modules
     */
    constructor(name, modules)
    {
        const self = this;
        self.name = name;
        self.modules = modules;
    }

    /*
     * Generates a new neural network from the given input and output schema.
     */
    static generateNeuralNetwork(networkName, inputSchema, outputSchema)
    {
        const modules = EBTorchNeuralNetwork.generateModules(networkName, inputSchema, outputSchema);
        return new EBTorchNeuralNetwork(networkName, modules);
    }


    /*
     * Generates a a piece of the neural network that will process sequences
     *
     * @param {string} name The name of the sequence module
     *
     * @param {EBSchemaNeuralNetworkConfiguration} configuration The configuration object to get the configuration for this element
     *
     * @param {[EBTorchNode]} fixedInputNodes A list of nodes which provide fixed inputs to the sequence module,
     *                                       e.g. an input that is the same for every item in the sequence
     *
     * @param {number} fixedInputSize The total tensor size of all the fixed inputs together
     *
     * @param {[EBTorchNode]} sequenceInputNode The node with the sequence input
     *
     * @param {number} sequenceInputSize The tensor size of each item in the sequence
     *
     * @param {[EBSchema]} sequenceOutputFields These are the schemas for the fields that will be output for the sequence
     */
    static generateSequenceProcessor(name, configuration, fixedInputNodes, fixedInputSize, sequenceInputNode, sequenceInputSize, sequenceOutputFields)
    {
        const sequenceProcessor = {
            fixedOutputNode: null,
            sequenceResultNode: null
        };

        let fixedInputNode = null;
        if (fixedInputNodes.length > 1)
        {
            fixedInputNode = new EBTorchNode(new EBTorchModule('nn.JoinTable', ["3"]), fixedInputNodes, `${name}_fixedInputNode`);
        }
        else if (fixedInputNodes.length === 1)
        {
            fixedInputNode = fixedInputNodes[0];
        }
        
        let joinedSequenceInputNode = null;
        if (fixedInputNode)
        {
            joinedSequenceInputNode = new EBTorchNode(new EBTorchModule("nn.MergeFixedIntoSequence"), [fixedInputNode, sequenceInputNode], `${name}_joinedSequenceInputNode`);
        }
        else
        {
            joinedSequenceInputNode = sequenceInputNode;
        }
        
        const fuseRNNInputTensors = new EBTorchNode(new EBTorchModule("nn.Sequential", [], [
            new EBTorchModule('nn.JoinTable', ["1"])
        ]), joinedSequenceInputNode, `${name}_fuseRNNInputTensors`);

        let modules = [];
        let layerInputSize = fixedInputSize + sequenceInputSize;
        configuration.sequence.layers.forEach(function(layer, index)
        {
            if (layer.type === 'lstm')
            {
                if (layer.bidirectional)
                {
                    modules.push(new EBTorchModule('nn.SeqBRNN', [layerInputSize, layer.internalSize]));
                }
                else
                {
                    modules.push(new EBTorchModule('nn.SeqLSTM', [layerInputSize, layer.internalSize]));
                }
            }
            else if (layer.type === 'gru')
            {
                if (layer.bidirectional)
                {
                    modules.push(new EBTorchModule('nn.SeqBGRU', [layerInputSize, layer.internalSize]));
                }
                else
                {
                    modules.push(new EBTorchModule('nn.SeqGRU', [layerInputSize, layer.internalSize]));
                }
            }
            else
            {
                throw new Error(`Unrecognized sequence module type ${layer.type}`);
            }

            layerInputSize = layer.internalSize;
        });

        if (configuration.sequence.dropout)
        {
            modules.push(new EBTorchModule("nn.Dropout", [configuration.sequence.dropout]));
        }

        const rnnModule = new EBTorchModule('nn.Sequential', [], modules);

        const rnnNode = new EBTorchNode(rnnModule, fuseRNNInputTensors, `${name}_rnnNode`);

        const fixedResultNode = new EBTorchNode(new EBTorchModule('nn.Sequential', [], [
            new EBTorchModule('nn.Sum', ["1"]),
            new EBTorchModule('nn.Linear', [layerInputSize, configuration.sequence.fixedSummaryVectorSize]),
            new EBTorchModule('nn.Unsqueeze', ["1"])
        ]), rnnNode, `${name}_fixedResultNode`);

        sequenceProcessor.fixedOutputNode = fixedResultNode;


        const sequenceOutputNodes = [];
        let outputTensorSize = 0;
        // Handle all of the sequence outputs
        sequenceOutputFields.forEach(function(field)
        {
            // Separate and process each of the sequence outputs
            const nodes = [new EBTorchModule("nn.Linear", [layerInputSize, field.tensorSize])];
            if (field.enum)
            {
                nodes.push(new EBTorchModule("nn.LogSoftMax"));
            }

            sequenceOutputNodes.push(new EBTorchModule("nn.Sequencer", [
                new EBTorchModule("nn.Sequential", [], nodes)
            ]));

            outputTensorSize += field.tensorSize;
        });

        // const sequenceItemResultNodes = [];
        if (sequenceOutputNodes.length > 0)
        {
            const processSequenceResults = new EBTorchNode(new EBTorchModule("nn.Concat", ["3"], sequenceOutputNodes), rnnNode, `${name}_processSequenceResults`);

            const sequenceResultNode = new EBTorchNode(new EBTorchModule("nn.SplitTable", ["1"]), processSequenceResults, `${name}_sequenceResultNode`);

            const wrapSequenceResults = new EBTorchNode(new EBTorchModule("nn.MapTable", [new EBTorchModule("nn.Unsqueeze", ["1"])]), sequenceResultNode, `${name}_wrapSequenceResults`);

            sequenceProcessor.sequenceResultNode = wrapSequenceResults;
        }

        return sequenceProcessor;
    }


    /*
     * Generates a piece of the neural network that creates fixed outputs
     *
     * @param {string} name The name of the fixed value module
     *
     * @param {[EBTorchNode]} inputNodes A list of nodes which provide inputs to the fixed-value processor
     *
     * @param {number} inputSize The total tensor size of all the fixed inputs together
     *
     * @param {[EBSchema]} outputFields These are the schemas for the fields that will be output for the sequence
     */
    static generateFixedProcessor(name, inputNodes, inputSize, outputFields)
    {
        const computedFixedOutputSize = underscore.reduce(outputFields, (memo, field) => memo + field.tensorSize, 0);

        const fixedOutputNodes = [];

        let joinedFixedTensorNode;
        if (inputNodes.length > 1)
        {
            joinedFixedTensorNode = new EBTorchNode(new EBTorchModule("nn.JoinTable", ["3"]), inputNodes, `joinedFixedTensorNode`);
        }
        else if (inputNodes.length === 1)
        {
            joinedFixedTensorNode = new EBTorchNode(new EBTorchModule("nn.Identity", []), inputNodes[0], `joinedFixedTensorNode`);
        }
        else
        {
            throw new Error("Unexpected condition! inputNodes.length === 0");
        }

        const reshapedJoinedTensor = new EBTorchNode(new EBTorchModule("nn.Select", [1, 1]), joinedFixedTensorNode, `reshapedJoinedTensor`);

        const linearUnit = new EBTorchNode(new EBTorchModule("nn.Sequential", [], [
            new EBTorchModule("nn.Linear", [inputSize, 100]),
            new EBTorchModule("nn.Dropout", [0.4]),
            new EBTorchModule("nn.ReLU", ['true']),
            new EBTorchModule("nn.Linear", [100, 100]),
            new EBTorchModule("nn.ReLU", ['true']),
            new EBTorchModule("nn.Linear", [100, computedFixedOutputSize])
        ]), reshapedJoinedTensor, `linearUnit`);
        // Now for any fixed outputs which are enums, we need to add in a log soft max module
        let tensorPosition = 1;
        outputFields.forEach(function(field)
        {
            // Create a narrow node to extract the field from the fixed input
            const extract = new EBTorchNode(new EBTorchModule("nn.Narrow", [2, tensorPosition, field.tensorSize]), linearUnit, `extract_${field.machineVariableName}`);
            let softmax;
            if (field.enum)
            {
                softmax = new EBTorchNode(new EBTorchModule("nn.LogSoftMax"), extract, `softmax_${field.machineVariableName}`);
            }
            else
            {
                softmax = extract;
            }

            const output = new EBTorchNode(new EBTorchModule("nn.Unsqueeze", [1]), softmax, `output_${field.machineVariableName}`);
            tensorPosition += field.tensorSize;
            fixedOutputNodes.push(output);
        });

        let fixedOutputNode = null;
        if (fixedOutputNodes.length > 1)
        {
            fixedOutputNode = new EBTorchNode(new EBTorchModule("nn.JoinTable", ["3"]), fixedOutputNodes, `fixedOutputNode`);
        }
        else if (fixedOutputNodes.length === 1)
        {
            fixedOutputNode = new EBTorchNode(new EBTorchModule("nn.Identity", []), fixedOutputNodes[0], `fixedOutputNode`);
        }

        return fixedOutputNode;
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
     * Generates a piece of the neural network that processes images
     *
     * @param {string} name The name of this image processing component
     * @param {EBSchemaNeuralNetworkConfiguration} configuration The configuration object to get the configuration for this element
     * @param {EBTorchNode} imageInputNode The node which provides the input image for processing
     */
    static generateImageProcessor(name, configuration, imageInputNode)
    {
    //     const modules = [];
    //     let previousLayerInputNode = imageInputNode;
    //     let lastLayerChannels = 3;
    //     configuration.image.layers.forEach(function(layer, index)
    //     {
    //         const convolutionalArguments = [lastLayerChannels, layer.numKernels, layer.convolutionKernelSize, layer.convolutionKernelSize, layer.convolutionStepSize, layer.convolutionStepSize, layer.convolutionPadSize, layer.convolutionPadSize];
    //         const convolutionalLayer = new EBTorchModule('nn.SpatialConvolution', convolutionalArguments);
    //         const nonLinearityLayer = new EBTorchModule('nn.Tanh');
    //         const poolingArguments = [layer.poolingKernelSize, layer.poolingKernelSize, layer.poolingStepSize, layer.poolingStepSize, layer.poolingPadSize, layer.poolingPadSize];
    //         const poolingLayer = new EBTorchModule('nn.SpatialMaxPooling', poolingArguments);
    //         modules.push(convolutionalLayer);
    //         modules.push(nonLinearityLayer);
    //         modules.push(poolingLayer);
    //         lastLayerChannels = layer.numKernels;
    //     });

        // const lastLayer = configuration.image.layers[configuration.image.layers.length - 1];
        //
        // // Lastly, reshape for output
        // const outputSize = lastLayer.numKernels * lastLayer.outputWidth * lastLayer.outputHeight;
        // const convolutionalStack = new EBTorchNode(new EBTorchModule("nn.Sequential", [], modules), imageInputNode, `${name}_convolutionalStack`);
        // const reshape = new EBTorchNode(new EBTorchModule("nn.Reshape", [outputSize]), convolutionalStack, `${name}_reshape`);

   // const layer1Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [3, 64, 3,3,1,1,1,1]), imageInputNode, `${name}_layer1Conv`);
   // const layer1BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [64, 1e-3]), layer1Conv, `${name}_layer1BatchNormal`);
    //const layer1Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer1BatchNormal,`${name}_layer1Relu` );
    //const layer1Dropout = new EBTorchNode(new EBTorchModule('nn.Dropout',[0.4]), layer1Relu,`${name}_layer1Dropout` );
    //const layer1MaxPooling = new EBTorchNode(new EBTorchModule('nn.SpatialMaxPooling',[2,2,2,2]), layer1Dropout,`${name}_layer1Maxpooling` );



    const layer1Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [3, 32, 3,3,1,1,1,1]), imageInputNode, `${name}_layer1Conv`);
    const layer1BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [32, 1e-3]), layer1Conv, `${name}_layer1BatchNormal`);
    const layer1Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer1BatchNormal ,`${name}_layer1Relu` );
    const layer2Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [32, 32, 3,3,1,1,1,1]), layer1Relu, `${name}_layer2Conv`);
    const layer2BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [32, 1e-3]), layer2Conv, `${name}_layer2BatchNormal`);
    const layer2Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer2BatchNormal ,`${name}_layer2Relu` );
    const layer1Dropout = new EBTorchNode(new EBTorchModule('nn.Dropout',[0.4]), layer2Relu,`${name}_layer2Dropout` );
    const layer1MaxPooling = new EBTorchNode(new EBTorchModule('nn.SpatialMaxPooling',[2,2,2,2]), layer1Dropout ,`${name}_layer1Maxpooling` );

    const layer3Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [32, 64, 3,3,1,1,1,1]), layer1MaxPooling, `${name}_layer3Conv`);
    const layer3BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [64, 1e-3]), layer3Conv, `${name}_layer3BatchNormal`);
    const layer3Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer3BatchNormal ,`${name}_layer3Relu` );
    const layer4Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [64, 64 , 3,3,1,1,1,1]), layer3Relu, `${name}_layer4Conv`);
    const layer4BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [64, 1e-3]), layer4Conv, `${name}_layer4BatchNormal`);
    const layer4Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer4BatchNormal ,`${name}_layer4Relu` );
    const layer2Dropout = new EBTorchNode(new EBTorchModule('nn.Dropout',[0.4]), layer4Relu,`${name}_layer4Dropout` );
    const layer2MaxPooling = new EBTorchNode(new EBTorchModule('nn.SpatialMaxPooling',[2,2,2,2]), layer2Dropout,`${name}_layer2Maxpooling` );

    const layer5Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [64, 128, 3,3,1,1,1,1]), layer2MaxPooling, `${name}_layer5Conv`);
    const layer5BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [128, 1e-3]), layer5Conv, `${name}_layer5BatchNormal`);
    const layer5Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer5BatchNormal ,`${name}_layer5Relu` );
    const layer6Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [128, 128, 3,3,1,1,1,1]), layer5Relu, `${name}_layer6Conv`);
    const layer6BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [128, 1e-3]), layer6Conv, `${name}_layer6BatchNormal`);
    const layer6Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer6BatchNormal ,`${name}_layer6Relu` );
    const layer3Dropout = new EBTorchNode(new EBTorchModule('nn.Dropout',[0.4]), layer6Relu,`${name}_layer3Dropout` );
    const layer3MaxPooling = new EBTorchNode(new EBTorchModule('nn.SpatialMaxPooling',[2,2,2,2]), layer3Dropout,`${name}_layer3Maxpooling` );

    const layer7Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [128, 256, 3,3,1,1,1,1]), layer3MaxPooling, `${name}_layer7Conv`);
    const layer7BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [256, 1e-3]), layer7Conv, `${name}_layer7BatchNormal`);
    const layer7Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer7BatchNormal ,`${name}_layer7Relu` );
    const layer8Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [256, 256, 3,3,1,1,1,1]), layer7Relu, `${name}_layer8Conv`);
    const layer8BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [256, 1e-3]), layer8Conv, `${name}_layer8BatchNormal`);
    const layer8Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer8BatchNormal ,`${name}_layer8Relu` );
    const layer4Dropout = new EBTorchNode(new EBTorchModule('nn.Dropout',[0.4]), layer8Relu,`${name}_layer4Dropout` );
    const layer4MaxPooling = new EBTorchNode(new EBTorchModule('nn.SpatialMaxPooling',[2,2,2,2]), layer4Dropout,`${name}_layer4Maxpooling` );

    const layer9Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [256, 512, 3,3,1,1,1,1]), layer4MaxPooling, `${name}_layer9Conv`);
    const layer9BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [512, 1e-3]), layer9Conv, `${name}_layer9BatchNormal`);
    const layer9Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer9BatchNormal ,`${name}_layer9Relu` );
    const layer10Conv = new EBTorchNode(new EBTorchModule('nn.SpatialConvolution', [512, 512, 3,3,1,1,1,1]), layer9Relu, `${name}_layer10Conv`);
    const layer10BatchNormal = new EBTorchNode(new EBTorchModule('nn.SpatialBatchNormalization', [512, 1e-3]), layer10Conv, `${name}_layer10BatchNormal`);
    const layer10Relu = new EBTorchNode(new EBTorchModule('nn.ReLU',['true']), layer10BatchNormal,`${name}_layer10Relu` );
    const layer5Dropout = new EBTorchNode(new EBTorchModule('nn.Dropout',[0.4]), layer10Relu,`${name}_layer5Dropout` );
    const layer5MaxPooling = new EBTorchNode(new EBTorchModule('nn.SpatialMaxPooling',[2,2,2,2]), layer5Dropout,`${name}_layer5Maxpooling` );



    const reshape = new EBTorchNode(new EBTorchModule("nn.Reshape", [512*3*3]), layer5MaxPooling, `${name}_reshape`);

    const unsqueeze = new EBTorchNode(new EBTorchModule("nn.Unsqueeze", [1]), reshape, `${name}_unsqueeze`);

        return {
            outputNode: unsqueeze,
            outputSize: 512*3*3
        };
    }

    /*
     * Generates a new neural network from the given input and output schema.
     */
    static generateModules(rootModuleName, inputSchema, outputSchema)
    {
        // Define some variables for convenient access
        const topLevelInputSequences = inputSchema.topLevelSequences;
        const topLevelOutputSequences = outputSchema.topLevelSequences;

        // Compute fields that are only in the output schema
        const outputOnlySchema = outputSchema.difference(inputSchema);

        // First check to see if this is a valid design. There can't be any sequences on the output
        // that aren't on the input
        topLevelOutputSequences.forEach(function(outputSequence)
        {
            if (!inputSchema.properties[outputSequence.machineVariableName])
            {
                throw new Error("Currently, generative models are not supported. All arrays in the output must also exist in the input.");
            }
        });

        // If there are no fields on the output that aren't on the input, then we short circuit and create a pure identity
        // module
        if (!outputOnlySchema)
        {
            const copyNode = new EBTorchNode(new EBTorchModule("nn.Identity", []), null, `inputOutput`);
            return [new EBTorchCustomModule(rootModuleName, copyNode, copyNode, [])];
        }

        let modules = [];
        const dependencies = [];

        function getModuleName(inputSequence)
        {
            return `${rootModuleName}__${inputSequence.variablePathFrom(inputSchema).replace(/\W+/g, "")}`;
        }

        // Now, for each top level sequence, we have to generate sub modules for that sequence
        // which assembles a fixed size tensor that can be used in the lstm
        const subSequenceModules = {};
        inputSchema.topLevelSequences.forEach(function(inputSequence)
        {
            const moduleName = getModuleName(inputSequence);
            const pairedOutputSequence = underscore.find(topLevelOutputSequences, function(outputSequence)
            {
                return outputSequence.variablePath === inputSequence.variablePath;
            });

            const moduleInput = inputSequence.items.clone();
            const moduleOutput = inputSequence.items.transform(function(field)
            {
                // If the field is a sequence, we replace it with a fixed size vector
                if (field.isArray)
                {
                    return false;
                }
                else
                {
                    return true;
                }
            });

            // If the paired output sequence has a fixed output, then we need a summary vector
            if ((pairedOutputSequence && pairedOutputSequence.items.topLevelFields.length > 0) || (outputOnlySchema.topLevelFields.length > 0))
            {
                moduleOutput.properties.summaryVector = EBSchema.generateVectorSchema(inputSequence.configuration.neuralNetwork.sequence.fixedSummaryVectorSize);
            }

            // Create the neural network for this sub module
            modules = modules.concat(EBTorchNeuralNetwork.generateModules(moduleName, moduleInput, moduleOutput));
            dependencies.push(moduleName);

            subSequenceModules[inputSequence.machineVariableName] = {
                name: moduleName,
                input: moduleInput,
                output: moduleOutput
            };
        });

        const inputTensorPositions = EBTorchNeuralNetwork.computeTensorPositions(inputSchema);
        const outputTensorPositions = EBTorchNeuralNetwork.computeTensorPositions(outputSchema);

        // Is there a tensor for fixed inputs?
        const hasFixedInputTensor = inputSchema.tensorSize > 0 ? 1 : 0;

        const inputNode = new EBTorchNode(new EBTorchModule("nn.Identity", []), null, `${rootModuleName}_input`);

        const fixedInputsNode = new EBTorchNode(new EBTorchModule("nn.SelectTable", ["1"]), inputNode, `fixedInputsNode`);

        const sequenceFixedResultNodes = [];
        const sequenceSequenceResultNodes = [];
        topLevelInputSequences.forEach(function(inputSequence, inputSequenceIndex)
        {
            const sequenceItemInputFields = inputSequence.items.topLevelFields;
            let pairedOutputSequence = null;
            const inputTensorSize = underscore.reduce(sequenceItemInputFields, (sum, field) => sum + field.tensorSize, 0) + (underscore.reduce(inputSequence.items.topLevelSequences, (memo, sequence) => memo + sequence.configuration.neuralNetwork.sequence.fixedSummaryVectorSize, 0));

            topLevelOutputSequences.forEach(function(outputSequence)
            {
                if (outputSequence.variablePath === inputSequence.variablePath)
                {
                    pairedOutputSequence = outputSequence;
                }
            });

            const selectSequenceNode = new EBTorchNode(new EBTorchModule('nn.SelectTable', [inputSequenceIndex + 1 + hasFixedInputTensor]), inputNode, `${inputSequence.machineVariableName}_selectSequenceNode`);

            let subModuleNode = null;
            if (inputSequence.items.topLevelSequences.length > 0)
            {
                subModuleNode = new EBTorchNode(new EBTorchModule('nn.MapTable', [new EBTorchModule(`nn.${getModuleName(inputSequence)}`)]), selectSequenceNode, `${inputSequence.machineVariableName}_subModuleNode`);
            }
            else
            {
                subModuleNode = new EBTorchNode(new EBTorchModule('nn.Identity'), selectSequenceNode, `${inputSequence.machineVariableName}_subModuleNode`);
            }

            let prepareRNNInputs = new EBTorchNode(new EBTorchModule('nn.MapTable', [
                new EBTorchModule(`nn.SelectTable`, [1])
            ]), subModuleNode, `${inputSequence.machineVariableName}_prepareRNNInputs`);

            let sequenceOutputFields = [];
            if (pairedOutputSequence)
            {
                pairedOutputSequence.items.topLevelFields.forEach(function(field)
                {
                    if (inputSequence.items.allVariablePaths.indexOf(field.variablePath) === -1)
                    {
                        // If the field isn't being copied from input to output, then add it to the list
                        // of sequence output fields
                        sequenceOutputFields.push(field);
                    }
                });
            }

            const sequenceFixedInputNodes = [];
            if (inputSchema.tensorSize > 0)
            {
                sequenceFixedInputNodes.push(fixedInputsNode);
            }

            const sequenceProcessor = EBTorchNeuralNetwork.generateSequenceProcessor(inputSequence.machineVariableName, inputSequence.configuration.neuralNetwork, sequenceFixedInputNodes, inputSchema.tensorSize, prepareRNNInputs, inputTensorSize, sequenceOutputFields);

            if (sequenceProcessor.fixedOutputNode)
            {
                sequenceFixedResultNodes.push(sequenceProcessor.fixedOutputNode);
            }

            // If there is a sequence result, we need to handle the sequence outputs
            if (pairedOutputSequence)
            {
                const sequenceItemResultNodes = [];
                if (sequenceProcessor.sequenceResultNode)
                {
                    sequenceItemResultNodes.push(sequenceProcessor.sequenceResultNode);
                }

                pairedOutputSequence.items.topLevelSequences.forEach(function(sequence, sequenceIndex)
                {
                    const extractSequenceResults = new EBTorchNode(new EBTorchModule("nn.MapTable", [
                        new EBTorchModule("nn.SelectTable", [sequenceIndex + 1 + subSequenceModules[inputSequence.machineVariableName].output.topLevelFields ? 1 : 0])
                    ]), subModuleNode, `${inputSequence.machineVariableName}_extractSubSequenceResults_${sequence.machineVariableName}`);

                    sequenceItemResultNodes.push(extractSequenceResults);
                });

                if (sequenceItemResultNodes.length > 1)
                {
                    sequenceSequenceResultNodes.push(new EBTorchNode(new EBTorchModule("nn.MergeSequences"), sequenceItemResultNodes, `${inputSequence.machineVariableName}_mergeSequenceResults`));
                }
                else
                {
                    const wrapSequenceResults = new EBTorchNode(new EBTorchModule("nn.MapTable", [new EBTorchModule("nn.Sequential", [], [
                        new EBTorchModule("nn.WrapTable")
                    ])]), sequenceItemResultNodes[0], `${inputSequence.machineVariableName}_wrapSequenceResults`);


                    sequenceSequenceResultNodes.push(wrapSequenceResults);
                }
            }
        });

        const fixedOutputNodes = [];
        const fixedOutputFields = [];

        // For any field which is a direct copy of the data from the input, we add in a node which just copies it from the input
        outputSchema.topLevelFields.forEach(function(field)
        {
            // If we are copying this field directly from the fixed input, then create a narrow function to copy the data
            if (inputSchema.allVariablePaths.indexOf(field.variablePath) !== -1)
            {
                const inputStart = inputTensorPositions[field.variablePath].tensorPosition;

                // Create a narrow node to extract the field from the fixed input
                const output = new EBTorchNode(new EBTorchModule("nn.Narrow", [3, inputStart, field.tensorSize]), fixedInputsNode, `output_${field.machineVariableName}`);
                fixedOutputNodes.push(output);
            }
            else
            {
                fixedOutputFields.push(field);
            }
        });


        let outputs = [];

        if (outputOnlySchema.tensorSize > 0)
        {
            let linearInputs = sequenceFixedResultNodes;
            let linearInputSize = underscore.reduce(topLevelInputSequences, (memo, sequence) => memo + sequence.configuration.neuralNetwork.sequence.fixedSummaryVectorSize, 0);
            if (hasFixedInputTensor)
            {
                linearInputs.push(fixedInputsNode);
                linearInputSize += inputSchema.tensorSize;
            }

            // Process any images
            const binaryFields = underscore.filter(inputSchema.topLevelFields, (field) => field.isBinary);
            binaryFields.forEach(function(binaryField, index)
            {
                const selectImageNode = new EBTorchNode(new EBTorchModule('nn.SelectTable', [index + 1 + topLevelInputSequences.length + hasFixedInputTensor]), inputNode, `${binaryField.machineVariableName}_selectImageNode`);
                const imageProcessor = EBTorchNeuralNetwork.generateImageProcessor(binaryField.machineVariableName, binaryField.configuration.neuralNetwork, selectImageNode);
                linearInputs.push(imageProcessor.outputNode);
                linearInputSize += imageProcessor.outputSize;
            });

            outputs.push(EBTorchNeuralNetwork.generateFixedProcessor('fixed', linearInputs, linearInputSize, fixedOutputFields));
        }

        outputs = outputs.concat(sequenceSequenceResultNodes);

        let outputNode = null;
        if (outputs.length > 1)
        {
            outputNode = new EBTorchNode(new EBTorchModule("nn.Identity"), outputs, `${rootModuleName}_outputs`);
        }
        else
        {
            outputNode = new EBTorchNode(new EBTorchModule("nn.WrapTable"), outputs[0], `${rootModuleName}_outputs`);
        }

        modules.push(new EBTorchCustomModule(rootModuleName, inputNode, outputNode, dependencies));

        return modules;
    }


    /*
     * Computes tensor positions for everything in the schema
     */
    static computeTensorPositions(inputSchema)
    {
        const tensorPositions = {};

        tensorPositions[inputSchema.variablePath] = {
            currentTensorPosition: 1,
            currentSequencePosition: 1,
            tensorPosition: null,
            sequencePosition: null
        };

        // Now we go through the entire input graph, and map the tensors
        inputSchema.walk(function(field, parent)
        {
            const metadata = {
                currentTensorPosition: 1,
                currentSequencePosition: 1
            };

            let tensorParent = parent;
            while (tensorParent.parent && !tensorParent.parent.isArray)
            {
                tensorParent = tensorParent.parent;
            }

            const parentMetadata = tensorPositions[parent.variablePath];
            tensorPositions[field.variablePath] = metadata;

            if (field.isNumber)
            {
                metadata.tensorPosition = parentMetadata.currentTensorPosition;
                metadata.sequencePosition = null;
                parentMetadata.currentTensorPosition += field.tensorSize;
            }
            else if (field.isArray)
            {
                metadata.tensorPosition = null;
                metadata.sequencePosition = parentMetadata.currentSequencePosition;
                parentMetadata.currentSequencePosition += 1;
            }
            else if (field.isObject)
            {
                metadata.tensorPosition = null;
                metadata.sequencePosition = null;
            }
        });

        return tensorPositions;
    }
}

module.exports = EBTorchNeuralNetwork;
