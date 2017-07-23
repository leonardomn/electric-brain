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


class EBTensorShape:
    def __init__(self, dimensionSizes, dimensionNames, variableName):
        self.dimensionSizes = dimensionSizes
        self.dimensionNames = dimensionNames
        self.variableName = variableName



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
            if size == '*':
                current = tf.reduce_sum(current, axis=dimen, keep_dims=True)
            else:
                summarizedSize = summarizedSize * size

        reshaped = tf.reshape(tensor = current, shape=[-1, summarizedSize])
        reshapeNodes.append(reshaped)
        totalSize += summarizedSize
    summary = tf.concat(reshapeNodes, 1)
    return summary



