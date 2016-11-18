#!/bin/bash

usererr=$?
pyv="$(python -V 2>&1)"
echo "Current python version: $pyv"

wget https://bootstrap.pypa.io/get-pip.py
python get-pip.py

pip install virtualenv
virtualenvdir=/tmp/batch-upload
if [ ! -e $virtualenvdir ]; then
  virtualenv /tmp/batch-upload
fi

echo "Activating venv"
source /tmp/batch-upload/bin/activate

# Install the prerequisites
pip install -r requirements.txt
