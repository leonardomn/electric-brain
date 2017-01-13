#!/usr/bin/env node
"use strict";

/**
 * This function is used to transform the given object. You can do whatever you like to the object.
 *
 * Note! All binary information will be encoded as a base64 string
 *
 * @param {object} object The object to be transformed
 * @param {function(error, transformedObject)} callback A callback function. You must provide the transformed
 *                                                      object, or provide an error if you experienced an error
 *                                                      during transformation.
 */
module.exports.transform = function transform(object, callback)
{
    // You can modify the object here. If you need to write a log message for debug purposes,
    // you can use console.error()
    // console.error(object);
    callback(null, object);
};


/**
 * This is the main entry point of the script. You should generally not need to modify this - it is used
 * to communicate with the manager process.
 *
 * The management process communicates with the script by a very simple message passing interface.
 * Each 'message' is a JSON-encoded object, followed by a single new-line character.
 */
module.exports.main = function main()
{
    // Version information. You can set this to whatever you like.
    const name = 'transformation.js';
    const version = '0.0.1';
    
    // Exit codes
    const invalidJSONExitCode = 1;
    const invalidMessageTypeExitCode = 2;
    
    // Dependencies.
    const readline = require('readline');

    // Create the line-by-line interface.
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Create the event handler for each line
    rl.on('line', function(line)
    {
        // Decode the JSON object on the line
        try
        {
            const message = JSON.parse(line);
            let response = null;
            // The handshake message is sent is as soon as the process starts up.
            // It is used just for name and version information so that the manager
            // process can identify it easily.
            if (message.type === 'handshake')
            {
                response = {
                    type: 'handshake',
                    name: name,
                    version: version
                };
            }
            // Transform messages are the main message. You are provided an object, and expected
            // to send back a 'result' message with its transformed version
            else if (message.type === 'transform')
            {
                module.exports.transform(message.object, function(err, transformedObject)
                {
                    if (err)
                    {
                        console.error("Error while transforming object: ");
                        console.error(err);
                        response = {
                            type: 'result',
                            value: null
                        };
                    }
                    else
                    {
                        response = {
                            type: 'result',
                            value: transformedObject
                        };
                    }
                });
            }
            else
            {
                console.error(`Unrecognized message type: ${message.type}`);
                process.exit(invalidMessageTypeExitCode);
            }
            
            if (response)
            {
                process.stdout.write(`${JSON.stringify(response)}\n`);
            }
        }
        catch (err)
        {
            // For whatever reason, the manager process sent us invalid
            // json. The only safe thing to do at this point is exit -
            // we have no idea whats going on.
            console.error(`Invalid JSON received in custom transformation script: ${err.toString()}`);
            process.exit(invalidJSONExitCode);
        }
    });
};

/**
 * If we are calling this script directly as a script (as opposed to loading it as a
 * dependency), then run the main function.
 */
if (require.main === module)
{
    module.exports.main();
}
