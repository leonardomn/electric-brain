#!/usr/bin/env bash
set -e

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
#
# This script is used for installation of Electric Brain.
#

if [ ! -d ubuntu ]; then
    git clone https://github.com/boxcutter/ubuntu
fi

# Replace the custom script file with our installation
cp vm_install.sh ubuntu/custom-script.sh -f


# Build the image
cd ubuntu
packer build -only=virtualbox-iso -var-file=../electricbrain_vars.json ubuntu.json



