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
 * This element allows you to browse through all of the files for a neural network architecture
 */
angular.module('eb').directive('ebArchitectureFileBrowser', function ebArchitectureFileBrowser(EBArchitectureService)
{
    function controller($scope)
    {
        $scope.mode = 'list';
        
        $scope.aceOptions = {
            theme: 'idle_fingers',
            mode: "lua",
            showGutter: true,
            onLoad: function(_editor)
            {

            }
        };
        
        $scope.files = $scope.architecture.generateFiles();

        $scope.fileSelected = function fileSelected(file)
        {
            $scope.file = file;
            $scope.mode = 'file';
        };

        $scope.exitFile = function()
        {
            $scope.mode = 'list';
        };
    }

    return {
        controller: controller,
        templateUrl: "views/architectures/directives/architecture_file_browser.html",
        restrict: "E",
        scope: {
            architecture: "="
        }
    };
});
