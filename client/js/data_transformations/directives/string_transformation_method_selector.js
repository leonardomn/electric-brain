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
angular.module('eb').directive('ebStringTransformationMethodSelector', function ebStringTransformationMethodSelector()
{
    return {
        controller($scope)
        {
            $scope.methods = [
                {
                    id: "character_by_character",
                    name: "Character by Character",
                    options: {}
                },
                {
                    id: "word_embedding",
                    name: "Word Embeddings",
                    options: {}
                },
                {
                    id: "sentiment_analysis",
                    name: "Sentiment Analysis",
                    options: {}
                }
            ];

            $scope.$watch('method', function(newValue)
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
                    $scope.method = _.findWhere($scope.methods, {id: newValue});
                }
            });
        },
        templateUrl: "views/data_transformations/directives/string_transformation_method_selector.html",
        restrict: "E",
        scope: {ngModel: "="}
    };
});
