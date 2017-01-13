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
 * This is general purpose module which allows the use to put together database queries.
 */
angular.module('eb').directive('ebBasicListElement', function($timeout)
{
    const controller = function($scope, $element, $attrs)
    {
        $scope.$watch('selectedItem', function(newValue, oldValue)
        {
            if (newValue !== oldValue && newValue !== $scope.localSelectedItem)
            {
                $scope.localSelectedItem = newValue;
            }
        });

        $scope.selectItem = function selectItem(item)
        {
            // Store the selected item locally on this directive
            $scope.localSelectedItem = item;

            $timeout(function()
            {
                // Set the selected item for parent code, if we can
                if ($attrs.selectedItem)
                {
                    $scope.selectedItem = item;
                }
            });

            $timeout(function()
            {
                if ($scope.onItemSelected)
                {
                    $scope.$parent.$eval($scope.onItemSelected, {item: item});
                }
            });
        };
    };

    return {
        templateUrl: "views/general/directives/basic_list_element.html",
        controller,
        restrict: "E",
        scope: {
            items: "=",
            selectedItem: '=',
            onItemSelected: '@',
            showRadioSelection: '='
        }
    };
});
