#!/usr/bin/env python3

import sys
sys.path.insert(0, '..')

import json
import fileinput
import sys
import tensorflow as tf
import numpy
from object_component import EBNeuralNetworkObjectComponent
from utils import eprint
from schema import EBSchema
from adamax import AdamaxOptimizer

class TrainingScript:
    def __init__(self):
        self.session = None

    def initializeGraph(self, inputSchema, outputSchema):
        self.inputSchema = inputSchema
        self.outputSchema = outputSchema

        # Create components for each object
        self.inputComponent = EBNeuralNetworkObjectComponent(inputSchema, "input")
        self.outputComponent = EBNeuralNetworkObjectComponent(outputSchema, "output")

        # First, get all the placeholders for the sub-components
        inputPlaceholders = self.inputComponent.get_input_placeholders(1)
        outputPlaceholders = self.outputComponent.get_output_placeholders(1)

        intermediateOutputs, intermediateShapes = self.inputComponent.get_input_stack(inputPlaceholders)

        outputOutputs, outputShapes = self.outputComponent.get_output_stack(intermediateOutputs, intermediateShapes, inputPlaceholders)

        outputLosses = self.outputComponent.get_criterion_stack(outputOutputs, outputShapes, outputPlaceholders)

        self.inputPlaceholders = inputPlaceholders
        self.outputs = outputOutputs
        self.outputPlaceholders = outputPlaceholders
        self.outputLosses = outputLosses

        self.totalLoss = tf.reduce_mean([tf.reduce_mean(loss) for loss in self.outputLosses])

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


    def prepareInputBatch(self, objects, filename):
        converted = self.inputComponent.convert_input_in(objects)
        numpy.savez(filename, **converted)

    def prepareOutputBatch(self, objects, filename):
        converted = self.outputComponent.convert_output_in(objects)
        numpy.savez(filename, **converted)

    def iteration(self, inputFileName, outputFileName):
        input = dict(numpy.load(inputFileName))
        output = dict(numpy.load(outputFileName))

        feedDict = {}
        feedDict.update(input)
        feedDict.update(output)

        evaluations = [self.totalLoss, self.outputs, self.trainingStep]

        if self.allSummaryOutputs is not None:
            evaluations.append(self.allSummaryOutputs)

        evalTuple = self.session.run(evaluations, feed_dict = feedDict)

        totalLoss = evalTuple[0]
        outputs = evalTuple[1]

        outputs = self.outputComponent.convert_output_out(outputs, input)

        return float(totalLoss), outputs

    def evaluate(self, input):
        feedDict = {}
        feedDict.update(input)
        outputs = self.session.run([self.outputs], feed_dict = feedDict)[0]
        outputs = self.outputComponent.convert_output_out(outputs, input)
        return outputs

    def evaluateBatchFile(self, batchFileName):
        input = dict(numpy.load(batchFileName))
        return self.evaluate(input)

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
                inputSchema = EBSchema(data["inputSchema"])
                outputSchema = EBSchema(data["outputSchema"])

                results = self.initializeGraph(inputSchema, outputSchema)

                response["type"] = "initialized"
            elif (data["type"] == 'iteration'):
                totalLoss, outputs = self.iteration(data["inputBatchFilename"], data["outputBatchFilename"])

                response["type"] = "iterationCompleted"
                response["loss"] = totalLoss
                response["objects"] = outputs
            elif (data["type"] == 'reset'):
                self.reset(data["optimizationAlgorithm"], data["optimizationParameters"])
                response["type"] = "resetCompleted"
            elif (data["type"] == 'prepareInputBatch'):
                self.prepareInputBatch(data["samples"], data["fileName"])
                response["fileName"] = data["fileName"]
                response["type"] = "batchInputPrepared"
            elif (data["type"] == 'prepareOutputBatch'):
                self.prepareOutputBatch(data["samples"], data["fileName"])
                response["fileName"] = data["fileName"]
                response["type"] = "batchOutputPrepared"
            elif (data["type"] == 'evaluate'):
                input = self.inputComponent.convert_input_in(data["samples"])
                outputs = self.evaluate(input)
                response["type"] = "evaluationCompleted"
                response["objects"] = outputs
            elif (data["type"] == 'evaluateBatch'):
                outputs = self.evaluateBatchFile(data["batchFilename"])

                response["type"] = "evaluationCompleted"
                response["objects"] = outputs
            elif (data["type"] == 'save'):
                if self.session is None:
                    self.reset("AdadeltaOptimizer", {})

                saver = tf.train.Saver()
                saver.save(self.session, "model.tfg")

                response["type"] = "saved"
            elif (data["type"] == 'load'):
                if self.session is None:
                    self.reset("AdadeltaOptimizer", {})

                saver = tf.train.Saver()
                saver.restore(self.session, "model.tfg")

                tf.set_random_seed(565)
                response["type"] = "loaded"

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    script = TrainingScript()
    script.main()
