#
# Electric Brain is an easy to use platform for machine learning.
# Copyright (C) 2016 Electric Brain Software Corporation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import tensorflow as tf
from shape import EBTensorShape, createSummaryModule
from plugins import EBNeuralNetworkComponentBase
from editor import generateEditorNetwork
from utils import eprint, tensorPrint
import plugins
import numpy
import concurrent.futures

class EBNeuralNetworkSequenceComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema, prefix):
        super(EBNeuralNetworkSequenceComponent, self).__init__(schema, prefix)
        self.schema = schema
        self.subComponent = plugins.createNeuralNetworkComponent(self.schema['items'], prefix)
        self.lengthVariable = self.machineVariableName() + "__length__"
        self.itemExistenceVariable = self.machineVariableName() + "__exists__"

        self.parallelExecutor = concurrent.futures.ThreadPoolExecutor(max_workers=16)

    def convert_input_in(self, input):
        converted = {}

        # Add in the sequence lengths
        converted[self.lengthVariable + ":0"] = []

        # Add in the exists/doesn't exist flag
        converted[self.itemExistenceVariable + ":0"] = []

        longest = 0
        # Find the longest sequence
        for sampleIndex in range(len(input)):
            sequence = input[sampleIndex]
            if self.schema['configuration']['component']['enforceSequenceLengthLimit']:
                length = min(self.schema['configuration']['component']['maxSequenceLength'], len(sequence))
            else:
                length = len(sequence)
            converted[self.lengthVariable + ":0"].append(length)
            longest = max(longest, length)

        # combine each of the inputs
        for itemIndex in range(longest):
            converted[self.itemExistenceVariable + ":0"].append([])
            item = []
            for sampleIndex in range(len(input)):
                sequence = input[sampleIndex]
                if len(sequence) > itemIndex:
                    item.append(sequence[itemIndex])
                    converted[self.itemExistenceVariable + ":0"][itemIndex].append([1])
                else:
                    item.append(None)
                    converted[self.itemExistenceVariable + ":0"][itemIndex].append([0])

            convertedItem = self.subComponent.convert_input_in(item)
            for key in convertedItem:
                array = convertedItem[key]
                if key not in converted:
                    # Create a larger array with a higher dimension
                    converted[key] = numpy.zeros([longest] + list(array.shape))
                converted[key][itemIndex] = array

        return converted

    def convert_output_in(self, output):
        converted = {}

        # Add in the sequence lengths
        converted[self.lengthVariable + ":0"] = []

        # Add in the exists/doesn't exist flag
        converted[self.itemExistenceVariable + ":0"] = []

        longest = 0
        # Find the longest sequence
        for sampleIndex in range(len(output)):
            sequence = output[sampleIndex]
            if self.schema['configuration']['component']['enforceSequenceLengthLimit']:
                length = min(self.schema['configuration']['component']['maxSequenceLength'], len(sequence))
            else:
                length = len(sequence)
            converted[self.lengthVariable + ":0"].append(length)
            longest = max(longest, length)

        # combine each of the outputs
        for itemIndex in range(longest):
            converted[self.itemExistenceVariable + ":0"].append([])
            item = []
            for sampleIndex in range(len(output)):
                sequence = output[sampleIndex]
                if len(sequence) > itemIndex:
                    item.append(sequence[itemIndex])
                    converted[self.itemExistenceVariable + ":0"][itemIndex].append([1])
                else:
                    item.append(None)
                    converted[self.itemExistenceVariable + ":0"][itemIndex].append([0])

            convertedItem = self.subComponent.convert_output_in(item)
            for key in convertedItem:
                array = convertedItem[key]
                if key not in converted:
                    # Create a larger array with a higher dimension
                    converted[key] = numpy.zeros([longest] + list(array.shape))
                converted[key][itemIndex] = array

        return converted


    def convert_output_out(self, outputs, inputs):
        outputKeys = []
        for key in outputs.keys():
            if key.startswith(self.machineVariableName()):
                outputKeys.append(key)

        timeObjects = []

        # Get the existence variable
        itemExists = outputs[self.itemExistenceVariable]

        # For each output we have a multi-dimensional tensor with time
        # as the top dimension so separate each of the items.
        for key in outputKeys:
            length = outputs[key].shape[0]
            for index in range(length):
                if len(timeObjects) <= index:
                    timeObjects.append({})
                timeObjects[index][key] = outputs[key][index]

        # Parallel compute all items in the sequence - needed mostly for word-vector outputs, for which it can be expensive to compute
        # the nearest neighbor computations
        allBatchItems = list(self.parallelExecutor.map(lambda timeIndex: self.subComponent.convert_output_out(timeObjects[timeIndex], inputs), range(len(timeObjects)) ))
        objects = []
        for timeIndex in range(len(timeObjects)):
            batchItems = allBatchItems[timeIndex]
            for batchIndex in range(len(batchItems)):
                if len(objects) <= batchIndex:
                    objects.append([])
                if itemExists[timeIndex][batchIndex] > 0.5:
                    objects[batchIndex].append(batchItems[batchIndex])

        return objects

    def get_input_placeholders(self, extraDimensions):
        placeholders = self.subComponent.get_input_placeholders(extraDimensions + 1)
        placeholders[self.lengthVariable] = tf.placeholder(tf.int32, name = self.lengthVariable, shape = ([None] * extraDimensions))
        placeholders[self.itemExistenceVariable] = tf.placeholder(tf.int32, name = self.itemExistenceVariable, shape = ([None] * extraDimensions) + [None, 1])
        return placeholders

    def get_output_placeholders(self, extraDimensions):
        placeholders = self.subComponent.get_output_placeholders(extraDimensions + 1)
        placeholders[self.lengthVariable] = tf.placeholder(tf.int32, name = self.lengthVariable, shape = ([None] * extraDimensions))
        placeholders[self.itemExistenceVariable] = tf.placeholder(tf.int32, name = self.itemExistenceVariable, shape = ([None] * extraDimensions) + [None, 1])
        return placeholders

    def get_input_stack(self, placeholders):
        # Find each of the placeholders for variables that exist underneath this sequence
        subPlaceholderKeys = []
        subPlaceholders = []
        for key in placeholders:
            if key.startswith(self.machineVariableName()) and (key != self.lengthVariable):
                subPlaceholderKeys.append(key)
                subPlaceholders.append(placeholders[key])

        mappedSubShapes = []

        allFields = self.schema.allFields()

        def subInputStack(items):
            subOutputs, subShapes = self.subComponent.get_input_stack({subPlaceholderKeys[i]: items[i] for i in range(len(items))})
            mappedSubShapes.extend(subShapes)
            return subOutputs

        mappedSubOutputs = tf.map_fn(subInputStack, subPlaceholders, dtype=[tf.float32]*len(allFields))

        mergedTensor = None
        if len(mappedSubOutputs) > 1:
            # Now join together all of the different sub elements
            mergedTensor = tf.concat(mappedSubOutputs, -1)
        else:
            mergedTensor = mappedSubOutputs[0]

        # Get the sequence lengths tensor
        sequenceLengths = placeholders[self.lengthVariable]

        # Generate the neural network provided from the UI
        outputLayer, outputSize = generateEditorNetwork(self.schema['configuration']['component']['layers'], mergedTensor, {"sequenceLengths": sequenceLengths})

        # Create the shape of the output
        outputShape = EBTensorShape(["*", "*", outputSize], [EBTensorShape.Time, EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )

        return ([outputLayer], [outputShape])

    def get_output_stack(self, intermediates, intermediateShapes, inputs):
        # Figure out which of the intermediates correspond to this sequence.
        sequenceToProcess = None
        sequenceItemExists = None
        for shapeIndex in range(len(intermediateShapes)):
            if intermediateShapes[shapeIndex].variableName == (self.machineVariableName().replace("output", "input")):
                sequenceToProcess = intermediates[shapeIndex]
                sequenceItemExists = inputs[self.itemExistenceVariable.replace("output", "input")]

        # Remove time dimension from the intermediateShapes
        shapesToProcess = [shape.popDimension() for shape in intermediateShapes]

        if sequenceToProcess is None:
            # Summarize the tensors being currently activated
            summaryNode = createSummaryModule(intermediates, intermediateShapes)

            # This is a generative model - we must generate the sequence.
            generativeCell = tf.contrib.rnn.MultiRNNCell([
                tf.contrib.rnn.LSTMCell(300),
                tf.contrib.rnn.LSTMCell(300)], state_is_tuple=True)

            # Maximum size for time dimension
            if self.schema['configuration']['component']['enforceSequenceLengthLimit']:
                maximumTime = min(self.schema['configuration']['component']['maxSequenceLength'], len(sequence))
            else:
                maximumTime = 25 # Default to 25

            # Fetch batch size
            batchSize = tf.shape(summaryNode)[0]

            # Create all the state vectors
            initialStates = []
            stateShapes = []
            for layerStateSize in generativeCell.state_size:
                # If layerStateSize is a tuple, then generate a state for each
                if hasattr(layerStateSize, "__getitem__"):
                    for stateSize in layerStateSize:
                        initialStates.append(tf.zeros([batchSize, stateSize]))
                        stateShapes.append(tf.TensorShape([None, stateSize]))
                else:
                    initialStates.append(tf.zeros([batchSize, layerStateSize]))
                    stateShapes.append(tf.TensorShape([None, layerStateSize]))

            # Initial 'item exists' state
            initialItemExists = tf.ones([1, batchSize, 1])

            # Initial 'output' state
            initialOutput = tf.zeros([1, batchSize, generativeCell.output_size])

            # Initial index
            initialIndex = tf.zeros([], dtype=tf.int32)

            # Condition for the while loop - decides when to stop generating items in the sequence
            def condition(index, itemExists, lstmOutput, *lstmStates):
                return tf.logical_and(tf.less(index, tf.constant(maximumTime)), tf.greater(tf.reduce_sum(tf.round(itemExists[-1])), 0))

            # Body of the generator
            def body(index, itemExists, lstmOutput, *lstmStates):
                stateIndex = 0
                stateInputs = []

                # Separate lstmStates into tuples to be fed into each layer
                for layerStateSize in generativeCell.state_size:
                    # If layerStateSize is a tuple, then we have to construct a tuple from the lstm states
                    if hasattr(layerStateSize, "__getitem__"):
                        stateList = lstmStates[stateIndex:(stateIndex + len(layerStateSize))]
                        stateInputs.append(tuple(stateList))
                        stateIndex += len(layerStateSize)
                    else:
                        stateInputs.append(lstmStates[stateIndex])
                        stateIndex += 1

                # Execute the core RNN cell
                output, newStates = generativeCell(summaryNode, stateInputs)

                # Now deconstruct the new-states (again)
                separatedNewStates = []
                for layerStateIndex in range(len(generativeCell.state_size)):
                    layerStateSize = generativeCell.state_size[layerStateIndex]
                    if hasattr(layerStateSize, "__getitem__"):
                        separatedNewStates.extend(newStates[layerStateIndex])
                    else:
                        separatedNewStates.append(newStates[layerStateIndex])

                currentItemExists = tf.expand_dims(tf.layers.dense(output, 1), axis = 0)
                currentLSTMOutput = tf.expand_dims(output, axis = 0)

                newItemExists = tf.concat([itemExists, currentItemExists], axis = 0)
                newLSTMOutput = tf.concat([lstmOutput, currentLSTMOutput], axis = 0)

                newIndex = index + 1

                return [newIndex, newItemExists, newLSTMOutput] + separatedNewStates

            outputs = tf.while_loop(condition, body, [initialIndex, initialItemExists, initialOutput] + initialStates, shape_invariants=[tf.TensorShape([]), tf.TensorShape([None, None, 1]), tf.TensorShape([None, None, generativeCell.output_size])] + stateShapes)

            sequenceItemExists = outputs[1][1:]
            sequenceToProcess = outputs[2][1:]

            shapesToProcess = [EBTensorShape(["*", generativeCell.output_size], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )]

        subShapes = {}
        outputKeys = []
        def subStack(item):
            localOutputs, localShapes = self.subComponent.get_output_stack([item[0]], shapesToProcess, inputs)
            subShapes.update(localShapes)
            outputKeys.extend(localOutputs.keys())
            return list(localOutputs.values())

        # Individual outputs
        subOutputArray = tf.map_fn(subStack, [sequenceToProcess], dtype=[tf.float32, tf.float32])

        subOutputs = {outputKeys[index]: subOutputArray[index] for index in range(len(subOutputArray))}

        # Remap subShapes to add the time dimension to each shape
        subShapes = {key: subShapes[key].pushDimension("*", EBTensorShape.Time) for key in subShapes.keys()}

        # Add in the item existence outputs
        subOutputs[self.itemExistenceVariable] = sequenceItemExists
        subShapes[self.itemExistenceVariable] = EBTensorShape(["*", "*", 1], [EBTensorShape.Time, EBTensorShape.Batch, EBTensorShape.Data], self.itemExistenceVariable)

        # Return the sub outputs
        return (subOutputs, subShapes)


    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        # Find each of the placeholders for variables that exist underneath this sequence
        outputKeys = []
        for key in outputs.keys():
            if key.startswith(self.machineVariableName()) and (key != self.lengthVariable) and (key != self.itemExistenceVariable):
                outputKeys.append(key)

        losses = []

        def subStack(values):
            # Remove the time dimension from all output shapes
            outputs = {outputKeys[index]: values[index] for index in range(len(outputKeys))}
            shapes = {outputKeys[index]: outputShapes[outputKeys[index]].popDimension() for index in range(len(outputKeys))}
            placeholders = {outputKeys[index]: values[index + len(outputKeys)] for index in range(len(outputKeys))}

            losses = self.subComponent.get_criterion_stack(outputs, shapes, placeholders)

            return losses + losses

        batchSize = tf.shape(outputs[outputKeys[0]])[1]
        actualLength = tf.shape(outputs[outputKeys[0]])[0]
        placeholderLength = tf.shape(outputPlaceholders[outputKeys[0]])[0]
        cutoff = tf.minimum(actualLength, placeholderLength)

        def truncateTensor(tensor):
            return tf.slice(tensor, [0] * tensor.shape.ndims, [cutoff] + [-1] * (tensor.shape.ndims - 1))

        tensorsToMap = [truncateTensor(outputs[key]) for key in outputKeys] + [truncateTensor(outputPlaceholders[key]) for key in outputKeys]

        # Map both the network outputs and the actual outputs, and apply the sub-stacks to them
        subLosses = tf.map_fn(subStack, tensorsToMap, dtype=[tf.float32] * len(outputKeys))

        # Remove half of the sub-losses
        subLosses = subLosses[:len(outputKeys)]

        # Get the existence variable
        actualExistenceVariable = outputs[self.itemExistenceVariable]
        expectedExistenceVariable = outputPlaceholders[self.itemExistenceVariable]

        def existenceSubStack(values):
            loss = tf.losses.mean_squared_error(values[1], values[0])
            return [loss, loss]

        # Change the expectedExistenceVariable so that its the same length as actualExistenceVariable
        expectedExistenceVariable = tf.slice(expectedExistenceVariable, [0, 0, 0], [cutoff, -1, -1])
        extras = tf.maximum(0, actualLength - placeholderLength)
        expectedExistenceVariable = tf.concat([expectedExistenceVariable, tf.zeros([extras, batchSize, 1], dtype = tf.int32)], axis=0)

        # Calculate the loss for item existence - this ensures that the neural network learns to output the right sequence length
        existenceLoss = tf.map_fn(existenceSubStack, [tf.to_float(actualExistenceVariable), tf.to_float(expectedExistenceVariable)])

        return subLosses + [existenceLoss]





