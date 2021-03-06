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


class EBTensorShape:
    def __init__(self, dimensionSizes, dimensionNames, variableName):
        self.dimensionSizes = dimensionSizes
        self.dimensionNames = dimensionNames
        self.variableName = variableName

    def pushDimension(self, size, name):
        """ Returns a new EBTensorShape object with an additional dimension added to the front,
            e.g. a new zeroth dimension. """
        newDimensionSizes = [size] + self.dimensionSizes
        newDimensionNames = [name] + self.dimensionNames
        return EBTensorShape(newDimensionSizes, newDimensionNames, self.variableName)

    def popDimension(self):
        """ Returns a new EBTensorShape object with the front dimension removed"""
        newDimensionSizes = self.dimensionSizes[1:]
        newDimensionNames = self.dimensionNames[1:]
        return EBTensorShape(newDimensionSizes, newDimensionNames, self.variableName)

    def __str__(self):
        string = "EBTensorShape("
        for x in range(len(self.dimensionSizes)):
            string += str(self.dimensionNames[x]) + ":" + str(self.dimensionSizes[x]) + " "
        string += ")"
        return string

    def __repr__(self):
        string = "EBTensorShape("
        for x in range(len(self.dimensionSizes)):
            string += str(self.dimensionNames[x]) + ":" + str(self.dimensionSizes[x]) + " "
        string += ")"
        return string

    # Define some standard dimension names - these have special behaviour.
    Data = "data"
    Batch = "batch"
    Time = "time"



def createSummaryModule(inputTensors, inputShapes):
    reshapeNodes = []
    totalSize = 0

    for tensorN in range(len(inputShapes)):
        # If there are any variable dimensions in the input-shape, then sum along that dimension
        shape = inputShapes[tensorN]

        current = inputTensors[tensorN]
        summarizedSize = 1
        for dimen in range(len(shape.dimensionSizes)):
            size = shape.dimensionSizes[dimen]
            name = shape.dimensionNames[dimen]

            if name != EBTensorShape.Batch:
                if size == '*':
                    current = tf.reduce_sum(current, axis=dimen, keep_dims=True)
                else:
                    summarizedSize = summarizedSize * size

        reshaped = tf.reshape(tensor = current, shape=[-1, summarizedSize])
        reshapeNodes.append(reshaped)
        totalSize += summarizedSize
    summary = tf.concat(reshapeNodes, 1)
    return summary



