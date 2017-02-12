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
    fs = require('fs'),
    mongodb = require('mongodb'),
    Promise = require('bluebird');

const dataSetMongoURI = "mongodb://localhost:27017/example_datasets";

/**
 *  This function loads the mnist dataset into Mongo
 *
 *  @param {function(err)} next Callback after all the testing data has been generated.
 */
module.exports.loadDataset = function loadDataset(next)
{
    mongodb.MongoClient.connect(dataSetMongoURI, {promiseLibrary: Promise}, function(connectError, db)
    {
        if (connectError)
        {
            return next(connectError);
        }

        const collection = db.collection("handwritten_digits");

        collection.removeMany({}, function(err)
        {
            if (err)
            {
                return next(err);
            }

            const labels = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
            const objects = [];
            labels.forEach(function(label)
            {
                const testingImages = fs.readdirSync(`${__dirname}/mnist_png/testing/${label}`);
                const trainingImages = fs.readdirSync(`${__dirname}/mnist_png/training/${label}`);
                trainingImages.forEach(function(filename)
                {
                    objects.push({
                        outputDigit: label,
                        inputImage: fs.readFileSync(`${__dirname}/mnist_png/training/${label}/${filename}`),
                        training: true,
                        testing: false
                    });
                });

                testingImages.forEach(function(filename)
                {
                    objects.push({
                        outputDigit: label,
                        inputImage: fs.readFileSync(`${__dirname}/mnist_png/testing/${label}/${filename}`),
                        training: false,
                        testing: true
                    });
                });
            });

            collection.insertMany(objects, function(err)
            {
                if (err)
                {
                    return next(err);
                }

                return next();
            });
        });
    });
};

if (require.main === module)
{
    module.exports.loadDataset(function(err)
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
