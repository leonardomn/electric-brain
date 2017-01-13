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
 * This element represents a button that can show a loading icon built right into it.
 */
angular.module('eb').directive('ebLoaderButton', function ebLoaderButton($timeout, $uibModal)
{
    const controller = function($scope)
    {
        const minimumTimeToShowLoadingIcon = 500;
        const timeToShowCheckMark = 1000;

        let activePromises = 0;
        let activeCheckMarks = 0;
        
        $scope.showLoader = false;
        $scope.showCheckmark = false;
        $scope.clickEvent = function clickEvent()
        {
            let confirmationPromise = new Promise(function(resolve){resolve(true)});
            if ($scope.confirm)
            {
                const instance = $uibModal.open({
                    templateUrl: 'views/general/dialogs/confirmation_dialog.html',
                    controller: 'EBLoaderButtonConfirmationController',
                    windowClass: 'loader-button-confirmation',
                    backdrop: false,
                    resolve: {
                        title: () => $scope.confirmTitle,
                        message: () => $scope.confirmMessage
                    }
                });

                confirmationPromise = instance.result;
            }

            confirmationPromise.then(function(result)
            {
                if (result)
                {
                    const startTime = new Date();
                    const promise = $scope.$parent.$eval($scope.onClick);
                    if (promise)
                    {
                        activePromises += 1;
                        $scope.showLoader = true;
                        const hideLoader = function(checkmarkType)
                        {
                            // We make sure that the loader stays open for a certain minimum amount of time.
                            // This is because the spinner helps to provide interactivity to the interface
                            const sleepTime = Math.max(0, minimumTimeToShowLoadingIcon - (Date.now() - startTime.getTime()));
                            $timeout(function()
                            {
                                activePromises -= 1;
                                if (activePromises === 0)
                                {
                                    $scope.showLoader = false;
                                    activeCheckMarks += 1;
                                    $scope.showCheckmark = true;
                                    $scope.checkmarkType = checkmarkType;
                                    $timeout(function()
                                    {
                                        activeCheckMarks -= 1;
                                        if (activeCheckMarks === 0)
                                        {
                                            $scope.showCheckmark = false;
                                        }
                                    }, timeToShowCheckMark);
                                }
                            }, sleepTime);
                        };
                        promise.then(hideLoader.bind(this, 'check'), hideLoader.bind(this, 'times'));
                    }
                }
            });
        };
    };

    return {
        templateUrl: "views/general/directives/loader_button.html",
        controller,
        restrict: "E",
        scope: {
            onClick: '@',
            title: '@',
            confirm: '@',
            confirmTitle: '@',
            confirmMessage: '@'
        }
    };
});

angular.module('eb').controller('EBLoaderButtonConfirmationController', function EBLoaderButtonConfirmationController($scope, title, message, $uibModalInstance)
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
