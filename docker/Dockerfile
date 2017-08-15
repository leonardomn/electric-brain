# This builds an all-in-one easy to install dockerfile

FROM       ubuntu:16.04
MAINTAINER Electric Brain <info@electricbrain.io>

# Install some basic system dependencies
RUN apt-get update
RUN apt-get install systemd mongodb rabbitmq-server gcc g++ git wget nodejs sudo vim npm graphviz libsqlite3-dev python3 python3-pip -y
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Installed the Tensorflow
RUN pip3 install --upgrade tensorflow
RUN pip3 install --upgrade numpy
RUN pip3 install --upgrade scipy
RUN pip3 install --upgrade sklearn

# Install Electric Brain itself
RUN npm install electricbrain -g

# Install Supervisor to manage everything
RUN apt-get install -y supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Setup and configure systemd
ENTRYPOINT ["usr/bin/supervisord"]

EXPOSE 3891
