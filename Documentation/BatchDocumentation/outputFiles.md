# Output files

**Note:** This feature is only available on Linux VMs.

When adding a task, you can now declare a list of output files to be automatically uploaded to 
an Azure Storage container of your choice.

An output file description can be added to a task or Job Manager task (or the taskFactory.repeatTask):
```json
{
  "id" : "2",
  "commandLine": "ffmpeg -i sampleVideo2.mkv -vcodec copy -acodec copy outputVideo2.mp4 -y",
  "outputFiles": [
      {
        "filePattern": "outputVideo2.mp4",
        "destination": {
          "container": {
            "path": "mytask2output.mp4",
            "containerSas": "https://storage.blob.core.windows.net/container?sv=2015-04-05sig=tAp0r3I3SV5PbjpZ5CIjvuo1jdUs5xW"
          }
        },
        "uploadDetails": {
          "taskStatus": "TaskSuccess"
        }
      },
      {
        "filePattern": "../stderr.txt",
        "destination": {
          "container": {
            "path": "2_error.log",
            "containerSas": "https://storage.blob.core.windows.net/container?sv=2015-04-05sig=tAp0r3I3SV5PbjpZ5CIjvuo1jdUs5xW"
          }
        },
        "uploadDetails": {
          "taskStatus": "TaskFailure"
        }
      }
    ]
}
```

Multiple output file descriptions can be included to cover different file patterns and different upload circumstances.
In the above example, if the process completes successfully (the process exits with code 0), then the output will be uploaded,
otherwise the error logs are uploaded for debugging.

### Options:
* `filePattern`: (required, string) The name of the file or files to be uploaded. This could be an absolute path, or a path relative to the task working directory. This can be a single file, or a pattern using wildcards (`**` and `*`).
* `destination`: (required, object) The destination to which the output files specified in `filePattern` will be uploaded.
  * `container`: (required, object) The details of the destination container.
    * `path`: (optional, string) Path within the container to which data will be uploaded. If `filePath` refers to multiple files, `path` will be considered a virtual directory within the container. Otherwise `path`
    will be considered to include the filename used in storage.
    * `containerSas`: (required, string) The SAS URL to the storage container used to hold the output data. The SAS must have write permissions.
* `uploadDetails`: (required, object) The details regarding the upload conditions.
    * `taskStatus`: (required, string) Determine under what circumstances these output files should be persisted.
    The options include:
        - `TaskSuccess`
            - The output data will only be uploaded if the task completed with an exit code of zero.
        - `TaskFailure`
            - The output data will only be uploaded if the task completed with a nonzero exit code.
        - `TaskComplete`
            - The output data will be uploaded irrespective of the exit code of the task.
