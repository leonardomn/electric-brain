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

const EBClassFactory = require("../components/EBClassFactory");

/**
 * This class represents a single NN module, as represented by the neural network editor
 */
class EBNeuralNetworkEditorModule
{
    /**
     * This constructs a EBNeuralNetworkEditorModule from the raw data
     *
     * @param {object} rawModule The raw JSON data describing the neural network module
     */
    constructor(rawModule)
    {
        this.name = rawModule.name;
        this.classType = 'EBNeuralNetworkEditorModule';

        for (let parameter of this.parameters)
        {
            this[parameter.name] = rawModule[parameter.name];
        }

        if (rawModule.locked)
        {
            this.locked = true;
        }
        else
        {
            this.locked = false;
        }
    }


    /**
     * This function returns the parameters for this module
     */
    get parameters()
    {
        return EBNeuralNetworkEditorModule.knownLayers[this.name].parameters;
    }


    /**
     * This function returns the namespace for this module
     */
    get namespace()
    {
        return EBNeuralNetworkEditorModule.knownLayers[this.name].moduleNamespace;
    }

    
    /**
     * This function returns a new layer object with the default values
     *
     * @param {String} name The name of the layer to be created.
     */
    static createNewLayer(name)
    {
        const data = {
            name: name
        };

        const layerInfo = EBNeuralNetworkEditorModule.knownLayers[name];

        if (!layerInfo)
        {
            throw new Error(`Unknown layer type ${name}`);
        }

        layerInfo.parameters.forEach((param) =>
        {
            data[param.name] = param.defaultValue;
        });


        return new EBNeuralNetworkEditorModule(data);
    }


    /**
     * Returns a JSON-Schema schema for EBNeuralNetworkEditorModule
     *
     * @returns {object} The JSON-Schema that can be used for validating this model object
     */
    static schema()
    {
        return {
            "id": "EBNeuralNetworkEditorModule",
            "type": "object",
            "properties": {
                name: {"type": "string"},
                locked: {"type": "boolean"}
            },
            "additionalProperties": {"type": ["string", "number"]}
        };
    }
}


EBNeuralNetworkEditorModule.knownLayers = {
    sigmoid: {
        name: 'sigmoid',
        fixed: true,
        sequence: false,
        parameters: [
        ]
    },
    tanh: {
        name: 'tanh',
        fixed: true,
        sequence: false,
            parameters: [
        ]
    },
    elu: {
        name: 'elu',
        fixed: true,
        sequence: false,
        parameters: [
        ]
    },
    softplus: {
        name: 'softplus',
        fixed: true,
        sequence: false,
            parameters: []
    },
    softsign: {
        name: 'softsign',
        fixed: true,
        sequence: false,
        parameters: []
    },
    relu: {
        name: 'relu',
        fixed: true,
        sequence: false,
        parameters: []
    },
    relu6: {
        name: 'relu6',
        fixed: true,
        sequence: false,
        parameters: []
    },
    crelu: {
        name: 'crelu',
        fixed: true,
        sequence: false,
        parameters: []
    },
    dropout: {
        name: 'dropout',
        fixed: true,
        sequence: false,
        parameters: [
            {
                name: 'keep_prob',
                defaultValue: 0.4
            }
        ]
    },
    dense: {
        name: 'dense',
        fixed: true,
        sequence: false,
        parameters: [
            {
                name: 'units',
                defaultValue: 300
            }
        ]
    },
    bidirectional_lstm: {
        name: 'bidirectional_lstm',
        fixed: false,
        sequence: true,
        parameters: [
            {
                name: 'outputSize',
                defaultValue: 100
            }
        ]
    },
    lstm: {
        name: 'lstm',
        fixed: false,
        sequence: true,
        parameters: [
            {
                name: 'outputSize',
                defaultValue: 100
            }
        ]
    },
    bidirectional_gru: {
        name: 'bidirectional_gru',
        fixed: false,
        sequence: true,
        parameters: [
            {
                name: 'outputSize',
                defaultValue: 100
            }
        ]
    },
    gru: {
        name: 'gru',
        fixed: false,
        sequence: true,
        parameters: [
            {
                name: 'outputSize',
                defaultValue: 100
            }
        ]
    }
};

EBClassFactory.registerClass('EBNeuralNetworkEditorModule', EBNeuralNetworkEditorModule, EBNeuralNetworkEditorModule.schema());

module.exports = EBNeuralNetworkEditorModule;


