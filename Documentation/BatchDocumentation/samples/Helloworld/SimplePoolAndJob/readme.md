# Azure Batch Pool/Job Template
This template shows how to create a standard CloudServiceConfiguration based pool, and run a simple job on it.

## Prerequisites
You will need an Azure Batch account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Create a pool and a job
To create your pool, run the following command:
``` bash
azure batch pool create --template pool.json
```
The pool will have 1 small VMs with Windows OS.

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**

To create your job, run the following command:
``` bash
azure batch job create --template job.json
```
The job will have 1 task which prints the phrase 'Hello world'.

## Monitor the job
You can use this command to monitor the tasks in the job and their progress:
``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

