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

const EBArchitecturePluginBase = require("../../../server/components/architecture/EBArchitecturePluginBase"),
    EBCustomTransformation = require("../../../shared/components/architecture/EBCustomTransformation"),
    EBDataSource = require("../../../shared/models/EBDataSource"),
    EBSchema = require("../../../shared/models/EBSchema"),
    EBMatchingTorchProcess = require("./EBMatchingTorchProcess"),
    EBTorchCustomModule = require("../../../shared/components/architecture/EBTorchCustomModule"),
    EBNeuralNetworkEditorModule = require("../../../shared/models/EBNeuralNetworkEditorModule"),
    EBNeuralNetworkComponentBase = require("../../../shared/components/architecture/EBNeuralNetworkComponentBase"),
    EBTorchModule = require("../../../shared/components/architecture/EBTorchModule"),
    EBTorchNode = require("../../../shared/components/architecture/EBTorchNode"),
    matchingTrainingScriptTemplate = require("../../../build/torch/matching_training_script_tf"),
    path = require('path');

/**
 * This is the main plugin entry point for the matching network plugin.
 */
class EBMatchingArchitecturePlugin extends EBArchitecturePluginBase
{
    /**
     * This constructs the plugin
     *
     * @param {EBInterpretationRegistry} registry The registry for the transformation stream
     * @param {EBNeuralNetworkComponentRegistry} neuralNetworkComponentRegistry A reference the the globally initialized componentDispatch method
     */
    constructor(registry, neuralNetworkComponentRegistry)
    {
        super(registry, neuralNetworkComponentRegistry);
        this.registry = registry;
        this.neuralNetworkComponentRegistry = neuralNetworkComponentRegistry;
    }


    /**
     * This method creates an EBTorchProcessBase object for this architecture.
     *
     * @param {EBMatchingArchitecture} architecture An EBMatchingArchitecture object
     * @param {string} [scriptFolder] Optional script folder for the files to go
     *
     * @returns {EBMatchingTorchProcess} A matching torch process object
     */
    getTorchProcess(architecture, scriptFolder)
    {
        return new EBMatchingTorchProcess(architecture, this, scriptFolder);
    }
    

    /**
     * This method generates all the files for this neural network architecture
     *
     * @param {EBTransformArchitecture} architecture An EBTransformArchitecture object
     * @returns {[object]} The an array of objects describing the generated files.
     *                     Each object has two properties, 'path' for the files
     *                     path and filename, and 'data' for the contents of the
     *                     file
     */
    generateFiles(architecture)
    {
        const self = this;

        const files = [];

        // Generate the training script
        files.push({
            path: "TrainingScript.py",
            data: matchingTrainingScriptTemplate({            })
        });

        return files;
    }
}

module.exports = EBMatchingArchitecturePlugin;
