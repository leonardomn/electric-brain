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
 * This element is used to display EBValueHistogram objects in the interface
 */
angular.module('eb').directive('ebValueHistogram', function ebValueHistogram(EBDataSourceService, $timeout)
{
    return {
        controller($scope)
        {
            $scope.$watch('ngModel', function(newValue, oldValue)
            {
                if (newValue)
                {
                    $scope.chartConfig = {
                        options: {
                            chart: {type: 'column'},
                            tooltip: {
                                style: {
                                    padding: 10,
                                    fontWeight: 'bold'
                                }
                            },
                            plotOptions: {
                                column: {
                                    pointPadding: 0,
                                    borderWidth: 0,
                                    groupPadding: 0
                                }
                            },
                            yAxis: [{
                                title: {text: 'Frequency'},
                                min: 0
                            }]
                        },
                        series: [{
                            data: _.map($scope.ngModel.values.slice(0, 20), function(value)
                            {
                                return {
                                    name: value.value,
                                    y: value.frequency
                                };
                            }),
                            name: "histogram",
                            color: '#0086d1'
                        }],
                        title: {text: null},
                        xAxis: [{visible: false}],
                        size: {
                            height: $scope.height || 400
                        }
                    };
                }
            });
        },
        templateUrl: "views/schemas/directives/value_histogram.html",
        restrict: "E",
        scope: {
            ngModel: "=",
            height: "@"
        }
    };
});
