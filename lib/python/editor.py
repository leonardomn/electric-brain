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
from electricbrain import eprint

def generateEditorNetwork(layers, input, templateVars):
    def getValue(layer, variable):
        value = layer[variable]
        if value in templateVars:
            return templateVars[value]
        else:
            return value

    currentOutputSize = None
    current = input
    for layerIndex in range(len(layers)):
        layer = layers[layerIndex]
        if layer['name'] == 'sigmoid':
            current = tf.nn.sigmoid(current)
        elif layer['name'] == 'tanh':
            current = tf.nn.tanh(current)
        elif layer['name'] == 'elu':
            current = tf.nn.elu(current)
        elif layer['name'] == 'softplus':
            current = tf.nn.softplus(current)
        elif layer['name'] == 'softsign':
            current = tf.nn.softsign(current)
        elif layer['name'] == 'relu':
            current = tf.nn.relu(current)
        elif layer['name'] == 'relu6':
            current = tf.nn.relu(current)
        elif layer['name'] == 'crelu':
            current = tf.nn.crelu(current)
        elif layer['name'] == 'dropout':
            current = tf.nn.dropout(current, keep_prob = getValue(layer, 'keep_prob'))
        elif layer['name'] == 'dense':
            current = tf.layers.dense(current, units = getValue(layer, 'units'))
            currentOutputSize = getValue(layer, 'units')
        elif layer['name'] == 'bidirectional_lstm':
            rnnHiddenSize = int(getValue(layer, 'outputSize'))
            with tf.variable_scope('forward' + str(layerIndex)):
                forwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)
            with tf.variable_scope('backward' + str(layerIndex)):
                backwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)
            with tf.variable_scope('layer'+ str(layerIndex)):
                output, state = tf.nn.bidirectional_dynamic_rnn(forwardCell, backwardCell, current, dtype=tf.float32, time_major = True, sequence_length = templateVars['sequenceLengths'])
            currentOutputSize = rnnHiddenSize * 2
            current = tf.concat(output, axis = 2)
        elif layer['name'] == 'lstm':
            rnnHiddenSize = int(getValue(layer, 'outputSize'))
            with tf.variable_scope('layer'+ str(layerIndex)):
                #forwardCell = tf.nn.rnn_cell.LSTMCell(rnnHiddenSize, state_is_tuple=True)
                #output, state = tf.nn.dynamic_rnn(forwardCell, current, dtype=tf.float32, time_major = True, sequence_length = templateVars['sequenceLengths'])
                output, state = tf.contrib.rnn.LSTMBlockFusedCell(rnnHiddenSize)(current, dtype=tf.float32)
            currentOutputSize = rnnHiddenSize
            current = output
        elif layer['name'] == 'bidirectional_gru':
            rnnHiddenSize = int(getValue(layer, 'outputSize'))
            with tf.variable_scope('forward' + str(layerIndex)):
                forwardCell = tf.nn.rnn_cell.GRUCell(rnnHiddenSize, state_is_tuple=True)
            with tf.variable_scope('backward' + str(layerIndex)):
                backwardCell = tf.nn.rnn_cell.GRUCell(rnnHiddenSize, state_is_tuple=True)
            with tf.variable_scope('layer'+ str(layerIndex)):
                output, state = tf.nn.bidirectional_dynamic_rnn(forwardCell, backwardCell, current, dtype=tf.float32, time_major = True, sequence_length = templateVars['sequenceLengths'])
            currentOutputSize = rnnHiddenSize * 2
            current = tf.concat(output, axis = 2)
        elif layer['name'] == 'gru':
            rnnHiddenSize = int(getValue(layer, 'outputSize'))
            with tf.variable_scope('layer'+ str(layerIndex)):
                forwardCell = tf.nn.rnn_cell.GRUCell(rnnHiddenSize, state_is_tuple=True)
                output, state = tf.nn.dynamic_rnn(forwardCell, current, dtype=tf.float32, time_major = True, sequence_length = templateVars['sequenceLengths'])
            currentOutputSize = rnnHiddenSize
            current = output
        else:
            eprint("Unknown layer type: " + layer['name'])

    return current, currentOutputSize





