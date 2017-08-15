Electric Brain
==============

## Installation

Thank you for downloading Electric Brain!

### Dependencies

Electric Brain has several major dependencies:
 - NodeJS >= 4.2.6
 - MongoDB >= 2.6
 - RabbitMQ
 - TensorFlow
 - Graphviz
 - SQLLite3

Installation of these four tools will vary greatly depending on your platform.

#### Ubuntu 16.04

On Ubuntu 16.04, several of the required tools can be installed with their required versions very easily from
the mainline package repository.

    user@machine:~$ sudo apt install mongodb rabbitmq-server graphviz git build-essential libsqlite3-dev python3-pip -y

Tensorflow and other machine learning libraries must be install separately, using Pip.

    user@machine:~$ sudo pip3 install tensorflow
    user@machine:~$ sudo pip3 install numpy
    user@machine:~$ sudo pip3 install scipy
    user@machine:~$ sudo pip3 install sklearn

After installing Tensorflow, you will need to manually install several Electric Brain dependencies in Lua via
luarocks:

    user@machine:~$ sudo luarocks install json
    user@machine:~$ sudo luarocks install distlearn
    user@machine:~$ sudo luarocks install ipc
    user@machine:~$ sudo luarocks install rnn
    user@machine:~$ sudo luarocks install underscore
    user@machine:~$ sudo luarocks install luasocket
    user@machine:~$ sudo luarocks install lsqlite3

Now you can finally install Electric Brain via NPM. It must be installed globally using the -g command

    user@machine:~$ sudo npm install electricbrain -g

## Operation

The Electric Brain infrastructure is divided into two components, the API and frontend application server,
and backend workers which do processing. Both of them are required for Electric Brain to function properly,
and they both require connections to RabbitMQ and MongoDB. You can have as many of each running as you want.

To run the API server, simply run:

    user@machine:~$ ebapi

To run the worker, simply run:

    user@machine:~$ ebworker

You can also run an all-in-one application server using:

    user@machine:~$ ebapplication

