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
import sys

class EBNeuralNetworkWordComponent(EBNeuralNetworkComponentBase):
    def __init__(self, schema, prefix):
        super(EBNeuralNetworkWordComponent, self).__init__(schema, prefix)
        self.schema = schema

        self.vectorDB = sqlite3.connect(sys.argv[1])

        self.wordVectorsVariableName = self.machineVariableName() + "_wordVectors"
        self.embeddingIndexVariableName = self.machineVariableName() + "_embeddingIndex"

        self.wordVectorsPlaceholderName = self.wordVectorsVariableName + ":0"
        self.embeddingIndexPlaceholderName = self.embeddingIndexVariableName + ":0"

        self.embeddingDictionary = {}
        self.currentEmbeddingIndex = 0

    def convert_input_in(self, input):
        cur = self.vectorDB.cursor()

        converted = {}
        converted[self.wordVectorsPlaceholderName] = []
        converted[self.embeddingIndexPlaceholderName] = []

        for index in range(len(input)):
            word = input[index]
            if word is None:
                converted[self.wordVectorsPlaceholderName].append([0] * 300)
                converted[self.embeddingIndexPlaceholderName].append(-1)
            else:
                tensorBytes = cur.execute("SELECT tensor FROM word_vectors WHERE word = ?", [word]).fetchone()
                if tensorBytes is None:
                    converted[self.wordVectorsPlaceholderName].append([0] * 300)
                    if not word in self.embeddingDictionary:
                        self.embeddingDictionary[word] = self.currentEmbeddingIndex
                        self.currentEmbeddingIndex += 1

                    converted[self.embeddingIndexPlaceholderName].append(self.embeddingDictionary[word])
                else:
                    tensor = numpy.fromstring(tensorBytes[0])
                    converted[self.wordVectorsPlaceholderName].append(tensor)
                    converted[self.embeddingIndexPlaceholderName].append(-1)

        converted[self.wordVectorsPlaceholderName] = numpy.array(converted[self.wordVectorsPlaceholderName])
        converted[self.embeddingIndexPlaceholderName] = numpy.array(converted[self.embeddingIndexPlaceholderName])

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
        raise Exception("Unimplemented")

    def get_input_placeholders(self, extraDimensions):
        placeholders = {}

        placeholders[self.wordVectorsPlaceholderName] = tf.placeholder(tf.float32, name = self.wordVectorsVariableName, shape = ([None] * extraDimensions) + [300])
        placeholders[self.embeddingIndexPlaceholderName] = tf.placeholder(tf.int32, name = self.embeddingIndexVariableName, shape = ([None] * extraDimensions) + [])

        return placeholders

    def get_output_placeholders(self, extraDimensions):
        placeholders = {}

        placeholders[self.wordVectorsPlaceholderName] = tf.placeholder(tf.float32, name = self.wordVectorsVariableName, shape = ([None] * extraDimensions) + [300])
        placeholders[self.embeddingIndexPlaceholderName] = tf.placeholder(tf.int32, name = self.embeddingIndexVariableName, shape = ([None] * extraDimensions) + [])

        return placeholders

    def get_input_stack(self, placeholders):
        wordVectors = placeholders[self.wordVectorsPlaceholderName]
        embeddingIndexes = placeholders[self.embeddingIndexPlaceholderName]

        # Create a large tensor to be used for learned embedding lookups
        with tf.variable_scope(self.machineVariableName()):
            learnedEmbeddings = tf.get_variable("embeddings", dtype = tf.float32, shape=[10000,300])

            def handleWordItem(items):
                wordVector = items[0]
                embeddingIndex = items[1]

                output = tf.cond(tf.equal(embeddingIndex, -1), lambda: wordVector, lambda: learnedEmbeddings[embeddingIndex])
                return [output, output]

            output = tf.map_fn(handleWordItem, [wordVectors, embeddingIndexes])[0]

            return ([output], [EBTensorShape(["*", 300], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )])


    def get_output_stack(self, inputs, shapes):
        raise Exception("Unimplemented")

    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        raise Exception("Unimplemented")




