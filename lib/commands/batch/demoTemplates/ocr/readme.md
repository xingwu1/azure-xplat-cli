# Azure Batch OCR Job Template
This template shows how to use `ghostscript` and `tesseract-ocr` to transform PDF files into plain text files (`.txt`). It does this in two stages:

1. Use `ghostscript` to convert a PDF to a set of PNG files (one for each page of the PDF).
2. Use `tesseract-ocr` to convert the PNG images into plain text files (`.txt`).

## Prerequisites
You must have an Azure Batch account set up with a linked Azure Storage account.

## Create a pool
Edit the `pool.parameters.json` file to supply the parameters of your pool. If you have a large number of PDF files 
to convert, you should use a larger pool or bigger VMs in the pool.

Run `azure batch pool create --template pool.json --parameters pool.parameters.json` to create your pool. If you want to just use the template
defaults you can omit the `--parameters pool.parameters.json`.

**You are billed for your Azure Batch pools, so don't forget to delete it when you're done.**

## Upload files
Run command `azure batch file upload <path> <group>` on a folder containing PDF files which are named with numerically increasing names (i.e. `1.pdf`, `2.pdf`, `3.pdf`, etc).

## Create a job and tasks
Edit the `job.parameters.json` file to supply parameters to the template.

1. `poolId` must match the pool you created earlier.
2. `firstPdfId` must match the first PDF file you uploaded earlier (specify `1` to reference `1.pdf`).
3. `lastPdfId` must match the last PDF file you uploaded earlier (specify `10` to reference `10.pdf`).
4. `inputFileGroup` must match the name of the group used in the `azure batch file upload` command earlier.
5. `outputFileStorageUrl` must be a writable SAS to an Azure Storage container.

## Run the job
Run `azure batch job create --template job.json --parameters job.parameters.json` to create your job and tasks.
You can use the `azure batch task list --job-id <jobid>` to monitor the tasks in the job and their progress.
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

The outputs of the tasks will be uploaded to the Azure Storage container which you specified as the individual tasks complete.
The target container will contain a new virtual directory for each task that ran.