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
    EBAPIRoot = require('./EBAPIRoot'),
    express = require("express"),
    fs = require('fs'),
    httpStatus = require('http-status-codes'),
    path = require('path');

class EBFrontendAPI extends EBAPIRoot
{
    /**
     * Creates a new EBFrontendAPI
     *
     * @param {object} application The top level EBApplication object
     */
    constructor(application)
    {
        super(application);
        this.application = application;
    }

    /**
     * Registers all of the endpoints with
     *
     * @param {object} expressApplication This is an express application object.
     */
    setupEndpoints(expressApplication)
    {
        // Individually serve each of the folders under client
        const folders = ["client"];
        folders.forEach((folder) =>
        {
            const frontendFolders = fs.readdirSync(path.join(__dirname, '..', '..', folder));
            frontendFolders.forEach((frontendFolderName) =>
            {
                const pathString = `/app/${frontendFolderName}`;
                if(pathString !== "index.html")
                {
                    expressApplication.use(pathString, express.static(path.join(__dirname, '..', '..', folder, frontendFolderName)));
                    expressApplication.use(`/app/${frontendFolderName}/*`, (req, res) =>
                    {
                        res.status(httpStatus.NOT_FOUND);
                        res.send({});
                    });
                }
            });
        });
        
        this.application.plugins.forEach((plugin) =>
        {
            const pluginFolder = path.join(__dirname, '..', '..', 'plugins', plugin.name);
            if (fs.existsSync(path.join(pluginFolder, 'client')))
            {
                const frontendFolders = fs.readdirSync(path.join(pluginFolder, 'client'));
                frontendFolders.forEach((frontendFolderName) =>
                {
                    const pathString = `/plugins/${plugin.name}/${frontendFolderName}`;
                    if (pathString !== "index.html")
                    {
                        expressApplication.use(pathString, express.static(path.join(pluginFolder, 'client', frontendFolderName)));
                        expressApplication.use(`/plugins/${plugin.name}/${frontendFolderName}/*`, (req, res) =>
                        {
                            res.status(httpStatus.NOT_FOUND);
                            res.send({});
                        });
                    }
                });
            }
        });
        

        // Every other path is considered to be the index page of the frontend
        const frontendCode = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'index.html'));
        expressApplication.use("/app/*", function(req, res)
        {
            res.type('text/html');
            res.status(httpStatus.OK);
            res.send(frontendCode);
        });
    }
}


module.exports = EBFrontendAPI;

