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
 * This Angular service provides a convenient facility for creating confirmation dialogs
 */
angular.module('eb').service('EBDialogService', function EBDialogService($rootScope, EBNavigationBarService, $uibModal)
{
    const service = {};

    service.showConfirmationDialog = function(title, message)
    {
        const instance = $uibModal.open({
            templateUrl: 'views/general/dialogs/confirmation_dialog.html',
            controller: 'EBConfirmationDialogController',
            windowClass: 'loader-button-confirmation',
            backdrop: false,
            resolve: {
                title: () => title,
                message: () => message
            }
        });

        return instance.result;
    };

    service.showErrorDialog = function(title, message)
    {
        if (!message)
        {
            message = title;
            title = "Error";
        }
        
        const instance = $uibModal.open({
            templateUrl: 'views/general/dialogs/error_dialog.html',
            controller: 'EBErrorDialogController',
            windowClass: 'loader-button-confirmation',
            backdrop: false,
            resolve: {
                title: () => title,
                message: () => message
            }
        });

        return instance.result;
    };
    
    return service;
});



angular.module('eb').controller('EBConfirmationDialogController', function EBConfirmationDialogController($scope, title, message, $uibModalInstance)
{
    $scope.title = title;
    $scope.message = message;

    $scope.delete = function()
    {
        $uibModalInstance.close(true);
    };

    $scope.cancel = function()
    {
        $uibModalInstance.close(false);
    };
});


angular.module('eb').controller('EBErrorDialogController', function EBErrorDialogController($scope, title, message, $uibModalInstance)
{
    $scope.title = title;
    $scope.message = message;

    $scope.ok = function()
    {
        $uibModalInstance.close(true);
    };
});
