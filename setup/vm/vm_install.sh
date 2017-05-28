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

# Install the nodesource repository
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -

sudo apt update
sudo apt install mongodb rabbitmq-server nodejs graphviz git build-essential -y


# Install torch and then clean up
cd /tmp
git clone https://github.com/torch/distro.git /tmp/torch --recursive
cd /tmp/torch; bash install-deps;
sudo PREFIX=/usr/local ./install.sh -b
cd ..
sudo rm -rf /tmp/torch

# Torch Activate and install Lua dependencies
/usr/local/bin/torch-activate
sudo /usr/local/bin/luarocks install json
sudo /usr/local/bin/luarocks install distlearn
sudo /usr/local/bin/luarocks install ipc
sudo /usr/local/bin/luarocks install rnn
sudo /usr/local/bin/luarocks install underscore
sudo /usr/local/bin/luarocks install luasocket

# Install Electric Brain
sudo npm install electricbrain -g

# Setup the services
echo "[Unit]
Description=Electric Brain API

[Service]
Environment=
WorkingDirectory=/home/electricbrain
ExecStart=/usr/bin/ebapi
Restart=always
User=electricbrain

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/ebapi.service

echo "[Unit]
Description=Electric Brain Worker #1

[Service]
Environment=
WorkingDirectory=/home/electricbrain
ExecStart=/usr/bin/ebworker
Restart=always
User=electricbrain

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/ebworker1.service




echo "[Unit]
Description=Electric Brain Worker #2

[Service]
Environment=
WorkingDirectory=/home/electricbrain
ExecStart=/usr/bin/ebworker
Restart=always
User=electricbrain

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/ebworker2.service

sudo systemctl daemon-reload
sudo systemctl enable ebapi.service
sudo systemctl enable ebworker1.service
sudo systemctl enable ebworker2.service
sudo systemctl start ebapi
sudo systemctl start ebworker1
sudo systemctl start ebworker2

