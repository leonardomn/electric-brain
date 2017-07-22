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

const
    Ajv = require('ajv'),
    assert = require('assert'),
    Promise = require('bluebird'),
    underscore = require('underscore');

/**
 *  This class is used to register TensorFlow neural network components
 */
class EBNeuralNetworkComponentRegistry
{
    /**
     * Creates an EBNeuralNetworkComponentRegistry object.
     */
    constructor()
    {
        this.plugins = {};
    }

    /**
     * This method returns a list of all neural network components
     *
     * @return {[string]} Returns a list containing file-names for all neural network tensorflow components
     */
    getPlugins()
    {
        return underscore.values(this.plugins);
    }

    /**
     * This method registers a plugin with the dispatch.
     *
     * @param {string} type The machine name of the plugin
     * @param {string} plugin The filename containing the plugin
     */
    registerPlugin(type, plugin)
    {
        this.plugins[type] = plugin;
    }
}

module.exports = EBNeuralNetworkComponentRegistry;
