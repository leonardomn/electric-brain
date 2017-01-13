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
    testingData = require('../test/utilities/testing_data');

/**
 *  This script is used to quickly generate data for a bunch of different tests.
 *
 *  @param {function(err)} next Callback after all the testing data has been generated.
 */
module.exports.generateData = function generateData(next)
{
    async.series([
        testingData.generateCopyTestingDataSet,
        testingData.generateDualCopyTestingDataSet,
        testingData.generateSequenceCopyTestingDataSet,
        testingData.generateSequenceDualCopyTestingDataSet,
        testingData.generateSequenceIdentificationTestingDataSet,
        testingData.generateSequenceClassificationTestingDataSet,
        testingData.generateLayeredSequenceCopyTestingDataSet,
        testingData.generateLayeredSequenceIdentificationTestingDataSet,
        testingData.generateLayeredSequenceClassificationTestingDataSet,
        testingData.generateInnerSequenceClassificationTestingDataSet,
        testingData.generateNumberHistogramDataset,
        testingData.generateStringIdentificationSequence
    ], next);
};

if (require.main === module)
{
    module.exports.generateData(function(err)
    {
        if (err)
        {
            throw err;
        }
        else
        {
            process.exit(0);
        }
    });
}
