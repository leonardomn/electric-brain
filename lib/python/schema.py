#
# Electric Brain is an easy to use platform for machine learning.
# Copyright (C) 2016 Electric Brain Software Corporation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import tensorflow as tf
from electricbrain import eprint

loaded = False

class EBSchema:
    """ Represents the python version of EBSchema """
    def __init__(self, schema):
        for key in schema:
            if key == 'items':
                self.__dict__[key] = EBSchema(schema[key])
            elif key == 'properties':
                self.__dict__[key] = {propertyName: EBSchema(schema['properties'][propertyName]) for propertyName in schema['properties']}
            else:
                self.__dict__[key] = schema[key]

    def __getitem__(self, key):
        return self.__dict__[key]

    def __contains__(self, key):
        return key in self.__dict__

    def isField(self):
        if 'object' not in self.type and 'array' not in self.type:
            return True
        return False

    def isObject(self):
        return 'object' in self.type

    def isArray(self):
        return 'array' in self.type

    def isString(self):
        return 'string' in self.type

    def isNumber(self):
        return 'number' in self.type

    def isBoolean(self):
        return 'boolean' in self.type

    def isBinary(self):
        return 'binary' in self.type

    def fields(self):
        if not self.isObject():
            return []
        else:
            fields = []
            for key in self.properties:
                if self.properties[key].isField():
                    fields.append(key)
            return fields

    def allFields(self):
        if self.isField():
            return [self]
        elif self.isArray():
            return self.items.allFields()
        elif self.isObject():
            fields = []
            for key in self.properties:
                fields.extend(self.properties[key].allFields())
            return fields
        else:
            return []

