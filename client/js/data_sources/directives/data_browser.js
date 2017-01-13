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
 *  This is an element that can be used to browse through data from a given data source
 */
angular.module('eb').directive('ebDataBrowser', function ebDataBrowser(EBDataSourceService, NgTableParams)
{
    function controller($scope)
    {
        $scope.databaseQuery = {};

        $scope.dataBrowserTableParams = new NgTableParams({}, {
            getData: function(params)
            {
                if (!$scope.dataSource)
                {
                    return [];
                }

                return new Promise(function(resolve, reject)
                {
                    EBDataSourceService.findObjects($scope.dataSource, $scope.databaseQuery, 10).then(function(response)
                    {
                        resolve(response.data.objects);
                    },
                    function(err)
                    {
                        reject(err);
                    });
                });
            }
        });

        const reload = _.debounce(function()
        {
            $scope.dataBrowserTableParams.reload();
        }, 500);

        $scope.$watch('databaseQuery', function(newValue, oldValue)
        {
            if (newValue)
            {
                reload();
            }
        }, true);

        let allColumnFields = [];
        function updateColumnSelectFields()
        {
            $scope.dataBrowserTableColumns.forEach(function(column)
            {
                column.columnSelectFields = allColumnFields.filter(function(field)
                {
                    if (field.variablePath.slice(1) === column.field)
                    {
                        return true;
                    }
                    else
                    {
                        return !_.findWhere($scope.dataBrowserTableColumns, {field: field.variablePath.slice(1)});
                    }
                }).map(function(field)
                {
                    return field.variablePath.slice(1);
                });
            });
        }
        
        function updateLastColumn()
        {
            $scope.lastColumnField = $scope.dataBrowserTableColumns[$scope.dataBrowserTableColumns.length - 1].field;
        }

        $scope.dataBrowserTableColumns = [];

        $scope.addNewColumn = function()
        {
            const column = $scope.dataBrowserTableColumns[$scope.dataBrowserTableColumns.length - 1];
            $scope.dataBrowserTableColumns.push({
                field: column.columnSelectFields[1],
                newField: column.columnSelectFields[1],
                title: column.columnSelectFields[1],
                show: true,
                headerTemplateURL: "views/data_sources/directives/data_browser_column_header.html"
            });

            updateColumnSelectFields();
            updateLastColumn();
        };

        $scope.removeColumn = function(field)
        {
            $scope.dataBrowserTableColumns.splice($scope.dataBrowserTableColumns.indexOf(_.findWhere($scope.dataBrowserTableColumns, {field: field})), 1);
            
            updateColumnSelectFields();
            updateLastColumn();
        };

        $scope.changeColumn = function(columnField, newField)
        {
            $scope.dataBrowserTableColumns.forEach(function(column)
            {
                if (column.field === columnField)
                {
                    column.field = newField;
                    column.newField = newField;
                    column.title = newField;
                }
            });

            updateColumnSelectFields();
            updateLastColumn();
        };

        $scope.$watch('dataSource', function(newValue)
        {
            if (newValue)
            {
                $scope.databaseQuery = new shared.models.EBCustomQuery($scope.dataSource.query);
                
                $scope.dataBrowserTableColumns = [];
                allColumnFields = _.sortBy($scope.dataSource.dataSchema.topLevelFields, (field) => -field.metadata.cardinality);

                // Choose the four most cardinal fields
                allColumnFields.slice(0, 4).forEach(function(field)
                {
                    $scope.dataBrowserTableColumns.push({
                        field: field.variablePath.slice(1),
                        newField: field.variablePath.slice(1),
                        title: field.variablePath.slice(1),
                        show: true,
                        headerTemplateURL: "views/data_sources/directives/data_browser_column_header.html"
                    });
                });

                updateColumnSelectFields();
                updateLastColumn();
            }
        });

        // Taken from http://stackoverflow.com/questions/8817394/javascript-get-deep-value-from-object-by-passing-path-to-it-as-string
        $scope.deepFind = function deepFind(obj, path)
        {
            const paths = path.split('.');
            let current = obj;
            for (let index = 0; index < paths.length; ++index)
            {
                if (current[paths[index]] === undefined)
                {
                    return null;
                }
                else
                {
                    current = current[paths[index]];
                }
            }
            return current;
        };
        
        $scope.objectClicked = function(object)
        {
            if ($scope.ebObjectClicked)
            {
                $scope.ebObjectClicked(object);
            }
        };

        $scope.reloadTable = function reloadTable()
        {

        };
    };

    return {
        controller: controller,
        templateUrl: "views/data_sources/directives/data_browser.html",
        restrict: "E",
        scope: {
            dataSource: '=ebDataSource',
            ebObjectClicked: '=ebObjectClicked'
        }
    };
});
