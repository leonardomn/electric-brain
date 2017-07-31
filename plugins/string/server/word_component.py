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
from electricbrain.editor import generateEditorNetwork
import numpy
import sqlite3

class EBNeuralNetworkWordComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema, prefix):
        super(EBNeuralNetworkWordComponent, self).__init__(schema, prefix)
        self.schema = schema
        self.vectorDB = sqlite3.connect('/home/bradley/eb/electric-brain/scripts/word_vectors.db')

    def convert_input_in(self, input):
        cur = self.vectorDB.cursor()
        converted = []
        for value in input:
            tensorBytes = cur.execute("SELECT tensor FROM word_vectors WHERE word = ?", )
            tensor = numpy.fromstring(tensorBytes)
            converted.append(value)

        return converted

    def convert_output_in(self, output):
        cur = self.vectorDB.cursor()
        converted = []
        for value in input:
            tensorBytes = cur.execute("SELECT tensor FROM word_vectors WHERE word = ?", )
            tensor = numpy.fromstring(tensorBytes)

            converted.append(value)

        return converted

    def convert_output_out(self, outputs, inputs):
        throw Exception("Unimplemented")

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

    def get_output_stack(self, inputs, shapes):
        # Summarize the tensors being currently activated
        summaryNode = createSummaryModule(inputs, shapes)

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






