#!/bin/bash

usererr=$?

source /tmp/batch-upload/bin/activate

if [ $usererr -eq 0 ]; then
  python $AZ_BATCH_JOB_PREP_WORKING_DIR/batchfileuploader.py --env AZ_BATCH_FILE_UPLOAD_CONFIG -s
else
  python $$AZ_BATCH_JOB_PREP_WORKING_DIR/batchfileuploader.py --env AZ_BATCH_FILE_UPLOAD_CONFIG -f
fi
