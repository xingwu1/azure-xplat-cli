# Azure Batch MPI Template

This samples shows how to use `MS-MPI` to run MPI work.

## Features used by this sample

* [Pool and Job templates with parameterization](Documentation/BatchDocumentation/templates.md)
* [Task collection factory](Documentation/BatchDocumentation/taskFactories.md#task-collection)

## Prerequisites

You must have an Azure Batch account set up with a linked Azure Storage account.

## Create application package

To successfully run this sample, you must first create an [application package](https://docs.microsoft.com/azure/batch/batch-application-packages) containing [MSMpiSetup.exe](https://msdn.microsoft.com/library/bb524831.aspx) (installed on a pool's compute nodes with a start task) and an MS-MPI program for the multi-instance task to execute. For the latter, we provide the [MPIHelloWorld sample project](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/ArticleProjects/MultiInstanceTasks/MPIHelloWorld) for you to compile and use as your MS-MPI program.

The following commands can be used as example to create the application package:

First, create the application package `MPIHelloWorld` itself:

```bash
azure batch application create --application-id MPIHelloWorld --account-name <account name> --resource-group <resource group>
```
You will need to supply your own values for `<account name>` and `<resource group>`.

Next, download MSMpiSetup.exe and zip it.

Create version `1.0` of the application `MPIHelloWorld`:

```bash
azure batch application package create --application-id MPIHelloWorld --version 1.0 --account-name <account name> --resource-group <resource group> --package-file <the local path to zip file>
```

Finally, activate the application package `MPIHelloWorld:1.0`:

```bash
azure batch application package activate --application-id MPIHelloWorld --version 1.0 --account-name <account name> --resource-group <resource group> --format zip
```

## Create a pool

Create your pool:

```bash
azure batch pool create --template pool.json
```
The default settings in `pool.json` specify a pool named `MultiInstanceSamplePool` containing **3** **small** virtual machines.

If you want to change the default values of the pool creation, create a JSON file to supply the parameters of your pool and include it on your command line:

```bash
azure batch pool create --template pool.json --parameters <your settings JSON file>
```

**You are billed for your Azure Batch pools, so don't forget to delete this pool through the [Azure portal](https://portal.azure.com) when you're done.** 

## Upload files

Upload files from a folder:

```bash
azure batch file upload <path> <group>
```

Run this in a folder containing MPIHelloWorld.exe and its dependencies. The parametric sweep expects the files to be named `sample1.wav`, `sample2.wav`, `sample3.wav` and so on - each with the prefix `sample` and an increasing index number. It's important that your files are sequentially numbered with no gaps.

**Recommended**: Build a Release version of MPIHelloWorld.exe so that you don't have to include any additional dependencies as resource files (e.g.: `msvcp140d.dll` or `vcruntime140d.dll`).

## Create a job with an MPI task

To create your job with default settings:

```bash
azure batch job create --template job.json
```

If you want to configure other options of the job, such as the the pool id, you can look in the `job.json` parameters section to see what options are available.

1. `poolId` must match the pool you created earlier.
2. `inputFileGroup` must match the name of the group used in the `azure batch file upload` command earlier.
3. `jobId` is the id of job, which must not exist in the current Batch account.
4. `vmCount` is the number of VM instances to execute the multi-instance task on.  It must be less than or equal to the pool's VM count.

To create a job with a different configuration: 

```bash
azure batch job create --template job.json --parameters <your settings JSON file>
```

## Monitor the job

You can use this command to monitor the tasks in the job and their progress:
``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.
