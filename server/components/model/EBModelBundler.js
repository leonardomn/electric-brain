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
 * This is a base class for various ways of bundling up trained EBModel's into an easy to embed model.
 */
class EBModelBundler
{
    /**
     * This method is should create a wrapped up bundle object in a single, large Buffer
     *
     * All sub classes should implement this method.
     *
     * @param {EBModel} model The model object to be bundled
     * @param {function(err, buffer)} callback The callback to receive the resulting bundle
     */
    createBundle(model, callback)
    {
        throw new Error("EBModelBundler::createBundle is unimplemented");
    }
}

module.exports = EBModelBundler;
