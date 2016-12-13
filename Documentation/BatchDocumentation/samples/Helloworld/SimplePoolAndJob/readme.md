# Azure Batch Pool/Job Template
This template shows how to create a standard CloudServiceConfiguration based pool, and run a simple job on it.

## Prerequisites
You will need an Azure Batch account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Create a pool and a job
Run `azure batch pool create --template pool.json` to create your pool. The pool will have 1 small VMs with Windows OS.
Run `azure batch job create --template job.json` to create your job. The job will have 1 task which print 'Hello world' string.

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**
