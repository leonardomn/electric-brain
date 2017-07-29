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
from electricbrain.editor import generateEditorNetwork
from electricbrain import eprint
import numpy

class EBNeuralNetworkClassificationComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema):
        super(EBNeuralNetworkClassificationComponent, self).__init__(schema)
        self.schema = schema

    def convert_input_in(self, input):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array([(-1 if value is None else value) for value in input])
        return converted

    def convert_output_in(self, output):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array([(-1 if value is None else value) for value in output])
        return converted

    def convert_output_out(self, outputs):
        output = outputs[self.machineVariableName()]
        converted = []
        for x in range(len(output)):
            index = numpy.argmax(output[x])
            converted.append(int(index))
        return converted

    def get_input_placeholders(self, extraDimensions):
        placeholders = {}
        placeholders[self.machineVariableName()] = tf.placeholder(tf.int32, name = self.machineVariableName(), shape = ([None] * extraDimensions) + [])
        return placeholders

    def get_output_placeholders(self, extraDimensions):
        placeholders = {}
        placeholders[self.machineVariableName()] = tf.placeholder(tf.int32, name = self.machineVariableName(), shape = ([None] * extraDimensions) + [])
        return placeholders

    def get_input_stack(self, placeholders):
        # Output size
        outputSize = len(self.schema["enum"])
        input = placeholders[self.machineVariableName()]
        embedding = tf.one_hot(input, outputSize)
        return ([embedding], [EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName())])

    def get_output_stack(self, inputs, shapes):
        # Output size
        outputSize = len(self.schema["enum"])

        # Summarize the tensors being currently activated
        summaryNode = createSummaryModule(inputs, shapes)

        # Generate the neural network provided from the UI
        outputLayer, outputSize = generateEditorNetwork(self.schema, summaryNode, {"outputSize": outputSize})

        outputs = {self.machineVariableName(): outputLayer}
        outputShapes = {self.machineVariableName(): EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName())}

        return (outputs, outputShapes)


    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        output = outputs[self.machineVariableName()]
        placeholder = outputPlaceholders[self.machineVariableName()]

        embedding = tf.contrib.layers.one_hot_encoding(placeholder, len(self.schema['enum']))
        losses = tf.nn.softmax_cross_entropy_with_logits(labels=embedding, logits=output, dim=1)
        loss = tf.reduce_mean(losses)
        return [loss]






