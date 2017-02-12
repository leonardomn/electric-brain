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

const async = require('async'),
    mongodb = require('mongodb'),
    Promse = require('bluebird'),
    underscore = require('underscore');

const testingSetMongoURI = "mongodb://localhost:27017/electric_brain_testing";

/**
 * This method returns an enumeration with half the letters of the alphabet, used in many of
 * the generated data sets.
 *
 * @returns {string[]} An array of letters in the enumeration
 */
function getLettersEnumeration()
{
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm'];
}


/**
 * Returns a random letter from the letters enumeration
 *
 * @returns {string} The letter
 */
function getRandomLetter()
{
    const letters = getLettersEnumeration();
    return letters[Math.floor(Math.random() * letters.length)];
}


/**
 * This method returns an enumeration with various bogus statuses, used
 * in a bunch of the data sets.
 *
 * @returns {string[]} An array of statuses in the enumeration
 */
function getStatusesEnumeration()
{
    return ['open', 'closed', 'ajar', 'broken', 'fixed'];
}


/**
 * Returns a random status from the statuses enumeration
 *
 * @returns {string} The letter
 */
function getRandomStatus()
{
    const statuses = getStatusesEnumeration();
    return statuses[Math.floor(Math.random() * statuses.length)];
}


/**
 * Returns a random sequence of letters
 *
 * @returns {[object]} The resulting sequence
 */
function getRandomLetterSequence()
{
    const sequenceLength = (Math.random() * 10) + 10;

    const sequence = [];
    for (let item = 0; item < sequenceLength; item += 1)
    {
        sequence.push({letter: getRandomLetter()});
    }
    return sequence;
}


/**
 * Returns a random sequence of both letters and statuses
 *
 * @returns {[object]} The resulting sequence
 */
function getRandomDualSequence()
{
    const sequenceLength = (Math.random() * 10) + 10;

    const sequence = [];
    for (let item = 0; item < sequenceLength; item += 1)
    {
        sequence.push({
            letter: getRandomLetter(),
            status: getRandomStatus()
        });
    }
    return sequence;
}


/**
 * Returns a random sequence of sequences, used for testing multi-layered networks
 *
 * @returns {[object]} The resulting sequence
 */
function getRandomLayeredSequence()
{
    const sequenceLength = (Math.random() * 10) + 10;

    const sequence = [];
    for (let item = 0; item < sequenceLength; item += 1)
    {
        sequence.push({sequence: getRandomLetterSequence()});
    }
    return sequence;
}


/**
 * Returns a random sequence of dual-class sequences.
 *
 * @returns {[object]} The resulting sequence
 */
function getRandomLayeredDualSequence()
{
    const sequenceLength = (Math.random() * 10) + 10;

    const sequence = [];
    for (let item = 0; item < sequenceLength; item += 1)
    {
        sequence.push({sequence: getRandomDualSequence()});
    }
    return sequence;
}


/**
 * Returns a random string. Used testing models that use text
 *
 * @returns {string} The string
 */
function getRandomString()
{
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`~!@#$%^&*()-_=+[{]}oO\'"\\|,<.>/?"';

    let str = '';
    for(let n = 0; n < 30; n += 1)
    {
        str += charset[Math.floor(Math.random() * charset.length)];
    }

    return str;
}

/**
 * This is a convenience method for the below functions for saving their generated testing data sets.
 *
 * @param {string} collectionName The name of the collection to save the objects in
 * @param {[object]} objects The array of objects to save
 * @param {function(err)} next The callback after the objects have been saved
 */
function saveObjects(collectionName, objects, next)
{
    mongodb.MongoClient.connect(testingSetMongoURI, {promiseLibrary: Promise}, function(connectError, db)
    {
        if (connectError)
        {
            return next(connectError);
        }

        const collection = db.collection(collectionName);

        collection.removeMany({}, function(err)
        {
            if (err)
            {
                return next(err);
            }

            // Deep clone each object
            const cloned = objects.map(function(object)
            {
                return underscore.clone(object);
            });

            collection.insertMany(cloned, function(err)
            {
                if (err)
                {
                    return next(err);
                }

                return next();
            });
        });
    });
}


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set is the simplest possible data set. It creates objects
 *  with the same fixed input and output. The network simply has to learn
 *  to copy its input to its output.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateCopyTestingDataSet = function generateCopyTestingDataSet(next)
{
    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Each object will have a random entry from each enumeration
        const letter = getRandomLetter();
        const object = {
            inputLetter: letter,
            outputLetter: letter
        };

        objects.push(object);
    }

    saveObjects("copy_value", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This is similar to the copy data set, except that there are two
 *  classifications that it needs to copy
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateDualCopyTestingDataSet = function generateDualCopyTestingDataSet(next)
{
    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Each object will have a random entry from each enumeration
        const letter = getRandomLetter();
        const status = getRandomStatus();
        const object = {
            inputLetter: letter,
            outputLetter: letter,
            inputStatus: status,
            outputStatus: status
        };

        objects.push(object);
    }

    saveObjects("dual_copy_value", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to copy values from input
 *  to output within a sequence.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateSequenceCopyTestingDataSet = function generateSequenceCopyTestingDataSet(next)
{
    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        const object = {
            letters: getRandomLetterSequence().map(function(item)
            {
                return {
                    inputLetter: item.letter,
                    outputLetter: item.letter
                };
            })
        };

        objects.push(object);
    }

    saveObjects("sequence_copy", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to copy two different values from input
 *  to output within a sequence.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateSequenceDualCopyTestingDataSet = function generateSequenceDualCopyTestingDataSet(next)
{
    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        const object = {
            letters: getRandomDualSequence().map(function(item)
            {
                return {
                    inputLetter: item.letter,
                    outputLetter: item.letter,
                    inputStatus: item.status,
                    outputStatus: item.status
                };
            })
        };

        objects.push(object);
    }

    saveObjects("sequence_dual_copy", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to classify a sequence. There is a small,
 *  fixed list of sequences. The network just has to memorize them and learn to
 *  identify which sequence it is.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateSequenceIdentificationTestingDataSet = function generateSequenceIdentificationTestingDataSet(next)
{
    const enumerationSequences = [];
    // Generate several random sequences
    for (let sequenceIndex = 0; sequenceIndex < 100; sequenceIndex += 1)
    {
        enumerationSequences.push(getRandomLetterSequence());
    }

    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Choose a random sequence
        const sequenceIndex = Math.floor(Math.random() * enumerationSequences.length);

        const object = {
            inputLetters: enumerationSequences[sequenceIndex],
            outputIdentity: sequenceIndex.toString()
        };
        objects.push(object);
    }

    saveObjects("sequence_identification", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to classify a sequence. Similar to
 *  generateSequenceIdentificationTestingDataSet, except that instead of
 *  identifying the sequence, it has to produce two randomly assigned classes.
 *  It still requires memorizing the input sequences.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateSequenceClassificationTestingDataSet = function generateSequenceClassificationTestingDataSet(next)
{
    const enumerationSequences = [];
    const numberClasses = 10;
    const numberSequences = 15;
    // Generate several random sequences
    for (let sequenceIndex = 0; sequenceIndex < numberSequences; sequenceIndex += 1)
    {
        enumerationSequences.push({
            inputLetters: getRandomLetterSequence(),
            outputFirstClassification: Math.floor((Math.random() * numberClasses) + 1).toString(),
            outputSecondClassification: Math.floor((Math.random() * numberClasses) + 1).toString()
        });
    }

    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Choose a random sequence
        const sequenceIndex = Math.floor(Math.random() * enumerationSequences.length);
        objects.push(enumerationSequences[sequenceIndex]);
    }

    saveObjects("sequence_classification", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to copy values in a layered
 *  sequence - a sequence of sequences.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateLayeredSequenceCopyTestingDataSet = function generateLayeredSequenceCopyTestingDataSet(next)
{
    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        const object = {
            letters: getRandomLayeredSequence().map(function(item)
            {
                return {
                    sequence: item.sequence.map(function(innerItem)
                    {
                        return {
                            inputLetter: innerItem.letter,
                            outputLetter: innerItem.letter
                        };
                    })
                };
            })
        };

        objects.push(object);
    }

    saveObjects("layered_sequence_copy", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to memorize and identify
 *  layered sequences, which are just sequences of sequences
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateLayeredSequenceIdentificationTestingDataSet = function generateLayeredSequenceIdentificationTestingDataSet(next)
{
    const enumerationSequences = [];
    // Generate several random sequences
    for (let sequenceIndex = 0; sequenceIndex < 100; sequenceIndex += 1)
    {
        enumerationSequences.push(getRandomLayeredSequence());
    }

    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Choose a random sequence
        const sequenceIndex = Math.floor(Math.random() * enumerationSequences.length);

        const object = {
            inputSequences: enumerationSequences[sequenceIndex],
            outputIdentity: sequenceIndex.toString()
        };
        objects.push(object);
    }

    saveObjects("layered_sequence_identification", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to memorize and categorize
 *  layered sequences, which are sequences of sequences. Similar
 *  to generateLayeredSequenceIdentificationTestingDataSet, except that
 *  instead of asking the network to identify the sequence outright,
 *  it has to be able to learn a couple of arbitrarily defined classes
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateLayeredSequenceClassificationTestingDataSet = function generateLayeredSequenceClassificationTestingDataSet(next)
{
    const enumerationSequences = [];
    const numberClasses = 10;
    const numberSequences = 100;
    // Generate several random sequences
    for (let sequenceIndex = 0; sequenceIndex < numberSequences; sequenceIndex += 1)
    {
        enumerationSequences.push({
            inputLetters: getRandomLayeredSequence(),
            outputFirstClassification: Math.floor((Math.random() * numberClasses) + 1).toString(),
            outputSecondClassification: Math.floor((Math.random() * numberClasses) + 1).toString()
        });
    }

    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Choose a random sequence
        const sequenceIndex = Math.floor(Math.random() * enumerationSequences.length);
        objects.push(enumerationSequences[sequenceIndex]);
    }

    saveObjects("layered_sequence_classification", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to do an inner classification on
 *  a layered sequence - it uses the output of the inner sequence to
 *  help it identify classes on the outer sequence.
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateInnerSequenceClassificationTestingDataSet = function generateInnerSequenceClassificationTestingDataSet(next)
{
    const enumerationSequences = [];
    const numberSequences = 100;
    // Generate several random sequences
    for (let sequenceIndex = 0; sequenceIndex < numberSequences; sequenceIndex += 1)
    {
        enumerationSequences.push({
            inputInnerSequence: getRandomLetterSequence(),
            outputClassification: sequenceIndex.toString()
        });
    }

    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Choose a random sequence
        const outerSequenceLength = (Math.random() * 10) + 10;
        const outerSequence = [];
        for (let item = 0; item < outerSequenceLength; item += 1)
        {
            const innerSequenceIndex = Math.floor(Math.random() * enumerationSequences.length);
            outerSequence.push(enumerationSequences[innerSequenceIndex]);
        }

        objects.push({sequence: outerSequence});
    }

    saveObjects("inner_sequence_classification", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set is used to test the histogram functionality for numbers
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateNumberHistogramDataset = function generateNumberHistogramDataset(next)
{
    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Several random numbers on each object at different orders of magnitude
        const object = {
            first: Number(Math.random()),
            second: Number(Math.random() * 10),
            third: Number(Math.random() * 100),
            fourth: Number(Math.random() * 500),
            fifth: Number(Math.random() * 5000)
        };

        objects.push(object);
    }

    saveObjects("number_histogram", objects, next);
};


/**
 *  This method is used to generate a data set for testing purposes.
 *
 *  This data set requires the network to identify a string. Essentially the same as sequence
 *  identification, except that the prepossessing is different
 *
 *  @param {function(err)} next The callback after the data set has been generated
 */
module.exports.generateStringIdentificationSequence = function generateStringIdentificationSequence(next)
{
    const enumerationStrings = [];
    // Generate several random strings
    for (let stringIndex = 0; stringIndex < 100; stringIndex += 1)
    {
        enumerationStrings.push(getRandomString());
    }

    const objects = [];
    for (let objectIndex = 0; objectIndex < 1000; objectIndex += 1)
    {
        // Choose a random sequence
        const stringIndex = Math.floor(Math.random() * enumerationStrings.length);

        const object = {
            inputText: enumerationStrings[stringIndex],
            outputIdentity: stringIndex.toString()
        };
        objects.push(object);
    }

    saveObjects("text_identification", objects, next);
};
