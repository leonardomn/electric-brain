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

import electricbrain.plugins
from electricbrain import eprint

class EBNeuralNetworkObjectComponent:
    def __init__(self, schema):
        self.schema = schema

    def convert_input_in(self, inputs):
        converted = {}

        # Convert each of the sub variables
        for variableName in self.schema["properties"]:
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)

            # Build up a list of the variables to be converted
            subValues = []
            for valueIndex in range(len(inputs)):
                subValues.append(inputs[valueIndex][variableName])

            subConverted = subComponent.convert_input_in(subValues)
            converted.update(subConverted)

        return converted

    def convert_output_in(self, outputs):
        converted = {}

        # Convert each of the sub variables
        for variableName in self.schema["properties"]:
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)

            # Build up a list of the variables to be converted
            subValues = []
            for valueIndex in range(len(outputs)):
                subValues.append(outputs[valueIndex][variableName])

            subConverted = subComponent.convert_output_in(subValues)
            converted.update(subConverted)

        return converted


    def convert_output_out(self, outputs):
        # Assemble together the output objects
        outputObjects = []

        # Convert the output for each sub variable
        keys = list(self.schema["properties"].keys())
        for variableIndex in range(len(keys)):
            variableName = keys[variableIndex]
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)

            variableOutput = outputs[variableIndex]

            separated = subComponent.convert_output_out(variableOutput)

            for objectIndex in range(len(separated)):
                if len(outputObjects) <= objectIndex:
                    outputObjects.append({})
                outputObjects[objectIndex][variableName] = separated[objectIndex]

        return outputObjects


    def get_input_stack(self):
        # List of outputs from each sub variable
        placeholders = []
        outputs = []
        shapes = []

        # Create the input stack for each sub-variable in the schema
        for variableName in self.schema["properties"]:
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)
            subPlaceHolders, subOutputs, subShapes = subComponent.get_input_stack()
            placeholders.extend(subPlaceHolders)
            outputs.extend(subOutputs)
            shapes.extend(subShapes)

        return (placeholders, outputs, shapes)


    def get_output_stack(self, inputTensors, inputShapes):
        # List of outputs from each sub variable
        outputs = []
        shapes = []

        # Create the output stack for each sub-variable in the schema
        for variableName in self.schema["properties"]:
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)
            subOutputs, subShapes = subComponent.get_output_stack(inputTensors, inputShapes)
            outputs.extend(subOutputs)
            shapes.extend(subShapes)

        return (outputs, shapes)

    def get_criterion_stack(self, outputs, outputShapes):
        # List of criterions from each sub variable
        placeholders = []
        losses = []

        # Create the criterion stack for each sub-variable
        keys = list(self.schema["properties"].keys())
        for variableIndex in range(len(keys)):
            variableName = keys[variableIndex]
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)

            output = outputs[variableIndex]
            outputShape = outputShapes[variableIndex]

            subPlaceholders, subLosses = subComponent.get_criterion_stack(output, outputShapes)
            placeholders.extend(subPlaceholders)
            losses.extend(subLosses)

        return (placeholders, losses)
