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

const beaver = require('beaver');
const registry = require('./task_registry').registry;

const EBTrainModelTask = require("./EBTrainModelTask");

/**
 * This function initializes all of the Beaver tasks for Electric Brain
 *
 * @param {EBApplication} application This is a reference to the root EBApplication object
 */
function setupTasks(application)
{
    function wrapTaskClass()
    {
        return function(args, callback)
        {
            const task = new EBTrainModelTask(application);
            task.run(this, args, callback);
        };
    }

    registry.registerTask({
        name: "train_model",
        timeout: null, // no timeout. This can take forever.
        concurrencyPerWorker: 1,
        maximumAttempts: 2,
        func: wrapTaskClass(EBTrainModelTask)
    });
}


module.exports = {
    queue: require('./task_registry').queue,
    setupTasks: setupTasks
};
