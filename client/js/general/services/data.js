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

angular.module('eb').service('EBDataService', function EBDataService()
{
    var service = {};

    service.getDatabases = function()
    {
        return [
            // {
            //     type: "oracle",
            //     logo: "img/databases/oracle-logo.png"
            // },
            // {
            //     type: "microsoft",
            //     logo: "img/databases/microsoft-logo.png"
            // },
            // {
            //     type: "mysql",
            //     logo: "img/databases/mysql-logo.png"
            // },
            {
                type: "mongo",
               logo: "img/databases/mongodb-logo.jpg"
            },
            {
                type: "csv",
                logo: "img/databases/csv.png"
            },
            // {
            //     type: "ibm",
            //     logo: "img/databases/ibm-logo.png"
            // },
            // {
            //     type: "postgres",
            //     logo: "img/databases/postgresql-logo.png"
            // },
        ];
    };

    return service;
});
