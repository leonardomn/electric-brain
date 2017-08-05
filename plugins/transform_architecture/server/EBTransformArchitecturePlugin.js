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
    async = require('async'),
    deepcopy = require('deepcopy'),
    EBArchitecturePluginBase = require("../../../server/components/architecture/EBArchitecturePluginBase"),
    EBCustomTransformation = require("../../../shared/components/architecture/EBCustomTransformation"),
    EBDataSource = require("../../../shared/models/EBDataSource"),
    EBSchema = require("../../../shared/models/EBSchema"),
    EBTransformProcess = require('./EBTransformProcess'),
    path = require('path'),
    Promise = require('bluebird'),
    stream = require('stream'),
    underscore = require('underscore');


class EBTransformArchitecture extends EBArchitecturePluginBase
{
    /**
     * This constructs the plugin
     *
     * @param {EBInterpretationRegistry} registry The registry for the transformation stream
     * @param {EBPythonComponentRegistry} pythonComponentRegistry A reference the the globally initialized componentDispatch method
     */
    constructor(registry, pythonComponentRegistry)
    {
        super(registry, pythonComponentRegistry);
        this.registry = registry;
        this.pythonComponentRegistry = pythonComponentRegistry;
    }


    /**
     * This method creates an EBModelProcessBase object for this architecture.
     *
     * @param {EBTransformArchitecture} architecture An EBTransformArchitecture object
     * @param {string} [scriptFolder] Optional script folder for the files to go
     *
     * @returns {EBTransformProcess} A matching tensorflow process object
     */
    getProcess(architecture, scriptFolder)
    {
        return new EBTransformProcess(architecture, this, scriptFolder);
    }
}


module.exports = EBTransformArchitecture;