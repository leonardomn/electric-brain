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
 * EB - controller
 */


angular.module('eb').controller('EBEditArchitectureController', function EBEditArchitectureController($scope, $stateParams, EBArchitectureService, $state, EBNavigationBarService, EBLoaderService)
{
    if (!$stateParams.id)
    {
        $stateParams.id = 'new';
    }

    $scope.$stateParams = $stateParams;

    $scope.isNew = $stateParams.id === 'new';
    $scope.schemaNeedsRefreshed = false;

    $scope.getArchitecture = function getArchitecture()
    {
        if ($scope.isNew)
        {
            $scope.architecture = new shared.models.EBArchitecture({
                name: "",
                dataSource: null,
                inputTransformation: null
            });
        }
        else
        {
            const promise = EBArchitectureService.getArchitecture($stateParams.id).success(function(architecture)
            {
                $scope.architecture = architecture;
            });
            
            EBLoaderService.showLoaderWith('page', promise);
        }
    };
    
    $scope.setSchemaNeedsRefreshed = function setSchemaNeedsRefreshed(value)
    {
        if (!value)
        {
            value = true;
        }
        $scope.schemaNeedsRefreshed = value;
    };

    $scope.getArchitecture();

    $scope.onSaveClicked = function onSaveClicked()
    {
        if ($stateParams.id === 'new')
        {
            return EBArchitectureService.createArchitecture($scope.architecture).then(function success(body)
            {
                EBNavigationBarService.refreshNavigationBar();
                $state.go('edit_architecture.select_data_source', {id: body.data._id});
            });
        }
        else
        {
            return EBArchitectureService.saveArchitecture($scope.architecture);
        }
    };

    $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams)
    {
        if (toState.name.indexOf('edit_architecture.') !== -1 && toState.name !== 'edit_architecture.select_data_source' && toParams.id === 'new')
        {
            // If its a new architecture, make sure we save it
            event.preventDefault();

            EBArchitectureService.createArchitecture($scope.architecture).then(function success(body)
            {
                EBNavigationBarService.refreshNavigationBar();
                $scope.architecture.id = body.data._id;
                toParams.id = body.data._id;
                $state.go(toState, toParams);
            });
        }
        else
        {
            EBArchitectureService.saveArchitecture($scope.architecture);
        }
    });

    $scope.onDeleteClicked = function onDeleteClicked()
    {
        return EBArchitectureService.deleteArchitecture($scope.architecture).then(function success(body)
        {
            EBNavigationBarService.refreshNavigationBar();
            $state.go('dashboard');
        });
    };
});
