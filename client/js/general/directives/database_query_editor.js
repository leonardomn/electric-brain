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
angular.module('eb').directive('ebDatabaseQueryEditor', function()
{
    const controller = function($scope)
    {
        if (!$scope.depth)
        {
            $scope.depth = 1;
        }

        $scope.operators = [
            {name: 'AND'},
            {name: 'OR'}
        ];

        function loadFromExternalQuery()
        {
            // Make a copy of all the data in external query
            // into our internal query object
            if (!$scope.externalQuery)
            {
                $scope.query = {};
                $scope.externalQuery = {};
            }
            else
            {
                $scope.query = _.clone($scope.externalQuery);
            }

            if (!$scope.externalQuery.rules)
            {
                $scope.query.rules = [];
                $scope.externalQuery.rules = [];
            }
            else
            {
                $scope.query.rules = _.map($scope.externalQuery.rules, function(rule)
                {
                    return {
                        condition: rule.condition,
                        field: _.find($scope.fields, (field) => field.variablePath.slice(1) === rule.field),
                        data: rule.data
                    };
                });
            }

            if (!$scope.externalQuery.operator)
            {
                $scope.query.operator = 'AND';
                $scope.externalQuery.operator = 'AND';
            }
            else
            {
                $scope.query.operator = $scope.externalQuery.operator;
            }
        }

        $scope.$watch('schema', function(newValue)
        {
            if ($scope.schema)
            {
                $scope.fields = _.sortBy($scope.schema.topLevelFields, (field) => -field.metadata.ratio);
                loadFromExternalQuery();
            }
        });

        $scope.conditions = [
            {name: '='},
            {name: '<>'},
            {name: '<'},
            {name: '<='},
            {name: '>'},
            {name: '>='}
        ];

        $scope.addCondition = function()
        {
            $scope.query.rules.push({
                condition: '=',
                field: $scope.fields[0],
                data: ''
            });
        };

        $scope.removeCondition = function(index)
        {
            $scope.query.rules.splice(index, 1);
        };

        $scope.addSubQuery = function()
        {
            $scope.query.rules.push({
                query: {
                    operator: 'OR',
                    rules: []
                }
            });
        };

        $scope.removeSubQuery = function()
        {
            if ("query" in $scope.$parent)
            {
                $scope.$parent.query.rules.splice($scope.$parent.$index, 1);
            }
        };

        $scope.runClicked = function()
        {
            if ($scope.onRunClicked)
            {
                $scope.$eval($scope.onRunClicked);
            }
        };

        $scope.$watch('query', function(newValue)
        {
            if ($scope.query)
            {
                if (!$scope.externalQuery)
                {
                    $scope.externalQuery = {};
                }

                $scope.externalQuery.operator = $scope.query.operator;
                $scope.externalQuery.rules = $scope.query.rules.map(function(rule)
                {
                    if (rule.query)
                    {
                        return {query: rule.query};
                    }
                    else
                    {
                        return {
                            condition: rule.condition,
                            field: rule.field.variablePath.slice(1),
                            data: rule.data
                        };
                    }
                });
            }
        }, true);
    };

    return {
        templateUrl: "views/general/directives/database_query_editor.html",
        controller,
        restrict: "E",
        scope: {
            schema: '=',
            externalQuery: "=query",
            depth: '@',
            onRunClicked: '@'
        }
    };
});
