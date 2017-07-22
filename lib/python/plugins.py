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

loaded = False

def createNeuralNetworkComponent(schema):
    """ This function creates a new neural network component object for the given schema """
    from electricbrain.object_component import EBNeuralNetworkObjectComponent
    from electricbrain.number_component import EBNeuralNetworkNumberComponent

    if schema["type"][0] == 'object':
        return EBNeuralNetworkObjectComponent(schema)
    elif schema["type"][0] == 'number':
        return EBNeuralNetworkNumberComponent(schema)
    else:
        raise Exception("Unrecognized schema type " + str(schema["type"]) + " on variable " + str(schema["metadata"]['variablePath']))

