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
 * This element allows you to select a programming language
 */
angular.module('eb').directive('ebProgrammingLanguageSelector', function ebProgrammingLanguageSelector()
{
    return {
        controller($scope)
        {
            $scope.programmingLanguages = [
                {
                    id: "javascript",
                    title: "Javascript",
                    icon: "img/languages/javascript.svg"
                },
                {
                    id: "lua",
                    title: "Lua",
                    icon: "img/languages/lua.svg"
                },
                {
                    id: "r",
                    title: "R",
                    icon: "img/languages/r.svg"
                },
                {
                    id: "python",
                    title: "Python",
                    icon: "img/languages/python.svg"
                }
            ];

            $scope.$watch('language', function(newValue)
            {
                if (newValue)
                {
                    $scope.ngModel = newValue.id;
                }
            });

            $scope.$watch('ngModel', function(newValue)
            {
                if (newValue)
                {
                    $scope.language = _.findWhere($scope.programmingLanguages, {id: newValue});
                }
            });
        },
        templateUrl: "views/data_transformations/directives/programming_language_selector.html",
        restrict: "E",
        scope: {ngModel: "="}
    };
});
