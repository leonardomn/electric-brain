#!/usr/bin/env luajit
-- Global dependencies
local cjson = require('cjson')

-- This function is used to transform an object. You can do whatever you like with the object.
--
-- Note that all binary data will be encoded as a base64 string.
--
-- @param {table} object The object that to be transformed
-- @returns {table} The new, transformed object.
function transform(object)
    --
    -- This is where you do something with the object to change it.
    --
    -- For debugging purposes, you can always write to standard error
    --
    -- io.stderr:write(cjson.encode(object))

    -- Return the transformed object
    return object
end

-- This is the main loop which communicates with the manager process.
-- You should generally not need to modify this.
function main()
    -- Version information. You can set this to whatever you like.
    local version = '0.0.1'
    local name = 'transformation.lua'

    -- This is a convenience function to send a message to the manager process
    local sendResponse = function(response)
        io.write(cjson.encode(response) .. "\n")
        io.flush()
    end

    -- Now start waiting for data from standard input
    repeat
        local commandString = io.read("*line")
        local command = cjson.decode(commandString)
        if command then
            -- The 'handshake' message is sent by the manager process as soon
            -- as the script starts. Its just used to establish basic information
            -- about the script before it begins transforming objects.
            if command.type == "handshake" then
                sendResponse({
                    type = "handshake",
                    version = version,
                    name = name
                })
            -- The 'transform' message is the main message. You are provided an
            -- object, and expected to send back the transformed version.
            elseif command.type == "transform" then
                -- Transform the object
                local transformedObject = transform(command.object)

                -- Send the response with the transformed object
                sendResponse({
                    type = 'result',
                    value = transformedObject
                })
            end

        end
    until false == true -- Repeat forever.
end

-- Run the main function
main()
