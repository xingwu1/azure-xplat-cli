# Task factories

Task factories provides a way for a job and all its tasks to be created in one command instead
of calling `azure batch task create` for each task.

**Note:** If the CLI should lose connectivity during the addition of tasks, the operation will not be completed and the job
will continue with a partial set of tasks. The remainder of the tasks must be added manually using `azure batch task create`.

There are currently two kinds of task factories.

## Task collection 

This task factory is where each task is individually specified according to the 
[Batch API schema](https://msdn.microsoft.com/library/azure/dn820105.aspx).
This task factory most closely mirrors the Batch task creation API.

An example of a `taskCollection` task factory:
```json
"job": {
  "id": "my-ffmpeg-job",
  "constraints": {
    "maxWallClockTime": "PT5H",
    "maxTaskRetryCount": 3
  },
  "poolInfo": {
    "poolId": "my-ffmpeg-pool"
  },
  "jobPreparationTask": {
    "commandLine" : "sudo apt-get install ffmpeg -y",
    "runElevated": true,
    "waitForSuccess": true
  },
  "taskFactory": {
    "type": "taskCollection",
    "tasks": [
      {
        "id" : "mytask1",
        "commandLine": "ffmpeg -i sampleVideo1.mkv -vcodec copy -acodec copy output.mp4 -y",
      },
      {
        "id" : "mytask2",
        "commandLine": "ffmpeg -i sampleVideo2.mkv -vcodec copy -acodec copy output.mp4 -y",
      }
    ]
  }
}
```

## Parametric sweep

The parametric sweep task factory creates a set of tasks by substituting a range or sequence
of values into a template. Substitutions can be made in most attributes of the task, but are most commonly
made in the commandLine attribute or resourceFile collection.

Currently the following task attributes are not supported in a parametric sweep task factory:
- `id`: The ID of a task will be automatically generated.
- `dependsOn`: Dependencies between tasks within a factory, or tasks created by other means are not yet supported. 

An example:
```json
"job": {
  "id": "my-ffmpeg-job",
  "poolInfo": {
    "poolId": "my-ffmpeg-pool"
  },
  "taskFactory": {
    "type": "parametricSweep",
    "parameterSets": [
        {
            "start": 1,
            "end": 500,
            "step": 1
        }
    ],
    "repeatTask": {
        "commandLine": "ffmpeg -i sampleVideo{0}.mkv -vcodec copy -acodec copy output{0}.mp4 -y",
    }
  }
}
```

The range of values used to create the tasks are set in `parameterSets`. The first task to be created is represented
by the `start` field, and the last that that could potentially be created is represented by the `end` field. Whether
this last task is created will depend on the chosen increment size; the vlaue of `step`.
For example, a parameteric sweep with a `start` of 5, `end` of 10 and a `step` of 3 will produce two tasks using the values 5 and 8.

Multiple `parameterSets` can be defined to produce multi-dimensional parametric sweeps.

The task template into which the parameter or parameters will be substituted is defined in `repeatTask`. Substitutions are achieved
through the use of placeholders. A placeholder for parameter substitutions is represented by `{0}`. The number 0 here represents
the index of the parameter set to be substituted. Where a literal `{` or `}` character is required, it can be escaped 
by duplicating it: `{{` or `}}`. The parameter can also be padded with zeros to a maximum length of 9 characters by using the format
`{0:4}` where the number 0 represents the index of the parameter set and the parameter will be zero-padded to 4 characters, e.g.: `0001`. 

The above task factory would be expanded into the following tasks:
```
"tasks": [
  {
    "id" : "0",
    "commandLine": "ffmpeg -i sampleVideo1.mkv -vcodec copy -acodec copy output1.mp4 -y",
  },
  {
    "id" : "1",
    "commandLine": "ffmpeg -i sampleVideo2.mkv -vcodec copy -acodec copy output2.mp4 -y",
  },
  {
    ...
  },
  {
    "id" : "499",
    "commandLine": "ffmpeg -i sampleVideo500.mkv -vcodec copy -acodec copy output500.mp4 -y",
  }
]
```

An example of a task factory with a two-dimensional sweep with zero-padding:

```json
"job": {
  "id": "my-ffmpeg-job",
  "poolInfo": {
    "poolId": "my-ffmpeg-pool"
  },
  "taskFactory": {
    "type": "parametricSweep",
    "parameterSets": [
        {
          "start": 1,
          "end": 500,
          "step": 1
        },
        {
          "start": 500,
          "end": 1000,
          "step": 500
        }
    ],
    "repeatTask": {
        "commandLine": "ffmpeg -i sampleVideo_{0:3}.mkv -vcodec copy -acodec copy scale={1}:{1} output_x{1}_{0:3}.mp4 -y",
    }
  }
}
```

Where the following tasks would be created:
```
"tasks": [
  {
    "id" : "0",
    "commandLine": "ffmpeg -i sampleVideo_001.mkv -vcodec copy -acodec copy scale=500:500 output_x500_001.mp4 -y",
  },
  {
    "id" : "1",
    "commandLine": "ffmpeg -i sampleVideo_001.mkv -vcodec copy -acodec copy scale=1000:1000 output_x1000_001_.mp4 -y",
  },
  {
    "id" : "2",
    "commandLine": "ffmpeg -i sampleVideo_002.mkv -vcodec copy -acodec copy scale=500:500 output_x500_002.mp4 -y",
  },
  {
    "id" : "3",
    "commandLine": "ffmpeg -i sampleVideo_002.mkv -vcodec copy -acodec copy scale=1000:1000 output_x1000_002.mp4 -y",
  },
  {
    ...
  },
  {
    "id" : "998",
    "commandLine": "ffmpeg -i sampleVideo500.mkv -vcodec copy -acodec copy scale=500:500 output_x500_500.mp4 -y",
  },
  {
    "id" : "999",
    "commandLine": "ffmpeg -i sampleVideo500.mkv -vcodec copy -acodec copy scale=1000:1000 output_x1000_500.mp4 -y",
  }
]
```