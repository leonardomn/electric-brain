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

const EBArchitecturePluginBase = require("../../../shared/components/architecture/EBArchitecturePluginBase"),
    EBCustomTransformation = require("../../../shared/components/architecture/EBCustomTransformation"),
    EBDataSource = require("../../../shared/models/EBDataSource"),
    EBSchema = require("../../../shared/models/EBSchema");

class EBTransformArchitecture extends EBArchitecturePluginBase
{
    constructor()
    {
        
    }

    
    /**
     * Returns a JSON-Schema schema for this architectures
     *
     * @returns {object} The JSON-Schema that can be used for validating this architectures in its raw form
     */
    static schema()
    {
        return {
            "id": "EBTransformArchitecture",
            "type": "object",
            "properties": {
                "_id": {},
                "name": {"type": "string"},
                "dataSource": EBDataSource.schema(),
                "inputTransformations": {
                    "type": "array",
                    "items": EBCustomTransformation.schema()
                },
                "inputSchema": EBSchema.schema(),
                "outputSchema": EBSchema.schema(),
                "options": {
                    "sequenceProcessorInternalSize": {"type": "number"},
                    "summaryVectorSize": {"type": "number"}
                }
            }
        };
    }
}


