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
from utils import eprint

loaded = False

class EBNeuralNetworkComponentBase:
    def __init__(self, schema, prefix):
        self.schema = schema
        self.prefix = prefix

    def machineVariableName(self):
        return self.prefix + self.schema["metadata"]['variablePath'].replace("[]", "__array__").replace(" ", "")


def createNeuralNetworkComponent(schema, prefix):
    """ This function creates a new neural network component object for the given schema """
    from object_component import EBNeuralNetworkObjectComponent
    from number_component import EBNeuralNetworkNumberComponent
    from classification_component import EBNeuralNetworkClassificationComponent
    from sequence_component import EBNeuralNetworkSequenceComponent
    from word_component import EBNeuralNetworkWordComponent

    if "enum" in schema:
        return EBNeuralNetworkClassificationComponent(schema, prefix)
    elif schema["type"][0] == 'object':
        return EBNeuralNetworkObjectComponent(schema, prefix)
    elif schema["type"][0] == 'number':
        return EBNeuralNetworkNumberComponent(schema, prefix)
    elif schema["type"][0] == 'array':
        return EBNeuralNetworkSequenceComponent(schema, prefix)
    elif schema["type"][0] == 'string':
        return EBNeuralNetworkWordComponent(schema, prefix)
    else:
        raise Exception("Unrecognized schema type " + str(schema["type"]) + " on variable " + str(schema["metadata"]['variablePath']))

