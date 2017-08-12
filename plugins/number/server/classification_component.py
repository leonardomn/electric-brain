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
from utils import eprint
import numpy

class EBNeuralNetworkClassificationComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema, prefix):
        super(EBNeuralNetworkClassificationComponent, self).__init__(schema, prefix)
        self.schema = schema

    def convert_input_in(self, input):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array([(-1 if value is None else value) for value in input])
        return converted

    def convert_output_in(self, output):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array([(-1 if value is None else value) for value in output])
        return converted

    def convert_output_out(self, outputs, inputs):
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

    def get_output_stack(self, intermediates, shapes, inputs):
        # Output size
        outputSize = len(self.schema["enum"])

        # Summarize the tensors being currently activated
        summaryNode = createSummaryModule(intermediates, shapes)

        # Generate the neural network provided from the UI
        outputLayer, outputSize = generateEditorNetwork(self.schema['configuration']['component']['layers'], summaryNode, {"outputSize": outputSize})

        outputs = {self.machineVariableName(): outputLayer}
        outputShapes = {self.machineVariableName(): EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName())}

        return (outputs, outputShapes)


    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        output = outputs[self.machineVariableName()]
        placeholder = outputPlaceholders[self.machineVariableName()]

        # If there is no value for the output, loss is 0
        def checkSingleValue(value):
            embedding = tf.one_hot(value[0], len(self.schema['enum']))
            mask = tf.sign(tf.reduce_max(tf.abs(embedding), 0))
            losses = tf.nn.softmax_cross_entropy_with_logits(labels=embedding, logits=value[1], dim=0) * mask
            return [tf.to_int32(losses)] + [losses]

        losses = tf.map_fn(checkSingleValue, [placeholder, output])[1]

        loss = tf.reduce_mean(losses)
        return [loss]






