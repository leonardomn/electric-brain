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

def contrastive_loss(primary, secondary, label, margin):
    """This function computes the contrastive loss using the L1 Norm."""

    d = tf.norm(tf.subtract(primary, secondary), ord = 1, axis = 1)
    differentPortion = label * tf.maximum(0.0, margin - d)
    samePortion = (1 - label) * d
    losses = differentPortion + samePortion
    return losses
