#!/usr/bin/env python3

import json
import fileinput
import sys
import tensorflow as tf
import numpy
from object_component import EBNeuralNetworkObjectComponent
from utils import eprint
import shape
import losses
from editor import generateEditorNetwork
from schema import EBSchema
from adamax import AdamaxOptimizer

class TrainingScript:
    def __init__(self):
        self.session = None

    def initializeGraph(self, primarySchema, secondarySchema, primaryFixedLayers, secondaryFixedLayers):
        self.primarySchema = primarySchema
        self.secondarySchema = secondarySchema

        # Create the primary and secondary components
        self.primaryComponent = EBNeuralNetworkObjectComponent(primarySchema, "primary")
        self.secondaryComponent = EBNeuralNetworkObjectComponent(secondarySchema, "secondary")

        # First, get all the placeholders for the sub-components
        primaryPlaceholders = self.primaryComponent.get_input_placeholders(1)
        secondaryPlaceholders = self.secondaryComponent.get_input_placeholders(1)

        # Construct the input stack for the two modules

        primaryOutputs, primaryShapes = self.primaryComponent.get_input_stack(primaryPlaceholders)
        secondaryOutputs, secondaryShapes = self.secondaryComponent.get_input_stack(secondaryPlaceholders)

        self.primaryPlaceholders = primaryPlaceholders
        self.secondaryPlaceholders = secondaryPlaceholders

        # Create a placeholder for the valences
        self.valencePlaceholder = tf.placeholder(tf.float32, name="valences")

        # Construct the loss function by comparing the outputs
        primarySummary = shape.createSummaryModule(primaryOutputs, primaryShapes)
        secondarySummary = shape.createSummaryModule(secondaryOutputs, secondaryShapes)

        # Generate the neural network provided from the UI
        self.primaryOutput, primaryOutputSize = generateEditorNetwork(primaryFixedLayers, primarySummary, {"outputSize": 200})
        self.secondaryOutput, secondaryOutputSize = generateEditorNetwork(secondaryFixedLayers, secondarySummary, {"outputSize": 200})

        # Convert valences from being -1 / 1 (where -1 is different and 1 is same), to being
        # Between 0 and 1, where 0 is same and 1 is different
        modifiedValences = (tf.negative(self.valencePlaceholder) + 1) / 2

        loss = losses.contrastive_loss(self.primaryOutput, self.secondaryOutput, modifiedValences, 14.0)

        self.totalLoss = tf.reduce_mean(loss)

    def reset(self, optimizationAlgorithm, optimizationParameters):
        if self.session is not None:
            self.session.close()

        self.session = tf.Session()

        self.optimizationAlgorithm = optimizationAlgorithm
        self.optimizationParameters = optimizationParameters

        if optimizationAlgorithm == 'AdamaxOptimizer':
            self.trainingStep = AdamaxOptimizer(**self.optimizationParameters).minimize(self.totalLoss)
        else:
            self.trainingStep = getattr(tf.train, optimizationAlgorithm)(**self.optimizationParameters).minimize(self.totalLoss)

        self.allSummaryOutputs = tf.summary.merge_all()
        train_writer = tf.summary.FileWriter('./logs', self.session.graph)

        self.session.run(tf.global_variables_initializer())

    def prepareBatch(self, primarySamples, secondarySamples, primaryIds, secondaryIds, valences, filename):
        converted = {}
        converted.update(self.primaryComponent.convert_input_in(primarySamples))
        converted.update(self.secondaryComponent.convert_input_in(secondarySamples))
        converted.update({"valences:0": numpy.array(valences)})
        converted.update({"primaryIds": primaryIds})
        converted.update({"secondaryIds": secondaryIds})

        numpy.savez(filename, **converted)

    def iteration(self, batchFileName):
        feedDict = dict(numpy.load(batchFileName))

        primaryIds = feedDict['primaryIds']
        secondaryIds = feedDict['secondaryIds']
        del feedDict['primaryIds']
        del feedDict['secondaryIds']

        evaluations = [self.totalLoss, self.primaryOutput, self.secondaryOutput, self.trainingStep]

        if self.allSummaryOutputs is not None:
            evaluations.append(self.allSummaryOutputs)

        evalTuple = self.session.run(evaluations, feed_dict = feedDict)

        totalLoss = evalTuple[0]

        primaryOutputs = numpy.ndarray.tolist(evalTuple[1])
        secondaryOutputs = numpy.ndarray.tolist(evalTuple[2])

        return float(totalLoss), primaryOutputs, primaryIds, secondaryOutputs, secondaryIds,

    def evaluateBatchFile(self, batchFileName):
        input = dict(numpy.load(batchFileName))

        primaryIds = input['primaryIds']
        secondaryIds = input['secondaryIds']
        del input['primaryIds']
        del input['secondaryIds']

        evaluations = [self.primaryOutput, self.secondaryOutput]

        evalTuple = self.session.run(evaluations, feed_dict = input)

        primaryOutputs = numpy.ndarray.tolist(evalTuple[0])
        secondaryOutputs = numpy.ndarray.tolist(evalTuple[1])

        return (primaryOutputs, primaryIds, secondaryOutputs, secondaryIds)

    def main(self):
        """  This is the main entry point of the training script."""
        for line in sys.stdin:
            data = json.loads(line)
            response={}
            if (data["type"] == 'handshake'):
                response["type"] = "handshake"
                response["name"] = "TrainingScript.py"
                response["version"] = "0.0.1"

            elif (data["type"] == 'initialize'):
                primarySchema = EBSchema(data["primarySchema"])
                secondarySchema = EBSchema(data["secondarySchema"])
                primaryLayers = data["primaryLayers"]
                secondaryLayers = data["secondaryLayers"]

                results = self.initializeGraph(primarySchema, secondarySchema, primaryLayers, secondaryLayers)

                response["type"] = "initialized"
            elif (data["type"] == 'iteration'):
                totalLoss, primaryOutputs, primaryIds, secondaryOutputs, secondaryIds = self.iteration(data["batchFilename"])

                response["primary"] = {}
                for index in range(len(primaryOutputs)):
                    response["primary"][primaryIds[index]] = primaryOutputs[index]

                response["secondary"] = {}
                for index in range(len(secondaryOutputs)):
                    response["secondary"][secondaryIds[index]] = secondaryOutputs[index]

                response["type"] = "iterationCompleted"
                response["loss"] = totalLoss
            elif (data["type"] == 'reset'):
                self.reset(data["optimizationAlgorithm"], data["optimizationParameters"])
                response["type"] = "resetCompleted"
            elif (data["type"] == 'prepareBatch'):
                self.prepareBatch(data["primarySamples"], data["secondarySamples"], data["primaryIds"], data["secondaryIds"], data["valences"], data["fileName"])

                response["fileName"] = data["fileName"]
                response["type"] = "batchPrepared"


            elif (data["type"] == 'evaluateBatch'):
                primaryOutputs, primaryIds, secondaryOutputs, secondaryIds = self.evaluateBatchFile(data["batchFilename"])

                response["primary"] = {}
                for index in range(len(primaryOutputs)):
                    response["primary"][primaryIds[index]] = primaryOutputs[index]

                response["secondary"] = {}
                for index in range(len(secondaryOutputs)):
                    response["secondary"][secondaryIds[index]] = secondaryOutputs[index]

                response["type"] = "evaluationCompleted"
            elif (data["type"] == 'save'):
                tf.train.export_meta_graph(filename="model.tfg")
                response["type"] = "saved"
            elif (data["type"] == 'load'):
                pass

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    script = TrainingScript()
    script.main()
