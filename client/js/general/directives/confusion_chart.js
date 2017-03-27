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
 * This is general purpose module for showing confusion charts for continuous value predictions
 */
angular.module('eb').directive('ebConfusionChart', function($timeout)
{
    const controller = function($scope, $element, $attrs)
    {
        let data = [];

        $scope.ready = false;

        /**
         * Line Chart Options
         */
        $scope.chartOptions = {
            axisLabels: {
                show: true
            },
            xaxis: {
                show: true,
                axisLabel: "Expected"
            },
            yaxis: {
                show: true,
                axisLabel: "Actual"
            },
            colors: ["#0086d1"],
            grid: {
                color: "#999999",
                hoverable: true,
                clickable: true,
                tickColor: "#D4D4D4",
                borderWidth: 0
            },
            legend: {
                show: false
            },
            tooltip: true,
            tooltipOpts: {
                content: "x: %x, y: %y"
            }
        };

        /**
         * Line Chart Data
         */
        function recomputeData()
        {
            // First, we compute the lowest and highest actual value and predicted value
            const lowestActualValue = _.min($scope.ngModel.predictions, (prediction) => prediction.actualValue).actualValue || 0;
            const highestActualValue = _.max($scope.ngModel.predictions, (prediction) => prediction.actualValue).actualValue || 1;
            const lowestExpectedValue = _.min($scope.ngModel.predictions, (prediction) => prediction.expectedValue).expectedValue || 0;
            const highestExpectedValue = _.max($scope.ngModel.predictions, (prediction) => prediction.expectedValue).expectedValue || 1;

            const lowest = Math.min(lowestActualValue, lowestExpectedValue);
            const highest = Math.min(highestActualValue, highestExpectedValue);

            const graphStart = lowest - (Math.abs(lowest) * 0.1);
            const graphEnd = highest + (Math.abs(highest) * 0.1);

            // First, we create the "correct" line
            const correctLine = {
                label: "Truth",
                lines: {
                    show: true,
                    lineWidth: 2,
                    fill: true,
                    fillColor: {
                        colors: [
                            {
                                opacity: 0.0
                            },
                            {
                                opacity: 0.0
                            }
                        ]
                    }
                },
                data: [
                    [graphStart, graphStart],
                    [graphEnd, graphEnd]
                ]
            };

            // Then we draw the predictions
            const predictions = {
                label: "Predictions",
                points: {
                    show: true,
                    radius: 2,
                    fill: true,
                    symbol: "circle"
                },
                data: $scope.ngModel.predictions.map((prediction) => [prediction.expectedValue, prediction.actualValue])
            };

            $scope.chartData = [correctLine, predictions];

            if (predictions.data.length > 0)
            {
                $timeout(function()
                {
                    $scope.ready = true;
                }, 100);
            }
        }


        $scope.$watch('ngModel', function(newValue, oldValue)
        {
            if (newValue)
            {
                recomputeData();
            }
        }, true);
    };

    return {
        templateUrl: "views/general/directives/confusion_chart.html",
        controller,
        restrict: "E",
        scope: {
            ngModel: "="
        }
    };
});
