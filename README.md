# Microsoft Azure Batch preview Xplat-CLI for Windows, Mac and Linux

[![NPM version](https://badge.fury.io/js/azure-cli.png)](http://badge.fury.io/js/azure-cli) [![Build Status](https://travis-ci.org/Azure/azure-xplat-cli.png?branch=master)](https://travis-ci.org/Azure/azure-xplat-cli)

This project is a preview build of the Microsoft Azure command-line interface to demonstrate proposed features in Azure Batch.
For further details on the Xplat-CLI, please check the [official documentation](https://azure.microsoft.com/documentation/articles/xplat-cli-install/).

The purpose of this project is to allow customers to try out proposed Batch features and provide feedback to help shape the direction of the Batch service.
The features presented here may not be compatible with other Batch client SDKs and tools, nor will they necessarily be adopted into the core Batch service.

As these features are still in preview, they will be updated regularly, and refined based on customer feedback.
Unfortunately this may result in occasional breaking changes, though every effort will be made to keep this to a minimum.

## Features

### [Input data upload to Batch linked storage accounts](Documentation/BatchDocumentation/inputFiles.md#input-file-upload)

A new command to allow a user to upload a set of files directly into the storage account linked to their Azure Batch account.

### [Input data references using linked storage accounts](Documentation/BatchDocumentation/inputFiles.md#referencing-input-data)

Input data stored in linked storage under a file group can be simply referenced by a task by using some new ResourceFile properties. 

### [Automatic persistence of task output files to Azure Storage](Documentation/BatchDocumentation/outputFiles.md)

When adding a task, you can now declare a list of output files to be automatically uploaded to an Azure Storage container of your choice when the task completes.

### [Pool and job templates with parameterization](Documentation/BatchDocumentation/templates.md)

Templates allow pools and jobs to be defined in parameterized json files with a format inspired by ARM templates.

### [Task factories for automatic task generation on job submission](Documentation/BatchDocumentation/taskFactories.md)

Task factories provide a way for a job and all its tasks to be created in one command instead
of calling `azure batch task create` for each task. There are currently three kinds of task factory:

* [Task Collection](Documentation/BatchDocumentation/taskFactories.md#task-collection) - tasks are explicitly defined as a part of the job
* [Parametric Sweep](Documentation/BatchDocumentation/taskFactories.md#parametric-sweep) - a set of tasks are created by substituting a range or sequence of values into a template 
* [Per File](Documentation/BatchDocumentation/taskFactories.md#task-per-file) - a template task is replicated for each available input file 

### [Container-based workflows through integration with Batch Shipyard (Docker)](Documentation/BatchDocumentation/shipyard.md)

An integration with Batch Shipyard to allow you to provision Batch compute nodes with Docker containers and to schedule Docker workloads. For more information on Batch Shipyard, see its [GitHub page](https://github.com/azure/batch-shipyard).

**Note:** This feature is only available on Linux VMs.

### [Split job configuration and management with reusable application templates](Documentation/BatchDocumentation/application-templates.md)

Application templates provide a way to partition the details of a job into two parts.

All of the details about how the job should be processed are moved into the **application template**, creating a reusable definition that is independent of a particular account. Application templates are parameterized to allow the processing to be customized without requiring modification of the template itself.

### [Easy software installation via package managers](Documentation/BatchDocumentation/packages.md)

Integration with existing 3rd party package managers to streamline the installation of applications. Currently the following package managers are supported:

* Chocolatey - for Windows
* APT - as used by some Linux distros including Ubuntu, Debian, and Fedora. 
* Yum - a package manager used by some Linux distros including  Red Hat Enterprise Linux, Fedora, CentOS. 

### Limitations

At this point, the following features will only work with Batch IaaS VMs using Linux (excluding Oracle Linux). IaaS VMs in Batch
are created with a VirtualMachineConfiguration as documented in the [Batch API documentation](https://msdn.microsoft.com/library/azure/dn820174.aspx#bk_vmconf).
- Automatic task output-file persistence
- Using Docker container via Batch Shipyard integration

## Samples

Samples for all of the preview features can be found at [Documentation/BatchDocumentation/samples](Documentation/BatchDocumentation/samples).

## Installation

### For existing users of the Xplat-CLI

This build of the Xplat-CLI cannot be run concurrently with the official release of the CLI. In order to install it, the official
release will first need to be uninstalled.

- Uninstall the previously installed CLI
   - If you installed via MSI, then uninstall the Windows MSI. For Mac installer `sudo azure-uninstall -g`
   - If you installed via npm then execute: `npm uninstall azure-cli –g`
- Clear the global cache: `npm cache clear –g`
- Delete the .streamline folder from your user profile folder or home directory if present. 
  - On Windows: `C:\Users\<username>\.streamline`
  - On Linux: `~/.streamline`

### To install the Azure Batch preview CLI

- Install from the tarball straight from GitHub: `npm install –g https://github.com/Azure/azure-xplat-cli/archive/batch-beta.tar.gz`

Note: To install via npm, you may need to run a command prompt as administrator (Windows) or use sudo (Linux/Mac).


### Installing the latest version of node.js on different Linux distributions

This [document](https://nodejs.org/en/download/package-manager/#installing-node-js-via-package-manager) provides instructions to install the latest version of node.js on a Linux system. After successful installation of node.js, you can install via npm as decribed above.



## Configuration, authentication and getting started with Xplat-CLI

For more information on getting started with the Xplat-CLI, please read the [official documentation](https://github.com/Azure/azure-xplat-cli).

## Azure Batch account requirements

In order to make use of the new features previewed here, you will need an Azure Batch account with a linked storage account.
For more information on this, see [Create an Azure Batch account using the Azure Portal](https://azure.microsoft.com/documentation/articles/batch-account-create-portal).

You can also read [Get started with Azure Batch CLI](https://azure.microsoft.com/documentation/articles/batch-cli-get-started/) for more details on interacting with your Batch account using the Xplat-CLI.
