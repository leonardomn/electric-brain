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


angular.module('eb').service('EBViewTransformedObjectDialog', function EBViewTransformedObjectDialog($rootScope, $http, $timeout, $uibModal)
{
    const service = {};

    service.open = function open(model, object)
    {
        const modalInstance = $uibModal.open({
            animation: true,
            controller: 'EBViewTransformedObjectController',
            templateUrl: 'views/architectures/dialogs/view_transformed_object.html',
            resolve: {
                result: $http({
                    method: 'POST',
                    url: `/api/models/${model._id}/transform`,
                    data: {object: object}
                })
            }
        });
    };

    return service;
});

angular.module('eb').controller('EBViewTransformedObjectController', function EBViewTransformedObjectController($scope, result, $uibModalInstance)
{
    $scope.objectInputString = JSON.stringify(result.data.input, null, 2);
    $scope.objectOutputString = JSON.stringify(result.data.output, null, 2);

    $scope.close = function()
    {
        $uibModalInstance.close();
    };
});
