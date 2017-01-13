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

angular.module('eb').service('EBViewTransformationResultDialog', function EBViewTransformationResultDialog($rootScope, $http, $timeout, $uibModal, EBLoaderService)
{
    const service = {};

    service.open = function open(architecture)
    {
        const transformResultPromise = $http({
            method: 'GET',
            url: `/api/architectures/${architecture._id}/sample/transform`
        });

        EBLoaderService.showLoaderWith('menu', transformResultPromise);

        $uibModal.open({
            animation: true,
            size: 'extra-lg',
            controller: 'EBViewTransformationResultController',
            templateUrl: 'views/architectures/dialogs/view_transformation_result.html',
            resolve: {result: transformResultPromise}
        });
    };

    return service;
});

angular.module('eb').controller('EBViewTransformationResultController', function EBViewTransformationResultController($scope, result, $uibModalInstance)
{
    $scope.schema = new shared.models.EBSchema(result.data.schema);

    $scope.close = function()
    {
        $uibModalInstance.close();
    };
});
