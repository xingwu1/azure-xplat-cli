# Azure Batch Pool/Job Template
This template shows how to create a standard VirtualMachineConfiguration based pool, and run a simple parametric sweep job on it.

## Prerequisites
You must have an Azure Batch account.

## Preparation
Fill out `pool.parameters.json` and `job.parameters.json`.
Please make sure the poolId parameter in each parameter file should match.

## Run commands
Run `azure batch pool create --template pool.json --parameters pool.parameters.json` to create your pool.
Run `azure batch job create --template job.json --parameters job.parameters.json` to create your job with some tasks. 

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**

## Monitor the job
You can use the `azure batch task list --job-id <jobid>` to monitor the tasks in the job and their progress.
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

