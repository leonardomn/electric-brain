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
 * Represents a single field being configured within the neural network
 */
angular.module('eb').directive('ebStringInterpretationConfiguration', function ebStringInterpretationConfiguration($timeout, EBDataSourceService, NgTableParams, EBDialogService)
{
    function controller($scope, $element, $attrs)
    {
        $scope.stringConfigurationValues = [
            'classification',
            'sequence',
            'english_word',
            'english_text'
        ];

        $scope.stringConfigurationTitles = [
            'Enumeration / Classification',
            'Letter by Letter',
            'Single English Word',
            'English Text'
        ];
        
        
        $scope.sequenceLengthLimitConfigurationValues = [
            true,
            false
        ];

        $scope.sequenceLengthLimitConfigurationTitles = [
            'Yes',
            'No'
        ];

        $scope.$watch('field', function(newValue)
        {
            if (newValue)
            {
                $scope.classificationValuesTable = new NgTableParams({
                    count: 25
                }, {
                    counts: [10, 25, 50, 100],
                    dataset: $scope.field.configuration.interpretation.classificationValues,
                    paginationMaxBlocks: 13,
                    paginationMinBlocks: 2,
                });
            }
        });

        $scope.newValueText = "";

        $scope.addValue = function addValue()
        {
            if (!$scope.newValueText)
            {
                EBDialogService.showErrorDialog(`You must enter some text for the classification.`);
            }
            else if ($scope.field.configuration.interpretation.classificationValues.indexOf($scope.newValueText) !== -1)
            {
                EBDialogService.showErrorDialog(`The value ${$scope.newValueText} already exists in the list`);
            }
            else
            {
                $scope.field.configuration.interpretation.classificationValues.push($scope.newValueText);
                $scope.newValueText = "";
                $scope.classificationValuesTable.reload();
            }
        };
        
        $scope.deleteValue = function deleteValue(value)
        {
            $scope.field.configuration.interpretation.classificationValues.splice($scope.field.configuration.interpretation.classificationValues.indexOf(value), 1);

            $scope.classificationValuesTable.reload().then(function(data)
            {
                if (data.length === 0 && $scope.classificationValuesTable.total() > 0)
                {
                    $scope.classificationValuesTable.page($scope.classificationValuesTable.page() - 1);
                    $scope.classificationValuesTable.reload();
                }
            });
        };
    }

    return {
        templateUrl: "/plugins/string/views/string_interpretation_configuration.html",
        controller,
        restrict: "A",
        scope: {
            field: '=',
            mode: '='
        }
    };
});
