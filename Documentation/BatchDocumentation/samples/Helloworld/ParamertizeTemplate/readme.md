# Azure Batch Pool/Job Template
This template shows how to create a standard VirtualMachineConfiguration based pool, and run a simple parametric sweep job on it.

## Prerequisites
You will need an Azure Batch account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Preparation
Fill out `pool.parameters.json` and `job.parameters.json`.
Please make sure the poolId parameter in each parameter file should match.

## Run commands
To create your pool, run this command:
``` bash
azure batch pool create --template pool.json --parameters pool.parameters.json
```

To create your job, run this command:
``` bash
azure batch job create --template job.json --parameters job.parameters.json
``` 

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**

## Monitor the job
You can use this command to monitor the tasks in the job and their progress:
``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.


