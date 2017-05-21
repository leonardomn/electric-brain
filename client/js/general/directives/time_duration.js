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

/**
 * The collection list is an element that allows you to view the list of tables/collections that are contained within a database
 */
angular.module('eb').directive('ebTimeDuration', function ebTimeDuration($timeout)
{
    const controller = function($scope)
    {
        $scope.text = "";
        $scope.$watch('seconds', function(newValue, oldValue)
        {
            if (newValue)
            {
                const totalSeconds = Math.round(newValue);

                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = Math.floor(totalSeconds % 60);

                if (hours > 0)
                {
                    $scope.text = `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} min${minutes > 1 ? 's' : ''}, ${seconds} sec${seconds > 1 ? 's' : ''}`;
                }
                else if (minutes > 0)
                {
                    $scope.text = `${minutes} min${minutes > 1 ? 's' : ''}, ${seconds} sec${seconds > 1 ? 's' : ''}`;
                }
                else
                {
                    $scope.text = `${seconds} sec${seconds > 1 ? 's' : ''}`;
                }
            }
        });
    };

    return {
        templateUrl: "views/general/directives/time_duration.html",
        controller,
        restrict: "E",
        scope: {
            seconds: '='
        }
    };
});
