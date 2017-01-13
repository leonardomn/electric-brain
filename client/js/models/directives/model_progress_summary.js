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
 * This element is used to provide a quick summary of a model that is currently training
 */
angular.module('eb').directive('ebModelProgressSummary', function ebModelProgressSummary(EBModelService, $timeout, $state)
{
    return {
        controller($scope)
        {
            $scope.$watch('model', function(newValue)
            {
                const chartData = EBModelService.computeChartDataForModel($scope.model, 'accuracy');

                $scope.accuracyChartData = [{
                    label: "Data 1",
                    data: chartData.map(function(dataPoint)
                    {
                        return [dataPoint.x, dataPoint.y];
                    }),
                    color: '#0086d1'
                }];
            });

            $scope.graphClicked = function graphClicked()
            {
                $state.go('view_model', {id: $scope.model._id});
            };

            $scope.headerClicked = function headerClicked()
            {
                $state.go('view_model', {id: $scope.model._id});
            };


            $scope.accuracyChartOptions = {
                xaxis: {
                    tickDecimals: 0
                },
                yaxis: {
                    min: 0,
                    max: 100
                },
                series: {
                    lines: {
                        show: true,
                        fill: true,
                        fillColor: {
                            colors: [{
                                opacity: 1
                            }, {
                                opacity: 1
                            }]
                        }
                    },
                    points: {
                        width: 0.1,
                        show: false
                    }
                },
                grid: {
                    show: false,
                    borderWidth: 0
                },
                legend: {
                    show: false
                }
            };
        },
        templateUrl: "views/models/directives/model_progress_summary.html",
        restrict: "E",
        scope: {
            model: '='
        }
    };
});
