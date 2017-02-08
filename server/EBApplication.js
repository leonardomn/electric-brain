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

const
    beaver = require('beaver'),
    bodyParser = require('body-parser'),
    config = require("./config/config"),
    express = require("express"),
    EBDataSourcePluginDispatch = require("./components/datasource/EBDataSourcePluginDispatch"),
    EBCSVPlugin = require("./components/datasource/EBCSVPlugin"),
    EBMongoPlugin= require("./components/datasource/EBMongoplugin"),
    flattener = require('./middleware/flattener'),
    fs = require("fs"),
    http = require('http'),
    httpStatus = require('http-status-codes'),
    mongodb = require('mongodb'),
    path = require('path'),
    socketio = require('socket.io'),
    socketioAMQP = require("socket.io-amqp"),
    tasks = require("./tasks/tasks");

/**
 *  This class is the root application object, which represents the EB API server as a whole
 */
class EBApplication
{
    /**
     * Constructor for the application
     */
    constructor()
    {
        // Initialize each of the modules that we find in pages
        const polyfills = fs.readdirSync(`${__dirname}/../shared/polyfill`);
        polyfills.forEach(function(polyfillFilename)
        {
            require(`../shared/polyfill/${polyfillFilename}`);
        });

        // Initialize any mods
        const mods = fs.readdirSync(`${__dirname}/mods`);
        mods.forEach(function(modFilename)
        {
            require(`./mods/${modFilename}`).apply();
        });

        // Setup the global tasks with a reference to this application object
        tasks.setupTasks(this);
        
        // Set up the main data source plugin
        this.dataSourcePluginDispatch = new EBDataSourcePluginDispatch();
    }

    /**
     * Initializes the connection with the database
     *
     * @param {function(err)} done Callback after the database connection is ready
     */
    initializeDatabase(done)
    {
        const self = this;
        mongodb.MongoClient.connect(config.mongo.uri, function(err, db)
        {
            if (err)
            {
                return done(err);
            }
            else
            {
                self.db = db;
                self.dataSourcePluginDispatch.registerPlugin("csv", new EBCSVPlugin(self));
                self.dataSourcePluginDispatch.registerPlugin("mongo", new EBMongoPlugin(self));
                return done();
            }
        });
    }

    /**
     * Initializes background task processing using beaver
     *
     * @param {function(err)} done Callback after the database connection is ready
     */
    initializeBackgroundTask(done)
    {
        tasks.queue.initialize(function(err)
        {
            if (err)
            {
                return done(err);
            }
            else
            {
                return done();
            }
        });
    }

    /**
     * This method sets up socket.io
     *
     * @param {object} [server] Optional http server to attach the socket.io instance to
     * @param {function(err)} [server] Optional http server to attach the socket.io instance to
     */
    initializeSocketIO(server, callback)
    {
        const self = this;
        try
        {
            if (!server)
            {
                server = http.Server();
            }

            self.socketio = socketio(server);
            self.socketio.on('connection', function(socket)
            {
                console.log('a user connected');
                socket.join('general');
            });

            // Set up realtime to using RabbitMQ for publish-subscribe
            self.socketio.adapter(socketioAMQP(config.amqp.url, {prefix: 'electricbrain-'}));

            return callback();
        }
        catch (err)
        {
            return callback(err);
        }
    }

    /**
     * Starts the electric-brain http server for the API and frontend.
     *
     * @param {function(err)} done A function to be called once the server is ready and listening for http connections
     */
    runWebServer(done)
    {
        const self = this;
        const expressApplication = express();

        expressApplication.use(function(req, res, next)
        {
            if (req.headers['content-type'] && !req.headers['content-type'].startsWith('application/json') && !req.headers['content-type'].startsWith('application/offset+octet-stream'))
            {
                res.status(httpStatus.UNSUPPORTED_MEDIA_TYPE);
                res.send("Error: the only supported content type is application/json for API endpoints and application/offset+octet-stream for file uploads");
            }
            else
            {
                return next();
            }
        });

        expressApplication.use(bodyParser.json({
            inflate: true,
            limit: '1mb'
        }));

        expressApplication.use(flattener);

        // Initialize each of the modules that we find in pages
        const apis = fs.readdirSync(path.join(__dirname, "apis"));
        apis.forEach(function(apiFilename)
        {
            const APIClass = require(`./apis/${apiFilename}`);
            const api = new APIClass(self);
            api.setupEndpoints(expressApplication);
        });

        const server = http.createServer(expressApplication);
        self.initializeSocketIO(server, function(err)
        {
            if (err)
            {
                return done(err);
            }

            server.listen(config.api.port, function(err)
            {
                return done(err);
            });
        });
    }


    /**
     * This is the main entry point for workers
     *
     * @param {function} callback The exit callback after the worker has started
     */
    runWorker(callback)
    {
        const self = this;

        self.initializeSocketIO(null, function(err)
        {
            if (err)
            {
                return callback(err);
            }

            require('./tasks/task_registry').initializeRealtimeTaskObservation(self, function(err)
            {
                if (err)
                {
                    return callback(err);
                }

                const worker = new beaver.Worker(tasks.queue, {});
                tasks.queue.registerWorker(worker, function(err)
                {
                    if (err)
                    {
                        return callback(err);
                    }

                    return callback();
                });
            });
        });
    }


    /**
     * This runs the scheduler - which handles periodic, scheduled tasks
     *
     * @param {function} callback A callback after the scheduler has started
     * @returns {*} nothing
     */
    runScheduler(callback)
    {
        // Create the scheduler and start it
        const scheduler = new beaver.Scheduler(tasks.queue, {});
        scheduler.start();

        return callback();
    }
}


module.exports = EBApplication;
