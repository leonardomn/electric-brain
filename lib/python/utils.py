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

def eprint(*args, **kwargs):
    import sys
    import pprint
    import traceback
    import re

    caller = traceback.format_list(traceback.extract_stack())[-2]
    filename = caller.split("\"")[1].split("/")[-1]
    lineNumber = re.search('line (\\d+)', caller).group(1)
    message = filename + ":" + lineNumber + "  " + " ".join([pprint.pformat(arg) for arg in args])
    print(message, file = sys.stderr)
    sys.stderr.flush()

def tensorPrint(name, tensor, *args):
    return tf.Print(tensor, [name, "shape:", tf.shape(tensor), "data:", tensor] + list(args), summarize = 1000)
