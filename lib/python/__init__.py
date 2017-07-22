
# This file exists to force this folder to be treated as a module

from electricbrain.shape import EBTensorShape


def eprint(*args, **kwargs):
    import sys
    import pprint
    import traceback
    import re

    caller = traceback.format_list(traceback.extract_stack())[-2]
    filename = caller.split("\"")[1].split("/")[-1]
    lineNumber = re.search('line (\\d\\d)', caller).group(1)
    message = filename + ":" + lineNumber + "  " + pprint.pformat(*args, **kwargs)
    print(message, file = sys.stderr)
    sys.stderr.flush()

