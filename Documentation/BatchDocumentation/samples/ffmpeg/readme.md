# Azure Batch FFMpeg Pool/Job Template
This template shows how to use `ffmpeg` to convert one kind of media file (`WAV`) to another type media file (`MP3`).

## Prerequisites
You must have an Azure Batch account set up with a linked Azure Storage account.

## Create a pool
Run `azure batch pool create --template pool.json` to create your pool using the default settings (A pool named 'ffmpeg-pool' with 3 STANDARD_D1 VMs). 

If you want to change the default values of the pool creation, you can create a JSON file to supply the parameters of your pool. If you have a large number of media files 
to convert, you should use a larger pool or bigger VMs in the pool. In order to create the pool with your own configurations, run `azure batch pool create --template pool.json --parameters <your settings JSON file>`.

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**

## Upload files
Run command `azure batch file upload <path> <group>` on a folder containing media files (`*.wav`) which are named with numerically increasing names with `sample` prefix (i.e. `sample1.wav`, `sample2.wave`, `sample3.wav`, etc).

## Create a job with parametric sweep tasks
Edit the `job.parameters.json` file to supply parameters to the template. If you want to configure other options of the job, such as the the pool id, you can look in the `job.json` parameters section to see what options are available.

1. `poolId` must match the pool you created earlier.
2. `inputFileGroup` must match the name of the group used in the `azure batch file upload` command earlier.
3. `outputFileStorageUrl` must be a writable SAS to an Azure Storage container.
4. `jobId` is the id of job, which must not exist in current Batch account.
5. `taskStart` must match the first WAV file you uploaded earlier (specify `1` to reference `sample1.pdf`).
6. `taskEnd` must match the last WAV file you uploaded earlier (specify `10` to reference `sample10.pdf`).

## Run the job
Run `azure batch job create --template job.json --parameters job.parameters.json` to create your job and tasks.

## Monitor the job
You can use the `azure batch task list --job-id <jobid>` to monitor the tasks in the job and their progress.
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

The outputs of the tasks will be uploaded to the Azure Storage container which you specified as the individual tasks complete.
The target container will contain a new virtual directory for each task that ran.