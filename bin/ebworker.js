#!/usr/bin/env node

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
    EBApplication = require("../server/EBApplication"),
    async = require("async"),
    util = require('util');

/**
 * This script starts the an electric brain worker
 *
 * @param {function(err)} done callback after the server has started
 *
 */
module.exports = function main(done)
{
    console.log(`Initializing the Electric Brain worker. Please stand by...`);
    
    const application = new EBApplication();
    async.series([
        application.initializeDatabase.bind(application),
        application.initializeBackgroundTask.bind(application),
        application.runWorker.bind(application),
        application.runScheduler.bind(application)
    ], function(err)
    {
        if (err)
        {
            console.error("Electric Brain Worker failed to start!");
            return done(err);
        }
        else
        {
            console.log(`Electric Brain Worker 0.0.1 started.`);
            console.log(`We will now process tasks from the queue.`);
            return done(null);
        }
    });
};


if (require.main === module)
{
    module.exports(function(err)
    {
        if (err)
        {
            console.error(util.inspect(err));
            process.exit(1);
        }
    });
}
