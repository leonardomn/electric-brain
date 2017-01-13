#!/usr/bin/env python3

import json
import fileinput
import sys


def transform(data):
    """  This function is used to transform the given data. You can do whatever you like to the data. """
    # You can modify the data here. If you need to write a log message for debug purposes,
    # you can use sys.stderr.write
    # sys.stderr.write("Your error message");
    # data.field = 'transformed!'

    return data



def main():
    # my code here
    for line in sys.stdin:
        data = json.loads(line)

        response={}
        if (data["type"] == 'handshake'):
            response["type"] = "handshake"
            response["name"] = "transformation.py"
            response["version"] = "0.0.1"
        elif (data["type"] == 'transform'):
            try:
                response["type"] = "result"
                response["value"] = transform(data["object"])
            except:
                response["type"] = "result"
                response["value"] = None

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()