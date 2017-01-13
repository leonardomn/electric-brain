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
 * Configure transformation editor
 */
angular.module('eb').directive('ebTransformationEditor', function ebTransformationEditor(EBArchitectureService, $timeout, $http, EBLoaderService, EBViewTransformationResultDialog)
{
    return {
        controller($scope)
        {
            /**
             * Configures the code editor based on the selected programming language
             */
            function setupEditor()
            {
                $timeout(function()
                {
                    if (!$scope.architecture || $scope.architecture.inputTransformations.length === 0)
                    {
                        $scope.editorOptions = {
                            theme: 'twilight',
                            mode: 'text'
                        };
                    }
                    else if ($scope.architecture.inputTransformations[0].language === 'javascript')
                    {
                        $scope.editorOptions = {
                            theme: 'twilight',
                            mode: 'javascript'
                        };
                    }
                    else if ($scope.architecture.inputTransformations[0].language === 'lua')
                    {
                        $scope.editorOptions = {
                            theme: 'twilight',
                            mode: 'lua'
                        };
                    }
                    else if ($scope.architecture.inputTransformations[0].language === 'python')
                    {
                        $scope.editorOptions = {
                            theme: 'twilight',
                            mode: 'python'
                        };
                    }
                    else
                    {
                        $scope.editorOptions = {
                            theme: 'twilight',
                            mode: 'text'
                        };
                    }
                });
            }

            $scope.$watch('architecture', function(newValue)
            {
                if (newValue)
                {
                    if (!$scope.architecture.inputTransformations || $scope.architecture.inputTransformations.length === 0)
                    {
                        $scope.architecture.inputTransformations = [];
                        $scope.transformationEnabled = false;
                    }
                    else
                    {
                        $scope.transformationEnabled = true;
                        if ($scope.architecture.inputTransformations.length > 0)
                        {
                            $scope.transformationLanguage = $scope.architecture.inputTransformations[0].language;
                        }
                    }

                    setupEditor();
                }
            });

            $scope.$watch('transformationEnabled', function(newValue, oldValue)
            {
                if (newValue !== oldValue)
                {
                    if ($scope.architecture.inputTransformations.length > 0 && !newValue)
                    {
                        $scope.architecture.inputTransformations = [];
                    }
                }
            });

            $scope.onPreviewClicked = function onPreviewClicked()
            {
                const savePromise = EBArchitectureService.saveArchitecture($scope.architecture).success(function(response)
                {
                    EBViewTransformationResultDialog.open($scope.architecture);
                });
                EBLoaderService.showLoaderWith('menu', savePromise);
            };

            $scope.$watch('transformationLanguage', function(newValue, oldValue)
            {
                if (newValue && ($scope.architecture.inputTransformations.length === 0 || newValue !== $scope.architecture.inputTransformations[0].language))
                {
                    if (newValue === 'javascript')
                    {
                        $http({
                            method: 'GET',
                            url: 'build/shared/file_templates/transformation/transformation.js'
                        }).success(function(response)
                        {
                            $scope.architecture.inputTransformations = [{
                                language: 'javascript',
                                name: 'transformation.js',
                                code: response
                            }];

                            setupEditor();
                        });
                    }
                    else if (newValue === 'lua')
                    {
                        $http({
                            method: 'GET',
                            url: 'build/shared/file_templates/transformation/transformation.lua'
                        }).success(function(response)
                        {
                            $scope.architecture.inputTransformations = [{
                                language: 'lua',
                                name: 'transformation.lua',
                                code: response
                            }];

                            setupEditor();
                        });
                    }
                    else if (newValue === 'python')
                    {
                        $http({
                            method: 'GET',
                            url: 'build/shared/file_templates/transformation/transformation.py'
                        }).success(function(response)
                        {
                            $scope.architecture.inputTransformations = [{
                                language: 'python',
                                name: 'transformation.py',
                                code: response
                            }];

                            setupEditor();
                        });
                    }
                    else
                    {
                        // Get a generic one
                        $http({
                            method: 'GET',
                            url: 'build/shared/file_templates/transformation/transformation.sh'
                        }).success(function(response)
                        {
                            $scope.architecture.inputTransformations = [{
                                language: newValue,
                                name: 'transformation.sh',
                                code: response
                            }];

                            setupEditor();
                        });
                    }
                }
            });
        },
        templateUrl: "views/architectures/directives/transformation_editor.html",
        restrict: "E",
        scope: {
            architecture: '='
        }
    };
});
