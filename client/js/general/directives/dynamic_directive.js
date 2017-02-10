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
 * This is a utility directive that is used for loading other directives dynamically
 */
angular.module('eb').directive('ebDynamicDirective', function($compile)
{
    const link = function($scope, $elem, $attrs)
    {
        $scope.$watch('directiveName', function(newDirectiveName, oldDirectiveName)
        {
            if (newDirectiveName)
            {
                let attribs = '';
                Object.keys($attrs).forEach((attribute) =>
                {
                    if (attribute != 'directiveName' && attribute[0] != '$')
                    {
                        attribs += `${attribute}="${$attrs[attribute]}"`;
                    }
                });

                const elementHTML = `<div ${newDirectiveName} ${attribs}></div>`;
                const directiveElement = $compile(elementHTML)($scope.$parent);
                $elem.children().replaceWith(directiveElement);
            }
        });
    };

    return {
        link,
        restrict: "E",
        template: '<div>&nbsp;</div>',
        scope: {
            directiveName: '@'
        }
    };
});
