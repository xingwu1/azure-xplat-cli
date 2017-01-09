# New Features for Azure Batch

These experimental features provide new ways to work with Azure Batch without needing to write your own applications. See the [included samples](samples) for some ideas on use.

## [Input file upload](inputFiles.md)

A new command to allow a user to upload a set of files directly into the storage account linked to their Azure Batch account.

Example commands:
```bash
azure batch file upload C:\data\**\*.png raw-images

azure batch file upload /tmp/data/**/*.png raw-images
```

## [Output file upload](outputFiles.md)

When adding a task, you can now declare a list of output files to be automatically uploaded to an Azure Storage container of your choice when the task completes.

## [Templates](templates.md)

Templates allow pools and jobs to be defined in parameterized json files with a format inspired by ARM templates.

## [Task Factories](taskFactories.md)

Task factories provide a way for a job and all its tasks to be created in one command instead
of calling `azure batch task create` for each task.

There are currently three kinds of task factory:

* Task Collection - tasks are explicitly defined as a part of the job
* Parametric Sweep - a set of tasks are created by substituting a range or sequence of values into a template 
* Per File - a template task is replicated for each available input file 

## [Shipyard (Docker)](shipyard.md)

An integration with Batch Shipyard to allow you to provision Batch compute nodes with Docker containers and to schedule Docker workloads. For more information on Batch Shipyard, see its [GitHub page](https://github.com/azure/batch-shipyard).

**Note:** This feature is only available on Linux VMs.

## [Application Templates](application-templates.md)

Application templates provides a way to partition the details of a job into two parts.

All of the details about how the job should be processed are moved into the **application template**, creating a reusable definition that is independent of a particular account. Application templates are parameterized to allow the processing to be customized without requiring modification of the template itself.

## [Package managers](packages.md)

Integration with existing 3rd party package managers to streamline the installation of applications. Currently the following package managers are supported:

* Chocolatey - for Windows
* APT - as used by some Linux distros including Ubuntu, Debian, and Fedora. 
* Yum - a package manager used by some Linux distros including  Red Hat Enterprise Linux, Fedora, CentOS. 

