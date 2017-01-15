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


angular.module('eb').controller('EBDataSourceSelectFieldsController', function EBDataSourceSelectFieldsController($scope, $timeout, $state, $stateParams, EBDataSourceService, config, EBNavigationBarService, EBLoaderService)
{
    if (!$stateParams.id)
    {
        $stateParams.id = 'new';
    }
    $scope.isNew = $stateParams.id === 'new';

    if ($stateParams.refreshSchema)
    {
        const promise = EBDataSourceService.getCollectionSchema($scope.dataSource).success(function(body)
        {
            $scope.dataSource.dataSchema = body.dataSchema;
            $scope.dataSource.dataSchema.walk(function(field)
            {
                field.setIncluded(true);
            });
        });
        EBLoaderService.showLoaderWith('page', promise);
    }

    $scope.onSaveClicked = function onSaveClicked()
    {
        if ($stateParams.id === 'new')
        {
            const promise = EBDataSourceService.createDataSource($scope.dataSource).then(function success(body)
            {
                EBNavigationBarService.refreshNavigationBar();
                $state.go('edit_data_source', {id: body.data._id});
            });
        }
        else
        {
            const promise = EBDataSourceService.saveDataSource($scope.dataSource);
            return promise;
        }
    };

    $scope.onDeleteClicked = function onDeleteClicked()
    {
        return EBDataSourceService.deleteDataSource($scope.dataSource).then(function success(body)
        {
            EBNavigationBarService.refreshNavigationBar();
            $state.go('dashboard');
        });
    };
});
