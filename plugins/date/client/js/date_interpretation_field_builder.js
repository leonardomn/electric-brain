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
 * This directive provides the menu for configuring fields being interpreted as binary data.
 */
angular.module('eb').directive('ebDateInterpretationFieldBuilder', function ebDateInterpretationFieldBuilder($timeout)
{
    function controller($scope, $element, $attrs)
    {
        $scope.dateValue = new Date();
        $scope.timeValue = new Date();
        function updateObjectValue()
        {
            const dateMoment = moment.parseZone($scope.dateValue);
            const timeMoment = moment.parseZone($scope.timeValue);

            dateMoment.millisecond(timeMoment.millisecond());
            dateMoment.second(timeMoment.second());
            dateMoment.minute(timeMoment.minute());
            dateMoment.hour(timeMoment.hour());

            $scope.object[$scope.field.variableName] = dateMoment.toISOString();
        }


        $scope.$watch('dateValue', function(newValue, oldValue)
        {
            updateObjectValue();
        });

        $scope.$watch('timeValue', function(newValue, oldValue)
        {
            updateObjectValue();
        });
    }

    return {
        templateUrl: "/plugins/date/views/date_interpretation_field_builder.html",
        controller,
        restrict: "A",
        scope: {
            field: '=',
            object: '='
        }
    };
});
