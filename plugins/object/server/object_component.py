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

    def convert_input(self, input):
        pass

    def convert_output(self, output):
        pass

    def get_input_stack(self):
        # List of outputs from each sub variable
        placeholders = []
        outputs = []
        shapes = []

        eprint(self.schema["metadata"]["variableName"])

        # Create the input stack for each sub-variable in the schema
        for variableName in self.schema["properties"]:
            subSchema = self.schema["properties"][variableName]
            subComponent = electricbrain.plugins.createNeuralNetworkComponent(subSchema)
            subPlaceHolders, subOutputs, subShapes = subComponent.get_input_stack()
            placeholders.extend(subPlaceHolders)
            outputs.extend(subOutputs)
            shapes.extend(subShapes)

        return (placeholders, outputs, shapes)


    def get_output_stack(self):
        pass


