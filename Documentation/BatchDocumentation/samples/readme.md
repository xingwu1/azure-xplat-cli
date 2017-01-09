# Azure Batch Samples

Here are a collection of samples to demonstrate the new features in this Batch preview CLI.

## Hello World Samples

These samples use the new features in very simple ways to make it easier to see how these features might fit into your workflow.

### [Create Pool and Job](hello-world/create-pool-and-job)

Create a pool and then run a job with a single task. Both the pool and the job are defined using templates with hard coded values.

### [Create Pool and Job with templates](hello-world/create-pool-and-job-with-templates)

Create a pool and then run a job with a single task. Both the pool and the job are defined using a parameterized templates. Parameter values used to fill out the templates are stored in separate files that are easy to modify as required.

### [Task Per File](hello-world/taskPerFile)

Run a specific piece of processing independently across a set of files that are uploaded into storage. The job is specified as a template accepting parameters.

### [Task Per File with Application Template](hello-world/taskPerFile-appTemplate)

Run a specific piece of processing independently across a set of files that are uploaded into storage. The job is split into two parts - a reusable *application template* defining the required processing and a specific use *job* that references the template while specifying parameters, pool information and other management details.

## Real World Samples

These samples show how to use the new features with real world applications.

### [FFmpeg](ffmpeg)

FFmpeg is an open-source command line tool for processing multimedia files. This is a sample demonstrating
audio compression with Azure Batch on a large number of numerically-named files using a parametric sweep.

### [OCR](ocr)

OCR (Optical Character Recognition) is the process of extracting text from PDF images. This sample demonstrates the batch
processing of PDF files.

### [MPI](mpi)

This sample demonstrates the batch run a MPI task with MultiInstanceSettings feature.

### [Blender](blender)

Blender is an open-source 3D content creation suite. This sample demonstrates distributed rendering on Azure Batch.

### [Docker - Caffe](docker)

Caffe is an open-source deep learning framework. This sample demonstrates configuration of Caffe via Docker integration using 
Shipyard.
