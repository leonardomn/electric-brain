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

/*
 * Modify console.log so that it will print full objects, no matter how many layers of nesting
 */

var util = require('util');
var underscore = require('underscore');

module.exports.apply = function apply()
{
    console.regularLog = console.log;
    console.regularError = console.error;

    function getCallerInfo()
    {
        var err = new Error();
        var stack = err.stack;
        var callingFrame = err.stack.split("\n")[3];
        var callerInfo = callingFrame.substr(callingFrame.lastIndexOf("/") + 1);
        callerInfo = callerInfo.substr(0, callerInfo.lastIndexOf(":"));
        return callerInfo;
    }

    function logProto(regularLog)
    {
        return function()
        {
            // Create text which is appended to the start of each log statement
            var prefix = getCallerInfo();
            while(prefix.length < 30)
            {
                prefix = prefix + " ";
            }
            prefix = prefix + " - ";

            var args = underscore.map(underscore.toArray(arguments),
                function(arg)
                {
                    if(typeof(arg) == 'string')
                    {
                        return arg.replace(/\n/g, "\n"+prefix);
                    }
                    else if(typeof(arg) == 'number')
                    {
                        return arg;
                    }
                    else if(arg instanceof Error)
                    {
                        return arg.stack.toString().replace(/\n/g, "\n"+prefix);
                    }
                    else
                    {
                        return util.inspect(arg, {showHidden: true, depth: null}).toString().replace(/\n/g, "\n"+prefix);
                    }
                }
            );

            args = [prefix].concat(args);

            regularLog.apply(console, args);
        };
    }

    console.log = logProto(console.regularLog);
    console.error = logProto(console.regularError);
};