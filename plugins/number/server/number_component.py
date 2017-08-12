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
from utils import eprint
from editor import generateEditorNetwork
import numpy

class EBNeuralNetworkNumberComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema, prefix):
        super(EBNeuralNetworkNumberComponent, self).__init__(schema, prefix)
        self.schema = schema

    def convert_input_in(self, input):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array([(0 if value is None else value) for value in input])
        return converted

    def convert_output_in(self, output):
        converted = {}
        converted[self.machineVariableName() + ":0"] = numpy.array([(0 if value is None else value) for value in output])
        return converted

    def convert_output_out(self, outputs, inputs):
        output = outputs[self.machineVariableName()]
        converted = []
        for x in range(len(output)):
            converted.append(float(output[x][0]))
        return converted

    def get_input_placeholders(self, extraDimensions):
        placeholders = {}
        placeholders[self.machineVariableName()] = tf.placeholder(tf.float32, name = self.machineVariableName(), shape = ([None] * extraDimensions) + [])
        return placeholders

    def get_output_placeholders(self, extraDimensions):
        placeholders = {}
        placeholders[self.machineVariableName()] = tf.placeholder(tf.float32, name = self.machineVariableName(), shape = ([None] * extraDimensions) + [])
        return placeholders

    def get_input_stack(self, placeholders):
        input = placeholders[self.machineVariableName()]
        return ([input], [EBTensorShape(["*", 1], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )])

    def get_output_stack(self, intermediates, shapes, inputs):
        # Summarize the tensors being currently activated
        summaryNode = createSummaryModule(intermediates, shapes)

        # Generate the neural network provided from the UI
        outputLayer, outputSize = generateEditorNetwork(self.schema['configuration']['component']['layers'], summaryNode, {"outputSize": 1})

        outputs = {self.machineVariableName(): outputLayer}
        outputShapes = {self.machineVariableName(): EBTensorShape(["*", 1], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName())}
        return (outputs, outputShapes)

    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        output = outputs[self.machineVariableName()]
        placeholder = outputPlaceholders[self.machineVariableName()]
        loss = tf.losses.mean_squared_error(tf.expand_dims(placeholder, 1), output)
        return [loss]






