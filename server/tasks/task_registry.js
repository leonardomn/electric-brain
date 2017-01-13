/*
    Electric Brain is an easy to use platform for machine learning.
    Copyright (C) 2016 Electric Brain Software Corporation
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    
    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

"use strict";

const config = require('../config/config');
const beaver = require('beaver');

// Create our task registry. All taskRegistry should have explicit timeouts set.
const registry = new beaver.Registry({});
module.exports.registry = registry;

let socketio = null;
module.exports.initializeRealtimeTaskObservation = function(application, done)
{
    socketio = application.socketio;
    return done();
};

registry.registerHook("stderr", function(message, callback)
{
    console.log("task-stderr: ", message);
    return callback();
});

registry.registerHook("log", function(task, level, message, callback)
{
    console.log("task-log: ", message);
    return callback();
});

registry.registerHook("percentageComplete", function(task, percent, callback)
{
    console.log("task-percentageComplete: ", percent);
    return callback();
});

registry.registerHook("result", function(task, result, callback)
{
    console.log("task-result: ", result);
    return callback();
});

registry.registerHook("start", function(task, callback)
{
    console.log("task-start: ");
    return callback();
});

registry.registerHook("finish", function(task, callback)
{
    console.log("task-finish: ");
    return callback();
});

registry.registerHook("error", function(task, error, callback)
{
    console.log("task-error: ");
    return callback();
});

module.exports.queue = new beaver.AMQPQueue(registry, {
    url: config.amqp.url,
    prefix: "electricbrain"
});
