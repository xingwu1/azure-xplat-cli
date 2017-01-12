# Azure Batch OCR Job Template

This sample shows how to use `ghostscript` and `tesseract-ocr` to transform PDF files into plain text files (`.txt`). It does this in two stages:

1. Use `ghostscript` to convert a PDF to a set of PNG files (one for each page of the PDF).
2. Use `tesseract-ocr` to convert the PNG images into plain text files (`.txt`).

## Prerequisites

You must have an Azure Batch account set up with a linked Azure Storage account.

## Create a pool

To create your pool using the default settings (A pool named 'ocr-pool' with 3 STANDARD_D1_V2 VMs):

```bash
azure batch pool create --template pool.json
```

If you want to change the default values of the pool creation, you can create a JSON file to supply the parameters of your pool. If you have a large number of files to convert, you should use a larger pool or bigger VMs in the pool. 

In order to create the pool with your own configurations, run:
```bash
azure batch pool create --template pool.json --parameters <your settings JSON file>
```

**You are billed for your Azure Batch pools, so don't forget to delete it through the [Azure portal](https://portal.azure.com) when you're done.** 

## Upload files

To upload your PDF files:

```bash
azure batch file upload <path> <group>
```

Run this command on a folder containing PDF files which are named with numerically increasing names (i.e. `1.pdf`, `2.pdf`, `3.pdf`, etc). It is important that there are no gaps in the numbering of the files.

## Create a job and tasks

Edit the `job.parameters.json` file to supply parameters to the template. If you want to configure other options of the job, such as the the pool id, you can look in the `job.json` parameters section to see what options are available.


| Parameter            | Required  | Description                                                                                                                                    |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| jobId                | Mandatory | The id of the Azure Batch job. <br/> Must match the id of the pool you created earlier.                                                        |
| poolId               | Optional  | The id of the Azure Batch pool to run on. <br/> Default value if not otherwise specified: `ocrpool`                                            |
| firstPdfId           | Mandatory | The name of the first PDF (without the .pdf extension). <br/> For example, supply the value **1** to reference file `1.pdf`.                   |
| lastPdfId            | Mandatory | The name of the last PDF (without the .pdf extension). <br/> For example, supply the value **10** to reference file `10.pdf`.                  |
| inputFileGroup       | Mandatory | The file group containing the input files. <br/> Must match the name of the file group used by your `azure batch file upload` command earlier. |
| outputFileStorageUrl | Mandatory | A storage SAS URL to a container with write access.                                                                                            |


## Run the job

To create your job and tasks:
```bash
azure batch job create --template job.json --parameters job.parameters.json
```

The outputs of the tasks will be uploaded to the Azure Storage container which you specified as the individual tasks complete.
The target container will contain a new virtual directory for each task that ran.

## Monitor the job

You can use this command to monitor the tasks in the job and their progress:
``` bash
azure batch task list --job-id <jobid>`
```
You can also use the [Azure portal](https://portal.azure.com) or [Batch Explorer](https://github.com/Azure/azure-batch-samples/tree/master/CSharp/BatchExplorer) for monitoring.

### Structure of the sample

| File                  | Content                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `pool.json`           | A template for creating the pool required for OCR processing.                                          |
| `job.json`            | A template for the job to run, including parameter definitions and a **parametricSweep** task factory. |
| `job.parameters.json` | Provides values for the parameters defined in `job.json`.                                              |
