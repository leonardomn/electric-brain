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
 * This class is used for matching primary to secondary objects in production
 */
class EBVectorMatcher
{
    /**
     * Creates an empty vector matcher
     */
    constructor()
    {
        this.primaryVectors = {};
        this.secondaryVectors = {};
    }

    /**
     * This method stores a primary vector with the given ID. This can be used to returning the matching objects for
     * a secondary vector.
     *
     * @param {string} id The ID for the object which this primary vector was computed for
     * @param {[number]} primaryVector An array of numbers representing the vector.
     */
    recordPrimaryVector(id, primaryVector)
    {
        this.primaryVectors[id] = primaryVector;
    }

    /**
     * This method stores a secondary vector with the given ID. This can be used to returning the matching objects for
     * a primary vector.
     *
     * @param {string} id The ID for the object which this secondary vector was computed for
     * @param {[number]} secondaryVector An array of numbers representing the vector.
     */
    recordSecondaryVector(id, secondaryVector)
    {
        this.secondaryVectors[id] = secondaryVector;
    }

    /**
     * This takes a primary vector and returns the closest matching secondary vector
     *
     * @param {[number]} primaryVector An array of numbers representing the vector.
     */
    findMatchingSecondary(primaryVector)
    {
        // Go through all the secondary vectors and find the closest one
        let closestDistance = Infinity;
        let closestKey = null;
        for (const key of Object.keys(this.secondaryVectors))
        {
            const secondaryVector = this.secondaryVectors[key];
            let distance = 0;
            for (let vectorIndex = 0; vectorIndex < primaryVector.length; vectorIndex += 1)
            {
                let diff = primaryVector[vectorIndex] - secondaryVector[vectorIndex];
                distance += diff * diff;
            }
            
            if (distance < closestDistance)
            {
                closestDistance = distance;
                closestKey = key;
            }
        }

        return closestKey;
    }

    /**
     * This takes a primary vector and returns the closest matching primary vector
     *
     * @param {[number]} secondaryVector An array of numbers representing the vector.
     */
    findMatchingPrimary(secondaryVector)
    {
        // Go through all the primary vectors and find the closest one
        let closestDistance = Infinity;
        let closestKey = null;
        for (const key of Object.keys(this.primaryVectors))
        {
            const primaryVector = this.primaryVectors[key];
            let distance = 0;
            for (let vectorIndex = 0; vectorIndex < secondaryVector.length; vectorIndex += 1)
            {
                let diff = primaryVector[vectorIndex] - secondaryVector[vectorIndex];
                distance += diff * diff;
            }

            if (distance < closestDistance)
            {
                closestDistance = distance;
                closestKey = key;
            }
        }
        return closestKey;
    }

}


module.exports = EBVectorMatcher;