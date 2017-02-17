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
 * The purpose of this class is to store the list of registered interpretation plugins.
 */
class EBInterpretationRegistry
{
    /**
     * This creates the plugin registry
     */
    constructor()
    {
        this.interpretations = {};
    }

    /**
     * This method adds a new interpretation into the registry. It will then be available
     * with getInterpretation()
     *
     * @param {EBInterpretationBase} interpretation An instantiated interpretation object to insert into the registry.
     */
    addInterpretation(interpretation)
    {
        this.interpretations[interpretation.name] = interpretation;
    }

    /**
     * This method returns an interpretation from the registry
     *
     * @param {string} name The name of the interpretation to fetch
     * @return {EBInterpretationBase} An instantiated interpretation object.
     */
    getInterpretation(name)
    {
        return this.interpretations[name];
    }
};


module.exports = EBInterpretationRegistry;

