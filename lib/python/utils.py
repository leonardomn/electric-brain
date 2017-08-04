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
#
# Elements taken from https://stackoverflow.com/questions/38260113/implementing-contrastive-loss-and-triplet-loss-in-tensorflow/38270293
#
#

import tensorflow as tf
from electricbrain import eprint

def compute_contrastive_loss(left_feature, right_feature, label, margin):
    """
    Compute the contrastive loss as in

    L = 0.5 * Y * D^2 + 0.5 * (Y-1) * {max(0, margin - D)}^2

    **Parameters**
     left_feature: First element of the pair
     right_feature: Second element of the pair
     label: Label of the pair (0 or 1)
     margin: Contrastive margin

    **Returns**
     Return the loss operation

    """

    d = tf.reduce_sum(tf.square(tf.subtract(left_feature, right_feature)), 1)
    d_sqrt = tf.sqrt(d)
    losses = label * tf.square(tf.maximum(0.0, margin - d_sqrt)) + (1 - label) * d
    return losses
