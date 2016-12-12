# Azure Batch data movement using application templates
This template shows how to create a parametric sweep job using an *application template* to separate the logic of processing from administration and management.

With an application template, the processing steps required for the job are defined in a separate file - see `movement-template.json` which is appropriately parameterized. The job itself references the template, supplies any required parameter values and specifies the pool on which the job is to run.

This sample also demonstrates how to use `ResourceFiles` and `OutputFiles` to automatically download files to the virtual machine and to upload the output after the task completes.

## Prerequisites
You must have an Azure Batch account set up with a linked Azure Storage account. See [Create an Azure Batch account using the Azure portal](https://docs.microsoft.com/azure/batch/batch-account-create-portal) for details.

## Upload files
Run command `azure batch file upload <path> <group>` on a folder containing some text files which are named with numerically increasing names with `input` prefix (i.e. `input1.txt`, `input2.txt`, `input3.txt`, etc).

## Preparation
Fill out the parameter placeholders in `movement-job.json`:

| Parameter        | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- |
| testData         | The same prefix as you used for `<group>` when you uploaded files in the previous step |
| taskStart        | The index number of your first file (i.e. 1 for `input1.txt`).                         |
| taskEnd          | The index number of your last file (i.e. 3 for `input3.txt`)                           |
| outputStorageUrl | A valid (non-expired) writable SAS key                                                 |

To customize the job id or any of the details of the autopool, modify the appropriate details in `movementjob.json`. These are not parameterized because they are not specified in the template file. 

## Run commands
Run `azure batch job create --json-file movement-job.json` to create your job with some tasks.

This job uses an autopool which will be automatically deleted once the job finishes. 

## Monitor the job
You can use the `azure batch task list --job-id <jobid>` to monitor the tasks in the job and their progress.
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

