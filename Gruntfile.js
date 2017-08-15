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

module.exports = function(grunt)
{
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        mkdir: {
            dev: {
                options: {
                    create: ['build/frontend']
                }
            }
        },
        browserify: {
            watch: {
                files: {'build/shared.js': ['shared/index.js']},
                options: {
                    transform: [
                        ["babelify", {presets: ["es2015"]}]
                    ],
                    watch: true,
                    keepAlive: true,
                    browserifyOptions: {
                        debug: true,
                        standalone: "shared"
                    }
                }
            },
            dev: {
                files: {'build/shared.js': ['shared/index.js']},
                options: {
                    transform: [
                        ["babelify", {presets: ["es2015"]}]
                    ],
                    watch: false,
                    keepAlive: false,
                    browserifyOptions: {
                        debug: true,
                        standalone: "shared"
                    }
                }
            }
        },
        unzip: {
            
        },
        uglify: {
            options: {
                mangle: false
            },
            dev: {
                files: {
                    'client/build/shared.min.js': ['build/shared.js']
                }
            }
        },
        dot: {
            frontend: {
                src  : ['server/file_templates/frontend'],
                dest : 'build/frontend'
            }
        },
        watch: {
            sharedCode: {
                files: ['shared/**/*.js'],
                tasks: ['browserify:dev']
            }
        },
        copy: {
            dev: {
                files: [
                    // includes files within path
                    {
                        expand: true,
                        src: ['shared/file_templates/transformation/*'],
                        dest: 'client/build',
                        filter: 'isFile'
                    }
                ]
            }
        },
        curl: {
            'data/english_word_vectors_tensorflow.db': 'https://storage.bhs3.cloud.ovh.net/v1/AUTH_c2ca2a0f9e4b4a48b4901b31926e0261/ebdownloads/english_word_vectors_tensorflow.db'
        }
    });

    grunt.registerTask('dot', 'Compiles all of our DotJS templates', function(target)
    {
        const fs = require('fs');
        const dot = require('dot');
        const options = grunt.config.get("dot")[target];

        if (!fs.existsSync(options.dest))
        {
            fs.mkdirSync(options.dest);
        }

        dot.process({
            path: options.src,
            destination: options.dest,
            templateSettings: {
                strip: false
            }
        });
    });

    // Load our plugins
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-curl');
    grunt.loadNpmTasks('grunt-if-missing');
    grunt.loadNpmTasks('grunt-mkdir');
    grunt.loadNpmTasks('grunt-zip');

    // Default task(s).
    grunt.registerTask('default', ['mkdir:dev', 'dot:frontend', 'browserify:dev', 'uglify:dev', 'copy:dev', 'if-missing:curl']);
};
