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
from electricbrain import EBTensorShape

class EBNeuralNetworkNumberComponent:
    def __init__(self, schema):
        self.schema = schema

    def convert_input(self, input):
        pass

    def convert_output(self, output):
        pass

    def get_input_stack(self):
        variableName = self.schema["metadata"]['variablePath']
        input = tf.placeholder(tf.float32, name = variableName)
        return ([input], [input], [EBTensorShape([1], ["data"], variableName )])

    def get_output_stack(inputs, self):
        # Since we have these input tensors, we must construct a multi layer perceptron from it
        layer1 = tf.contrib.layers.fully_connected(inputs, 300)
        activation1 = tf.nn.elu(layer1)
        layer2 = tf.contrib.layers.fully_connected(activation1, 300)
        activation2 = tf.nn.elu(layer2)
        layer3 = tf.contrib.layers.fully_connected(activation2, 300)
        activation3 = tf.nn.elu(layer3)

        return (activation3)







