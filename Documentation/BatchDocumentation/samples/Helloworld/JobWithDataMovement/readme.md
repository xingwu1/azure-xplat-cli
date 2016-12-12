# Azure Batch parametric sweep with job template
This template shows how to create a parametric sweep job which runs on an VirtualMachineConfiguration based autopool. It will also demonstrate how to use ResourceFiles and OutputFiles to automatically download/upload files to/from the virtual machine.

## Prerequisites
You must have an Azure Batch account set up with a linked Azure Storage account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Upload files
Run command `azure batch file upload <path> <group>` on a folder containing some text files which are named with numerically increasing names with `input` prefix (i.e. `input1.txt`, `input2.txt`, `input3.txt`, etc).

## Preparation
Fill out `job.parameters.json`. If you want to configure other options of the job, such as the pool id, you can look in the `job.json` parameters section to see what options are available.
Please make sure the provided values are correct:

1. Specify the `<group>` used in your upload command as the `testData` parameter.
2. `taskStart` should be the number of your first file (i.e. **1** for `input1.txt`) and `taskEnd` should be the number of your last file (i.e. **3** for `input3.txt`).
3. The `outputStorageUrl` should be a valid writable SAS key.

## Run commands
Run `azure batch job create --template job.json --parameters job.parameters.json` to create your job with some tasks.
This job uses an autopool which will be automatically deleted once the job finishes. 

## Monitor the job
You can use the `azure batch task list --job-id <jobid>` to monitor the tasks in the job and their progress.
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

