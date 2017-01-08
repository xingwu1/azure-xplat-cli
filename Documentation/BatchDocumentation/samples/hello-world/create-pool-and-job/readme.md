# Azure Batch Pool/Job Template

This sample shows how to create a pool, and run a simple job on it using templates.

The pool is a standard *cloud service configuration* pool with a single small virtual machine.

The job contains just one task, echoing the greeting "Hello World" to standard output.

## Prerequisites

You will need an Azure Batch account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Create Pool

To create your pool:

```bash
azure batch pool create --template pool.json
``` 

The template specifies an Azure Batch Pool with the id `helloword-pool` that contains a single small virtual machine running Windows.

**You are billed for your Azure Batch pools, so don't forget to delete it through the [Azure portal](https://portal.azure.com) when you're done.** 

## Create Job

To create your job:

``` bash
azure batch job create --template job.json
```

The template specifies a job with one task, printing *Hello World* to standard output.

## Monitor the job

``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

## Structure of the sample

The file `pool.json` contains a template specifying the pool to create.

The file `job.json` contains a template specifying the job to run on the pool.

To change either the pool or the job, modify the details within the `properties` element of the template in the appropriate file.

For more information on the properties available when creating a new pool, see [*Add a pool*](https://docs.microsoft.com/en-us/rest/api/batchservice/pool) from the [Batch REST API](https://docs.microsoft.com/en-us/rest/api/batchservice/) reference.

 For more information on the properties available when creating jobs and tasks see [*Add a job*](https://docs.microsoft.com/en-us/rest/api/batchservice/job) and [*Add a task*](https://docs.microsoft.com/en-us/rest/api/batchservice/task).

 Note that the **taskFactory** feature used in `job.json` is not documented as a part of the REST API as it is currently an experimental feature only available through the XPlat CLI.