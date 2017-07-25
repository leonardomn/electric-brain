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
        self.subComponent = electricbrain.plugins.createNeuralNetworkComponent(this.schema['items'])

    def convert_input_in(self, input):
        converted = []

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
                    item.append([])

            convertedItem = self.subComponent.convert_input_in(item)
            converted.append(convertedItem)
        return converted

    def convert_output_in(self, output):
        converted = []

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
                    item.append([])

            convertedItem = self.subComponent.convert_output_in(item)
            converted.append(convertedItem)
        return converted


    def convert_output_out(self, outputs):
        converted = []
        for x in range(len(outputs)):
            index = numpy.argmax(outputs[x])
            converted.append(int(index))
        return converted

    def get_placeholders(self):
        return self.subComponent.get_placeholders()

    def get_input_stack(self, placeholders):
        # Find each of the placeholders for variables that exist underneath this sequence
        subPlaceholders = []
        for key in placeholders:
            if key.startswith(self.machineVariableName()):
                subPlaceholders.append(key)

        # Create modified placeholders, where each variable has been mapped along
        # the time dimension
        modifiedInputs = []
        subOutputs


        subPlaceHolders, subOutputs, subShapes = self.subComponent.get_input_stack(batchSize)

        splitSubOutputs = []

        # Take each sub-output, and create a time dimension
        for index in range(len(subOutputs)):
            # Get the batch size of the input. Batch is always the first dimension
            batchSize = tf.shape(subPlaceHolders[index])[0]

            # Split the inputs into batch-size chunks, resulting in a time dimension on the top.
            splitSubOutput = tf.stack(tf.split(subPlaceHolders[index], batchSize))

            splitSubOutputs.append(splitSubOutput)

        # Now join together all of the different sub elements
        mergedTensor = tf.concat(splitSubOutputs, -1)

        # Now run the input through a double layered, bidirectional LSTM
        layer1 = tf.contrib.rnn.LSTMBlockFusedCell(300)(mergedTensor)
        layer2 = tf.contrib.rnn.LSTMBlockFusedCell(300)(layer1)

        # Create the shape of the output
        outputShape = EBTensorShape(["*", "*", 300], [EBTensorShape.Time, EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )

        return (subPlaceHolders, [layer2], [outputShape])

    def get_output_stack(self, inputs, shapes):
        # Figure out which of the inputs correspond to this sequence.
        origSequence = None
        for shapeIndex in range(len(shapes)):
            if shapes[shapeIndex].variableName == self.machineVariableName():
                origSequence = inputs[shapeIndex]

        if not origSequence:
            raise Exception("Electric Brain does not currently support generative models. Please stay tuned for the next version of EB.")

        subShapes = None
        def subStack(item):
            outputs, shapes = self.subComponent.get_output_stack(item, shapes)
            subShapes = shapes

        # Individual outputs
        subOutputs = tf.map_fn(subStack, origSequence)

        # Remap subShapes to add the time dimension to each shape
        subShapes = map(lambda shape: shape.pushDimension("*", EBTensorShape.Time))

        # Return the sub outputs
        return (subOutputs, subShapes)


    def get_criterion_stack(self, output, outputShape):
        pass








