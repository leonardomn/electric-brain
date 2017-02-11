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
 * Allows you to view the results associated with a specific field
 */
angular.module('eb').directive('ebSchemaFieldResults', function ebSchemaFieldResults($timeout)
{
    function controller($scope, $element, $attrs)
    {
        let data = [];
        
        const Color = net.brehaut.Color;
        
        function setupChart()
        {
            const allValues = _.sortBy($scope.field.metadata.statistics.valueHistogram.values.map((value) => value.value), (v) => v);
            $scope.confusionMatrixChartConfig = {
                options: {
                    chart: {type: 'heatmap'},
                    tooltip: {
                        style: {
                            padding: 10,
                            fontWeight: 'bold'
                        },
                        formatter: function()
                        {
                            return `E:${allValues[this.point.y]}  A:${allValues[this.point.x]}   ${this.point.value.toFixed(0)}%`;
                        }
                    },
                    legend: {
                        enabled: false
                    },
                    plotOptions: {
                        column: {
                            pointPadding: 0,
                            borderWidth: 0,
                            groupPadding: 0
                        }
                    },
                    xAxis: {
                        categories: allValues
                    },
                    yAxis: {
                        categories: allValues,
                        title: null
                    },
                    colorAxis: {
                        min: 0,
                        max: 100,
                        minColor: '#FFFFFF',
                        maxColor: '#1AB394',
                        visible: false
                    },
                },
                series: [{
                    name: "results",
                    data: data
                }],
                title: {text: null},
                size: {height: 600}
            };
        }

        function recomputeData()
        {
            const allValues = $scope.field.metadata.statistics.valueHistogram.values.map((value) => value.value);
            const matrix = [];

            allValues.forEach(function(expectedValue, expectedValueIndex)
            {
                // Find the expected value in the matrix
                let expectedValueResults = null;
                $scope.field.results.confusionMatrix.expectedValues.forEach(function(expectedValueObject)
                {
                    if (expectedValueObject.value === expectedValue)
                    {
                        expectedValueResults = expectedValueObject;
                    }
                });

                if (!expectedValueResults)
                {
                    expectedValueResults = {value: expectedValue, actualValues: []};
                }

                // Count up the number
                let actualValueCounts = {};
                let total = 0;
                allValues.forEach(function(actualValue)
                {
                    actualValueCounts[actualValue] = 0;
                });
                expectedValueResults.actualValues.forEach(function(actualValue)
                {
                    actualValueCounts[actualValue] += 1;
                    total += 1;
                });

                allValues.forEach(function(actualValue, actualValueIndex)
                {
                    if (total === 0)
                    {
                        matrix.push({
                            x: actualValueIndex,
                            y: expectedValueIndex,
                            value: 0});
                    }
                    else
                    {
                        // Calculate the color
                        let percentage = (actualValueCounts[actualValue] * 100 / total);
                        let color = "";
                        if (actualValueIndex === expectedValueIndex)
                        {
                            let blend = 1;
                            if (percentage > 70)
                            {
                                blend = 1.0 - ((percentage - 70) / 30);
                            }

                            color = Color("#1AB394").blend(Color("#FFFFFF"), blend);
                        }
                        else
                        {
                            let blend = 0;
                            if (percentage < 20)
                            {
                                blend = 1.0 - (percentage / 20);
                            }

                            color = Color("#B31B1B").blend(Color("#FFFFFF"), blend);
                        }

                        matrix.push({
                            x: actualValueIndex,
                            y: expectedValueIndex,
                            value: percentage,
                            color: color.toString()
                        });
                    }
                });
            });

            data = matrix;

            if ($scope.confusionMatrixChartConfig)
            {
                $scope.confusionMatrixChartConfig.series[0].data = data;
            }
        }

        $scope.$watch('field', function(newValue, oldValue)
        {
            if (newValue)
            {
                const allValues = $scope.field.metadata.statistics.valueHistogram.values.map((value) => value.value);
                recomputeData();
                setupChart();
            }
        });

        $scope.$watch('field.results', function(newValue, oldValue)
        {
            if (newValue)
            {
                recomputeData();
            }
        }, true);
    }

    return {
        templateUrl: "views/schemas/directives/schema_field_results.html",
        controller,
        restrict: "E",
        scope: {field: '='}
    };
});
