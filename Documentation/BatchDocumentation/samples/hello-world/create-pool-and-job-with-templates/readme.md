# Azure Batch Pool/Job Template

This sample shows how to create a pool, and run a parametric sweep job on it, using *parameterised* templates.

The pool template allows you to specify the number of virtual machines and their size through parameters.

The job template allows you to specify the scope of the parametric sweep through parameters.

## Prerequisites
You will need an Azure Batch account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Preparation
Fill out `pool.parameters.json` and `job.parameters.json`.

Ensure the `poolId` parameter in each parameter file is the same.

## Run commands
To create your pool:
``` bash
azure batch pool create --template pool.json --parameters pool.parameters.json
```

**You are billed for your Azure Batch pools, so don't forget to delete it through the [Azure portal](https://portal.azure.com) when you're done.** 

To create your job:
``` bash
azure batch job create --template job.json --parameters job.parameters.json
``` 

## Monitor the job
You can use this command to monitor the tasks in the job and their progress:
``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

## Structure of the sample

### pool.json
The file `pool.json` contains a template for defining a new pool with three parameters defined:

| Parameter | Required | Description                                                                                                           |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| poolId    | Required | The id of the Azure Batch pool                                                                                        |
| vmCount   | Optional | The number of virtual machines <br/> Defaults to **3** if not otherwise specified                                         |
| vmSize    | Optional | The zie of the virtual machines that run the application <br/> Defaults to **STANDARD_D1_V2** if not otherwise specified. |

### pool.parameters.json

The file `pool.parameters.json` provides values for the parameters defined in `pool.json`. You will need to provide a value for `poolId` before pool creation will succeed. If you do not want to use the default values for `vmCount` or `vmSize`, add values for those parameters to this file before creating the pool.

### job.json

The file `job.json` contains a template for a new job with four parameters defined:

| Parameter | Required  | Description                                   |
| --------- | --------- | --------------------------------------------- |
| jobId     | Mandatory | The id of Azure Batch job                     |
| poolId    | Mandatory | The id of Azure Batch pool which runs the job |
| taskStart | Mandatory | The sweep start parameter                     |
| taskEnd   | Mandatory | The sweep end parameter                       |

Note that the **taskFactory** feature used in `job.json` is an experimental feature currently only available through the XPlat CLI.

### job.parameters.json

The file `job.parameters.json` provides values for the parameters defined in `job.json`. You will need to provide actual values for these parameters before job creation will succeed.

## Troubleshooting

### "The value provided for one of the properties in the request body is invalid."

This error will occur during pool creation if you have not modified the `pool.parameters.json` to provide a legal pool id.

This error will occur during job creation if you have not modified the parameters in `job.parameters.json` to specify the job id, pool id and so on.

In either case, review the `azure.err` listed in the logs to see more details about the error.

