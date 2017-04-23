# This builds an all-in-one easy to install dockerfile

FROM       ubuntu:16.04
MAINTAINER Electric Brain <info@electricbrain.io>

# Install some basic system dependencies
RUN apt-get update
RUN apt-get install systemd mongodb rabbitmq-server gcc g++ git wget nodejs sudo vim npm graphviz -y
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Installed the Torch and dependencies
ENV PREFIX=/usr
RUN git clone https://github.com/torch/distro.git ~/torch --recursive
RUN cd ~/torch; bash install-deps;
RUN cd ~/torch; PREFIX=/usr ./install.sh
RUN luarocks install json
RUN luarocks install distlearn
RUN luarocks install ipc
RUN luarocks install rnn
RUN luarocks install underscore
RUN luarocks install luasocket

# Install Electric Brain itself
RUN npm install electricbrain -g

# Install Supervisor to manage everything
RUN apt-get install -y supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup and configure systemd
ENTRYPOINT ["usr/bin/supervisord"]

EXPOSE 3891
