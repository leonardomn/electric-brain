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
angular.module('eb').controller('EBNewModelController', function EBNewModelControlle($scope, $stateParams, $state, EBModelService, EBNavigationBarService, EBSocketService)
{
    $scope.model = new shared.models.EBModel({"name": ""});

    $scope.onArchitectureClicked = function onArchitectureClicked()
    {
        if (!$scope.model.name)
        {
            $scope.model.name = `${$scope.model.architecture.name} - ${moment().format('MMM D, hh:mm A')}`;
        }
    };

    $scope.onTrainModelClicked = function onTrainModelClicked()
    {
        return EBModelService.createModel($scope.model).then(function success(body)
        {
            EBNavigationBarService.refreshNavigationBar();
            
            const id = body.data._id;
            return EBModelService.trainModel(body.data).then(function success(body)
            {
                $state.go('view_model', {id: id});
            });
        });
    };

    $scope.$watch('model.parameters.optimizationAlgorithm', function(newValue, oldValue)
    {
        if (newValue)
        {
            const optimFunction = _.find($scope.optimizationAlgorithms, (func) => func.name === newValue);

            console.log(newValue)
            console.log(optimFunction)
            $scope.model.parameters.optimizationParameters = _.clone(optimFunction.parameters);
        }
    });

    $scope.optimizationAlgorithms = [
        {
            "name": "AdadeltaOptimizer",
            "title": "AdaDelta",
            "parameters": {
                "learning_rate": 0.001,
                "epsilon": 1e-8,
                "rho": 0.95
            }
        },
        {
            "name": "AdagradOptimizer",
            "title": "AdaGrad",
            "parameters": {
                "learning_rate": 1e-3,
                "initial_accumulator_value": 0.1
            }
        },
        {
            "name": "AdamOptimizer",
            "title": "Adam",
            "parameters": {
                "learning_rate": 0.001,
                "beta1": 0.9,
                "beta2": 0.999,
                "epsilon": 1e-08
            }
        },
        {
            "name": "FtrlOptimizer",
            "title": "FTRL",
            "parameters": {
                "learning_rate": 0.001,
                "learning_rate_power": -0.5,
                "initial_accumulator_value": 0.1,
                "l1_regularization_strength": 0.0,
                "l2_regularization_strength": 0.0
            }
        },
        {
            "name": "RMSPropOptimizer",
            "title": "RMS Prop",
            "parameters": {
                "learning_rate": 1e-2,
                "decay": 0.9,
                "momentum": 0.0,
                "epsilon": 1e-10
            }
        }
    ];
    
});
