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
from electricbrain.shape import EBTensorShape, createSummaryModule
from electricbrain.plugins import EBNeuralNetworkComponentBase
from electricbrain import eprint
import electricbrain.plugins
import numpy

class EBNeuralNetworkSequenceComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema):
        super(EBNeuralNetworkSequenceComponent, self).__init__(schema)
        self.schema = schema
        self.subComponent = electricbrain.plugins.createNeuralNetworkComponent(self.schema['items'])

    def convert_input_in(self, input):
        converted = {}

        longest = 0
        # Find the longest sequence
        for sampleIndex in range(len(input)):
            sequence = input[sampleIndex]
            longest = max(len(sequence), longest)

        # combine each of the inputs
        for itemIndex in range(longest):
            item = []
            for sampleIndex in range(len(input)):
                sequence = input[sampleIndex]
                if len(sequence) > itemIndex:
                    item.append(sequence[itemIndex])
                else:
                    item.append(None)

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

        longest = 0
        # Find the longest sequence
        for sampleIndex in range(len(output)):
            sequence = output[sampleIndex]
            longest = max(len(sequence), longest)

        # combine each of the outputs
        for itemIndex in range(longest):
            item = []
            for sampleIndex in range(len(output)):
                sequence = output[sampleIndex]
                if len(sequence) > itemIndex:
                    item.append(sequence[itemIndex])
                else:
                    item.append(None)

            convertedItem = self.subComponent.convert_output_in(item)
            for key in convertedItem:
                array = convertedItem[key]
                if key not in converted:
                    # Create a larger array with a higher dimension
                    converted[key] = numpy.zeros([longest] + list(array.shape))
                converted[key][itemIndex] = array

        return converted


    def convert_output_out(self, outputs):
        outputKeys = []
        for key in outputs.keys():
            if key.startswith(self.machineVariableName()):
                outputKeys.append(key)

        timeObjects = []

        # For each output we have a multi-dimensional tensor with time
        # as the top dimension so separate each of the items.
        for key in outputKeys:
            length = outputs[key].shape[0]
            for index in range(length):
                if len(timeObjects) <= index:
                    timeObjects.append({})
                timeObjects[index][key] = outputs[key][index]

        objects = []
        for timeIndex in range(len(timeObjects)):
            batchItems = self.subComponent.convert_output_out(timeObjects[timeIndex])
            for batchIndex in range(len(batchItems)):
                if len(objects) <= batchIndex:
                    objects.append([])

                objects[batchIndex].append(batchItems[batchIndex])

        return objects

    def get_input_placeholders(self, extraDimensions):
        return self.subComponent.get_input_placeholders(extraDimensions + 1)

    def get_output_placeholders(self, extraDimensions):
        return self.subComponent.get_output_placeholders(extraDimensions + 1)

    def get_input_stack(self, placeholders):
        # Find each of the placeholders for variables that exist underneath this sequence
        subPlaceholderKeys = []
        subPlaceholders = []
        for key in placeholders:
            if key.startswith(self.machineVariableName()):
                subPlaceholderKeys.append(key)
                subPlaceholders.append(placeholders[key])

        mappedSubShapes = []

        def subInputStack(items):
            subOutputs, subShapes = self.subComponent.get_input_stack({subPlaceholderKeys[i]: items[i] for i in range(len(items))})
            mappedSubShapes.extend(subShapes)
            return subOutputs

        mappedSubOutputs = tf.map_fn(subInputStack, subPlaceholders, dtype=[tf.float32]*len(subPlaceholders))

        # Now join together all of the different sub elements
        mergedTensor = tf.concat(mappedSubOutputs, -1)

        # Transpose them so batch is the top dimension
        transposed = tf.transpose(mergedTensor, [1, 0, 2])

        rnnHiddenSize = 300
        layer1ForwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)
        layer1BackwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)
        layer2ForwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)
        layer2BackwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)

        # Create the rnn
        rnnOutput, outputStateFW, outputStateBW = tf.contrib.rnn.stack_bidirectional_dynamic_rnn([layer1ForwardCell, layer2ForwardCell], [layer1BackwardCell, layer2BackwardCell], transposed, dtype=tf.float32)

        # Create the shape of the output
        outputShape = EBTensorShape(["*", "*", 600], [EBTensorShape.Time, EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )

        # Transpose the output so the time dimension moves back to the top
        outputLayer = tf.transpose(rnnOutput, [1, 0, 2])

        return ([outputLayer], [outputShape])

    def get_output_stack(self, inputs, shapes):
        # Figure out which of the inputs correspond to this sequence.
        origSequence = None
        for shapeIndex in range(len(shapes)):
            if shapes[shapeIndex].variableName == self.machineVariableName():
                origSequence = inputs[shapeIndex]

        if origSequence is None:
            raise Exception("Electric Brain does not currently support generative models. Please stay tuned for the next version of EB.")

        subShapes = {}
        outputKeys = []
        def subStack(item):
            # Remove time dimension from the shapes
            newShapes = [shape.popDimension() for shape in shapes]
            localOutputs, localShapes = self.subComponent.get_output_stack([item], newShapes)
            subShapes.update(localShapes)
            outputKeys.extend(localOutputs.keys())
            return list(localOutputs.values())

        # Individual outputs
        subOutputArray = tf.map_fn(subStack, [origSequence])

        subOutputs = {outputKeys[index]: subOutputArray[index] for index in range(len(subOutputArray))}

        # Remap subShapes to add the time dimension to each shape
        subShapes = {key: subShapes[key].pushDimension("*", EBTensorShape.Time) for key in subShapes.keys()}

        # Return the sub outputs
        return (subOutputs, subShapes)


    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        # Find each of the placeholders for variables that exist underneath this sequence
        outputKeys = []
        for key in outputs.keys():
            if key.startswith(self.machineVariableName()):
                outputKeys.append(key)

        losses = []

        def subStack(values):
            # Remove the time dimension from all output shapes
            outputs = {outputKeys[index]: values[index] for index in range(len(outputKeys))}
            shapes = {outputKeys[index]: outputShapes[outputKeys[index]].popDimension() for index in range(len(outputKeys))}
            placeholders = {outputKeys[index]: values[index + len(outputKeys)] for index in range(len(outputKeys))}

            losses = self.subComponent.get_criterion_stack(outputs, shapes, placeholders)
            return losses + losses

        tensorsToMap = [outputs[key] for key in outputKeys] + [outputPlaceholders[key] for key in outputPlaceholders]


        # Map both the network outputs and the actual outputs, and apply the sub-stacks to them
        subLosses = tf.map_fn(subStack, tensorsToMap)

        # Remove half of the sub-losses
        subLosses = subLosses[:len(outputKeys)]

        return subLosses






