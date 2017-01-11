# Azure Batch MPI Template
This template shows how to use `MS-MPI` to run MPI work.

## Prerequisites
You must have an Azure Batch account set up with a linked Azure Storage account.
To successfully run this sample, you must first create an [application package](https://docs.microsoft.com/azure/batch/batch-application-packages) containing [MSMpiSetup.exe](https://msdn.microsoft.com/library/bb524831.aspx) (installed on a pool's compute nodes with a start task) and an MS-MPI program for the multi-instance task to execute. For the latter, we provide the [MPIHelloWorld sample project](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/ArticleProjects/MultiInstanceTasks/MPIHelloWorld) for you to compile and use as your MS-MPI program.

The following command can be used as example to create the application package:

1. Run command `azure batch application create --application-id MPIHelloWorld --account-name <account name> --resource-group <resource group>` to create an application named `MPIHelloWorld`.
2. Download MSMpiSetup.exe and zip it.
3. Run command `azure batch application package create --application-id MPIHelloWorld --version 1.0 --account-name <account name> --resource-group <resource group> --package-file <the local path to zip file>` to create an package version as `1.0` under the application `MPIHelloWorld`.
4. Run command `azure batch application package activate --application-id MPIHelloWorld --version 1.0 --account-name <account name> --resource-group <resource group> --format zip` to activate the application package `MPIHelloWorld:1.0`. 

## Create a pool
Run `azure batch pool create --template pool.json` to create your pool using the default settings (A pool named 'MultiInstanceSamplePool' with 3 small VMs). 

If you want to change the default values of the pool creation, you can create a JSON file to supply the parameters of your pool, run `azure batch pool create --template pool.json --parameters <your settings JSON file>`.

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**

## Upload files
Run command `azure batch file upload <path> <group>` on a folder containing MPIHelloWorld.exe and its dependencies which are named with numerically increasing names with `sample` prefix (i.e. `sample1.wav`, `sample2.wave`, `sample3.wav`, etc).

**Build a Release version of MPIHelloWorld.exe so that you don't have to include any additional dependencies as resource files (ex: msvcp140d.dll or vcruntime140d.dll).

## Create a job with MPI task
Run `azure batch job create --template job.json` to create your job using the default settings. If you want to configure other options of the job, such as the the pool id, you can look in the `job.json` parameters section to see what options are available.

1. `poolId` must match the pool you created earlier.
2. `inputFileGroup` must match the name of the group used in the `azure batch file upload` command earlier.
3. `jobId` is the id of job, which must not exist in the current Batch account.
4. `vmCount` is the number of VM instances to execute the multi-instance task on.  It must be less than or equal to the pool's VM count.

To create a job with a different configuration, you can run command `azure batch job create --template job.json --parameters <your settings JSON file>`.

## Monitor the job

You can use this command to monitor the tasks in the job and their progress:
``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.
