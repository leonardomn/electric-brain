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
from utils import eprint, tensorPrint
from editor import generateEditorNetwork
import numpy
import sqlite3
import sys
import sklearn.neighbors
import concurrent.futures

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

        self.parallelExecutor = concurrent.futures.ThreadPoolExecutor(max_workers=16)

        self.maximumEmbeddings = 10000

    @classmethod
    def initializeVectorTree(cls):
        if hasattr(cls, "wordVectorTree"):
            return
        else:
            cls.wordVectorDictionary = {}
            cls.inverseWordVectorDictionary = {}
            cls.wordTensors = []

            cls.vectorDB = sqlite3.connect(sys.argv[1])
            cur = cls.vectorDB.cursor().execute("SELECT tensor,word FROM word_vectors", [])

            index = 0
            while True:
                tensorBytes = cur.fetchone()
                if tensorBytes is None:
                    break
                tensor = numpy.fromstring(tensorBytes[0])
                word = tensorBytes[1]

                cls.wordVectorDictionary[word] = index
                cls.inverseWordVectorDictionary[index] = word
                cls.wordTensors.append(tensor)
                index += 1

            cls.wordVectorTree = sklearn.neighbors.BallTree(cls.wordTensors, leaf_size=100)

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

        converted = {}
        converted[self.wordVectorsPlaceholderName] = []
        converted[self.embeddingIndexPlaceholderName] = []

        for index in range(len(output)):
            word = output[index]
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

    def convert_output_out(self, outputs, inputs):
        EBNeuralNetworkWordComponent.initializeVectorTree()

        output = outputs[self.wordVectorsVariableName]

        def getWord(vector):
            distances, indexes = EBNeuralNetworkWordComponent.wordVectorTree.query([vector], k=1)
            return EBNeuralNetworkWordComponent.inverseWordVectorDictionary[indexes[0][0]]

        words = list(self.parallelExecutor.map(getWord, output))

        return words


    def get_input_placeholders(self, extraDimensions):
        placeholders = {}

        placeholders[self.wordVectorsVariableName] = tf.placeholder(tf.float32, name = self.wordVectorsVariableName, shape = ([None] * extraDimensions) + [300])
        placeholders[self.embeddingIndexVariableName] = tf.placeholder(tf.int32, name = self.embeddingIndexVariableName, shape = ([None] * extraDimensions) + [])

        return placeholders

    def get_output_placeholders(self, extraDimensions):
        placeholders = {}

        placeholders[self.wordVectorsVariableName] = tf.placeholder(tf.float32, name = self.wordVectorsVariableName, shape = ([None] * extraDimensions) + [300])
        placeholders[self.embeddingIndexVariableName] = tf.placeholder(tf.int32, name = self.embeddingIndexVariableName, shape = ([None] * extraDimensions) + [])

        return placeholders

    def get_input_stack(self, placeholders):
        wordVectors = placeholders[self.wordVectorsPlaceholderName]
        embeddingIndexes = placeholders[self.embeddingIndexPlaceholderName]

        # Create a large tensor to be used for learned embedding lookups
        with tf.variable_scope(self.machineVariableName()):
            learnedEmbeddings = tf.get_variable("embeddings", dtype = tf.float32, shape=[self.maximumEmbeddings,300])

            def handleWordItem(items):
                wordVector = items[0]
                embeddingIndex = items[1]

                output = tf.cond(tf.equal(embeddingIndex, -1), lambda: wordVector, lambda: learnedEmbeddings[embeddingIndex])
                return [output, output]

            output = tf.map_fn(handleWordItem, [wordVectors, embeddingIndexes])[0]

            return ([output], [EBTensorShape(["*", 300], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName() )])

    def get_output_stack(self, intermediates, shapes, inputs):
        # Set the output size at 300, which is fixed because
        # of the word vector dictionary
        outputSize = 300

        # Summarize the tensors being currently activated
        summaryNode = createSummaryModule(intermediates, shapes)

        # Generate the neural network provided from the UI
        outputLayer, outputSize = generateEditorNetwork(self.schema['configuration']['component']['layers'], summaryNode, {"outputSize": outputSize})

        # Now, we compute output distance against all active embeddings

        outputs = {
            self.wordVectorsVariableName: outputLayer,
            self.embeddingIndexVariableName: tf.zeros_like(outputLayer)
        }
        outputShapes = {
            self.wordVectorsVariableName: EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName()),
            self.embeddingIndexVariableName: EBTensorShape(["*", outputSize], [EBTensorShape.Batch, EBTensorShape.Data], self.machineVariableName())
        }

        return (outputs, outputShapes)


    def get_criterion_stack(self, outputs, outputShapes, outputPlaceholders):
        output = outputs[self.wordVectorsVariableName]
        wordVectorPlaceholder = outputPlaceholders[self.wordVectorsVariableName]
        embeddingIndexPlaceholder = outputPlaceholders[self.embeddingIndexVariableName]

        with tf.variable_scope(self.machineVariableName()):
            learnedEmbeddings = tf.get_variable("embeddings", dtype = tf.float32, shape=[self.maximumEmbeddings,300])

            def handleWordItem(items):
                wordVector = items[0]
                embeddingIndex = items[1]

                output = tf.cond(tf.equal(embeddingIndex, -1), lambda: wordVector, lambda: learnedEmbeddings[embeddingIndex])
                return [output, output]

            vectorsForComparison = tf.map_fn(handleWordItem, [wordVectorPlaceholder, embeddingIndexPlaceholder])[0]

            vectorsForComparison = tensorPrint('vectorsForComparison', vectorsForComparison)
            output = tensorPrint('output', output)

            # Mean squared error on the output vectors.
            loss = tf.losses.mean_squared_error(output, vectorsForComparison)

            return [loss]



