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
import numpy

class EBNeuralNetworkClassificationComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema):
        super(EBNeuralNetworkClassificationComponent, self).__init__(schema)
        self.schema = schema

    def convert_input_in(self, input):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array(input)
        return converted

    def convert_output_in(self, output):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array(output)
        return converted

    def convert_output_out(self, outputs):
        converted = []
        for x in range(len(outputs)):
            index = numpy.argmax(outputs[x])
            converted.append(int(index))
        return converted

    def get_placeholders(self):
        placeholders = {}
        placeholders[self.machineVariableName()] = tf.placeholder(tf.int32, name = self.machineVariableName())
        return placeholders

    def get_input_stack(self, placeholders):
        # Output size
        outputSize = len(self.schema["enum"])
        input = placeholders[self.machineVariableName()]
        embedding = tf.one_hot(input, outputSize)
        return ([input], [embedding], [EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName())])

    def get_output_stack(self, inputs, shapes):
        # Output size
        outputSize = len(self.schema["enum"])

        # Summarize the tensors being currently activated
        summaryNode = createSummaryModule(inputs, shapes)

        # Since we have these input tensors, we must construct a multi layer perceptron from it
        layer1 = tf.contrib.layers.fully_connected(summaryNode, 300, activation_fn=tf.nn.elu)
        layer2 = tf.contrib.layers.fully_connected(layer1, 300, activation_fn=tf.nn.elu)
        layer3 = tf.contrib.layers.fully_connected(layer2, outputSize, activation_fn=tf.nn.elu)
        return ([layer3], [EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], "output")])


    def get_criterion_stack(self, output, outputShape):
        placeholder = tf.placeholder(tf.int32, name = self.machineVariableName())
        embedding = tf.contrib.layers.one_hot_encoding(placeholder, len(self.schema['enum']))
        losses = tf.nn.softmax_cross_entropy_with_logits(labels=embedding, logits=output, dim=1)
        loss = tf.reduce_mean(losses)
        return ([placeholder], [loss])






