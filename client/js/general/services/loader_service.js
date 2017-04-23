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
 * This Angular service is responsible for managing the global loading icons
 */
angular.module('eb').service('EBLoaderService', function EBLoaderService($rootScope, EBNavigationBarService)
{
    const service = {};

    const activePromises = {
        page: 0,
        menu: 0
    };

    /**
     * This method is used to activate a particular loader. You pass in a promise, and the loader will stay
     * active until the promise is resolved
     *
     * @param {string} loader The which loader to activate. For now, only 'page' is accepted.
     * @param {Promise} promise The angular promise to wait for to hide the loader
     *
     * @returns {Promise} The promise object that you passed in.
     */
    service.showLoaderWith = function(loader, promise)
    {
        if (loader === 'page')
        {
            activePromises.page += 1;
            $rootScope.showPageLoader = true;

            const hideLoader = function hideLoader()
            {
                activePromises.page -= 1;
                if (activePromises.page === 0)
                {
                    $rootScope.showPageLoader = false;
                }
            };

            promise.then(hideLoader, hideLoader);
        }
        else if (loader === 'menu')
        {
            activePromises.menu += 1;
            EBNavigationBarService.setLoaderStatus(true);

            const hideLoader = function hideLoader()
            {
                activePromises.menu -= 1;
                if (activePromises.menu === 0)
                {
                    EBNavigationBarService.setLoaderStatus(false);
                }
            };

            promise.then(hideLoader, hideLoader);
        }
        else
        {
            throw new Error(`Unrecognized loader type ${loader}`);
        }
        
        return promise;
    };


    return service;
});
