//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var __ = require('underscore');
var util = require('util');
var fs = require('fs');
var utils = require('../../util/utils');
var batchUtil = require('./batch.util');

var $ = utils.getLocaleString;

var AZURE_FILE_VOLUME_TYPE = 'azurefile';

var batchShipyardUtils = {};

/**
 * Gets the label of the AutoStorage account to use in the credentials.json file
 */
batchShipyardUtils.getAutoStorageCredentialsLabel = function () {
  return 'autostorage_account';
}

/**
 * Generates a label for a task data volume.
 */
batchShipyardUtils.generateDataVolumeLabel = function(taskId, dataVolumeIndex) {
  return taskId + '_' + dataVolumeIndex;
}

/**
 * Use Batch Shipyard to create a pool.
 * @param {object} poolJson      the expanded pool definition
 * @param {object} options       the commandline options
 * @param {object} cli           the cli object
 * @param {callback} _           callback function
 */
batchShipyardUtils.createPool = function (poolJson, options, cli, _) {
  var credentialsJson = batchShipyardUtils.createCredentialsJson(options);
  var configJson = batchShipyardUtils.createConfigJsonFromPool(poolJson);
  var batchShipyardPoolJson = batchShipyardUtils.createBatchShipyardPoolJson(poolJson);

  // Warn about ignored properties
  var ignoredProperties = batchShipyardUtils.getIgnoredPoolPropertyNames(poolJson);
  if (ignoredProperties.length !== 0) {
    cli.output.warn('When specifying dockerOptions, the following supplied pool properties will be ignored: ' + ignoredProperties.join(','));
  }

  // TODO: Replace this with...
  // Create temp directory
  // Write each json to file
  // Shell out to Shipyard
  // Write appropriate output/error info to shell
  // Cleanup directory
  cli.output.info(JSON.stringify(credentialsJson, null, 2));
  cli.output.info(JSON.stringify(configJson, null, 2));
  cli.output.info(JSON.stringify(batchShipyardPoolJson, null, 2));
};

/**
 * Use Batch Shipyard to create a job and add tasks.
 * @param {object} jobJson         the expanded job definition
 * @param {object} taskCollection  the collection of tasks to add
 * @param {object} options         the commandline options
 * @param {object} cli             the cli object
 * @param {callback} _             callback function
 */
batchShipyardUtils.createJobAndAddTasks = function (jobJson, taskCollection, options, cli, _) {
  var credentialsJson = batchShipyardUtils.createCredentialsJson(options);
  var configJson = batchShipyardUtils.createConfigJsonFromTasks(taskCollection);
  var batchShipyardJobJson = batchShipyardUtils.createBatchShipyardJobsJson(jobJson, taskCollection);

  // Warn about ignored properties
  var ignoredProperties = batchShipyardUtils.getIgnoredJobPropertyNames(jobJson);
  if (ignoredProperties.length !== 0) {
    cli.output.warn('When specifying dockerOptions, the following supplied job properties will be ignored: ' + ignoredProperties.join(','));
  }
  // The taskFactory can be used here to save cycles when processing a parametric sweep.
  // Parameter substitution only affects data values, not the specified properties names.
  ignoredProperties = batchShipyardUtils.getIgnoredTaskPropertyNamesFromFactory(jobJson.taskFactory);
  if (ignoredProperties.length !== 0) {
    cli.output.warn('When specifying dockerOptions, the following supplied task properties will be ignored: ' + ignoredProperties.join(','));
  }

  // TODO: Replace this with...
  // Create temp directory
  // Write each json to file
  // Shell out to Shipyard
  // Write appropriate output/error info to shell
  // Cleanup directory
  cli.output.info(JSON.stringify(credentialsJson, null, 2));
  cli.output.info(JSON.stringify(configJson, null, 2));
  cli.output.info(JSON.stringify(batchShipyardJobJson, null, 2));
};

/**
 * Create the content of the Batch Shipyard credentials.json file.
 * @param {object} options       the commandline options
 */
batchShipyardUtils.createCredentialsJson = function (options) {
  var batchAccountInfo = batchUtil.getBatchAccountInformation(options);
  // Get Storage info via AutoStorage

  var credentials = {};
  var batchCredentials = {};
  batchCredentials['account'] = batchAccountInfo.accountName;
  batchCredentials['account_key'] = batchAccountInfo.accountKey;
  batchCredentials['account_service_url'] = batchAccountInfo.accountEndpoint;
  credentials['batch'] = batchCredentials;

  var storageCredentials = {};
  // TODO: Get Auto Storage creds to populate this section
  //storageCredentials['account'] = account;
  //storageCredentials['account_key'] = key;
  //storageCredentials['endpoint'] = 'core.windows.net';
  var autoStorageLabelCredentials = {};
  autoStorageLabelCredentials[batchShipyardUtils.getAutoStorageCredentialsLabel()] = storageCredentials;
  credentials['storage'] = autoStorageLabelCredentials;

  return credentials;
}

/**
 * Create the 'batch_shipyard' section of the config.json file
 */
batchShipyardUtils.createConfigBatchShipyardSection = function() {
  var config = {};
  var batchShipyard = {};
  batchShipyard['storage_account_settings'] = batchShipyardUtils.getAutoStorageCredentialsLabel();
  batchShipyard['storage_entity_prefix'] = 'shipyard';
  config['batch_shipyard'] = batchShipyard;
  return config;
}

/**
 * Create the contents of the Batch Shipyard config.json file using an expanded pool definition.
 * @param {object} poolJson      the expanded pool definition
 */
batchShipyardUtils.createConfigJsonFromPool = function (poolJson) {
  var config = batchShipyardUtils.createConfigBatchShipyardSection();

  if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.registry)) {
    var dockerRegistry = {};
    if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.registry.login)) {
      var login = {};
      if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.registry.login.username)) {
        login['username'] = poolJson.clientExtensions.dockerOptions.registry.login.username;
      }
      if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.registry.login.password)) {
        login['password'] = poolJson.clientExtensions.dockerOptions.registry.login.password;
      }
      dockerRegistry['login'] = login;
    }
    if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.registry.private)) {
      var private = {};
      if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.registry.private.allowPublicPullOnMissing)) {
        private['allow_public_docker_hub_pull_on_missing'] = poolJson.clientExtensions.dockerOptions.registry.private.allowPublicPullOnMissing;
      }
      private['enabled'] = true;
      dockerRegistry['private'] = private;
    }

    config['docker_registry'] = dockerRegistry;
  }

  var globalResources = {};
  var dockerImages = [];
  if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.image)) {
    dockerImages.push(poolJson.clientExtensions.dockerOptions.image);
  }
  globalResources['docker_images'] = dockerImages;
  
  if (!__.isUndefined(poolJson.clientExtensions.dockerOptions.sharedDataVolumes)) {
    var sharedVolumes = {};
    poolJson.clientExtensions.dockerOptions.sharedDataVolumes.forEach(function(entry) {
      var sharedVolProperties = {};
      if (!__.isUndefined(entry.volumeType)) {
        sharedVolProperties['volume_driver'] = entry.volumeType;
        if (entry.volumeType === AZURE_FILE_VOLUME_TYPE) {
          // Set default mount options
          sharedVolProperties['mount_options'] = [ 'filemode=0777', 'dirmode=0777', 'nolock=true' ];
        }
      }
      sharedVolProperties['storage_account_settings'] = batchShipyardUtils.getAutoStorageCredentialsLabel();
      if (!__.isUndefined(entry.azureFileShareName)) {
        sharedVolProperties['azure_file_share_name'] = entry.azureFileShareName;
      }

      if (__.isUndefined(entry.name)) {
        throw new Error($('Shared data volume must have a name.'));
      }
      sharedVolumes[entry.name] = sharedVolProperties;
    });
    var dockerVolumes = {};
    dockerVolumes['shared_data_volumes'] = sharedVolumes;

    globalResources['docker_volumes'] = dockerVolumes;
  }

  config['global_resources'] = globalResources;
  return config;
}

/**
 * Create the contents of the Batch Shipyard config.json file using a collection of expanded task definitions.
 * @param {array} taskCollection  the collection of expanded task definitions
 */
batchShipyardUtils.createConfigJsonFromTasks = function (taskCollection) {
  var config = batchShipyardUtils.createConfigBatchShipyardSection();
  var globalResources = {};

  var dockerImages = [];
  var hasDataVolumes = false;
  var hasSharedVolumes = false;
  var dataVolumes = {};
  var sharedVolumes = {};
  taskCollection.forEach(function (task) {
    if (!__.isUndefined(task.clientExtensions.dockerOptions.image)) {
      dockerImages.push(task.clientExtensions.dockerOptions.image);
    }
    if (!__.isUndefined(task.clientExtensions.dockerOptions.dataVolumes)) {
      hasDataVolumes = true;
      task.clientExtensions.dockerOptions.dataVolumes.forEach(function (dataVol, index) {
        // Autogenerate a name for this volume
        var name = batchShipyardUtils.generateDataVolumeLabel(task.id, index);
        var volume = {};
        if (!__.isUndefined(dataVol.hostPath)) {
          volume['host_path'] = dataVol.hostPath;
        } 
        if (!__.isUndefined(dataVol.containerPath)) {
          volume['container_path'] = dataVol.containerPath;
        }
        dataVolumes[name] = volume;
      });
    }
    if (!__.isUndefined(task.clientExtensions.dockerOptions.sharedDataVolumes)) {
      hasSharedVolumes = true;
      task.clientExtensions.dockerOptions.sharedDataVolumes.forEach(function (dataVol, index) {
        var volume = {};
        if (!__.isUndefined(dataVol.volumeType)) {
          volume['volume_driver'] = dataVol.volumeType;
        } 
        if (!__.isUndefined(dataVol.containerPath)) {
          volume['container_path'] = dataVol.containerPath;
        }
        if (__.isUndefined(dataVol.name)) {
          throw new Error($('Shared data volume must have a name.'));
        }
        sharedVolumes[dataVol.name] = volume;
      });
    }
  });

  globalResources['docker_images'] = dockerImages;

  var dockerVolumes = {};
  if (hasDataVolumes) {
    dockerVolumes['data_volumes'] = dataVolumes;
  };
  if (hasSharedVolumes) {
    dockerVolumes['shared_data_volumes'] = sharedVolumes;
  };
  if (hasDataVolumes || hasSharedVolumes) {
    globalResources['docker_volumes'] = dockerVolumes;
  }

  config['global_resources'] = globalResources;
  return config;
}

/**
 * Create the contents of the Batch Shipyard pool.json file from an expanded pool definition.
 * @param {object} poolJson      the expanded pool definition
 */
batchShipyardUtils.createBatchShipyardPoolJson = function (poolJson) {
  var batchShipyardPool = {};
  var poolSpec = {};

  poolSpec['id'] = poolJson.id;
  poolSpec['vm_size'] = poolJson.vmSize;
  if (!__.isUndefined(poolJson.targetDedicated)) {
    poolSpec['vm_count'] = poolJson.targetDedicated;
  }
  if (!__.isUndefined(poolJson.maxTasksPerNode)) {
    poolSpec['max_tasks_per_node'] = poolJson.maxTasksPerNode;
  }
  if (!__.isUndefined(poolJson.enableInterNodeCommunication)) {
    poolSpec['inter_node_communication_enabled'] = poolJson.enableInterNodeCommunication;
  }
  if (!__.isUndefined(poolJson.virtualMachineConfiguration) && !__.isUndefined(poolJson.virtualMachineConfiguration.imageReference)) {
    poolSpec['publisher'] = poolJson.virtualMachineConfiguration.imageReference.publisher;
    poolSpec['offer'] = poolJson.virtualMachineConfiguration.imageReference.offer;
    poolSpec['sku'] = poolJson.virtualMachineConfiguration.imageReference.sku;
  }
  if (!__.isUndefined(poolJson.startTask) && !__.isUndefined(poolJson.startTask.commandLine)) {
    poolSpec['additional_node_prep_commands'] = [ poolJson.startTask.commandLine ];
  }

  // Set some default values
  poolSpec['reboot_on_start_task_failed'] = true;
  poolSpec['block_until_all_global_resources_loaded'] = true;

  batchShipyardPool['pool_specification'] = poolSpec;
  return batchShipyardPool;
}

/**
 * Given an expanded pool definition, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} poolJson      the expanded pool definition
 */
batchShipyardUtils.getIgnoredPoolPropertyNames = function(poolJson) {
  var POOL_PROPERTY_WHITELIST = [ 'id', 'virtualMachineConfiguration', 'vmSize', 'targetDedicated', 'maxTasksPerNode', 'startTask', 'enableInterNodeCommunication', 'clientExtensions' ];
  var START_TASK_PROPERTY_WHITELIST = [ 'commandLine' ];
  var VIRTUAL_MACHINE_CONFIGURATION_PROPERTY_WHITELIST = [ 'imageReference' ];
  var IMAGE_REFERENCE_PROPERTY_WHITELIST = [ 'publisher', 'offer', 'sku' ];

  var ignoredProperties = [];
  Object.keys(poolJson).forEach(function(key) {
    if (POOL_PROPERTY_WHITELIST.indexOf(key) == -1) {
      ignoredProperties.push(key);
    } 
  });
  if (!__.isUndefined(poolJson.startTask)) {
    Object.keys(poolJson.startTask).forEach(function(key) {
      if (START_TASK_PROPERTY_WHITELIST.indexOf(key) == -1) {
        ignoredProperties.push('startTask.' + key);
      } 
    });
  }
  if (!__.isUndefined(poolJson.virtualMachineConfiguration)) {
    Object.keys(poolJson.virtualMachineConfiguration).forEach(function(key) {
      if (VIRTUAL_MACHINE_CONFIGURATION_PROPERTY_WHITELIST.indexOf(key) == -1) {
        ignoredProperties.push('virtualMachineConfiguration.' + key);
      } 
    });

    if (!__.isUndefined(poolJson.virtualMachineConfiguration.imageReference)) {
      Object.keys(poolJson.virtualMachineConfiguration.imageReference).forEach(function(key) {
        if (IMAGE_REFERENCE_PROPERTY_WHITELIST.indexOf(key) == -1) {
          ignoredProperties.push('virtualMachineConfiguration.imageReference.' + key);
        } 
      });
    }
  }

  return ignoredProperties;
}

/**
 * Create the contents of the Batch Shipyard jobs.json file from an expanded job and task definitions.
 * @param {object} jobJson         the expanded job definition
 * @param {array}  taskCollection  the collection of expanded task definitions
 */
batchShipyardUtils.createBatchShipyardJobsJson = function(jobJson, taskCollection) {
  var batchShipyardJob = {};

  batchShipyardJob['id'] = jobJson.id;
  if (!__.isUndefined(jobJson.commonEnvironmentSettings)) {
    var jobEnvVars = {};
    jobJson.commonEnvironmentSettings.forEach(function (envVar) {
      jobEnvVars[envVar.name] = envVar.value;
    });
    batchShipyardJob['environment_variables'] = jobEnvVars;
  }
  
  var batchShipyardTaskCollection = [];
  taskCollection.forEach(function (task) {
    var batchShipyardTask = {};
    
    // Batch service properties
    batchShipyardTask['id'] = task.id;
    batchShipyardTask['command'] = task.commandLine;

    if (!__.isUndefined(task.environmentSettings)) {
      var taskEnvVars = {};
      task.environmentSettings.forEach(function (envVar) {
        taskEnvVars[envVar.name] = envVar.value;
      });
      batchShipyardTask['environment_variables'] = taskEnvVars;
    }

    if (!__.isUndefined(task.dependsOn) && !__.isUndefined(task.dependsOn.taskIds)) {
      var dependsOn = [];
      task.dependsOn.taskIds.forEach(function(id) {
        dependsOn.push(id);
      });
      batchShipyardTask['depends_on'] = dependsOn;
    }

    if (!__.isUndefined(task.resourceFiles)) {
      var resourceFiles = [];
      task.resourceFiles.forEach(function (rf) {
        var resourceFile = {};
        resourceFile['file_path'] = rf.filePath;
        resourceFile['blob_source'] = rf.blobSource;
        if (!__.isUndefined(rf.fileMode)) {
          resourceFile['file_mode'] = rf.fileMode;
        }
        resourceFiles.push(resourceFile);
      });
      batchShipyardTask['resource_files'] = resourceFiles;
    }

    if (!__.isUndefined(task.multiInstanceSettings)) {
      var multiInstanceSettings = {};
      multiInstanceSettings['num_instances'] = task.multiInstanceSettings.numInstances;
      multiInstanceSettings['coordination_command'] = task.multiInstanceSettings.coordinationCommandLine;
      if (!__.isUndefined(task.multiInstanceSettings.commonResourceFiles)) {
        var resourceFiles = [];
        task.multiInstanceSettings.commonResourceFiles.forEach(function (rf) {
          var resourceFile = {};
          resourceFile['file_path'] = rf.filePath;
          resourceFile['blob_source'] = rf.blobSource;
          if (!__.isUndefined(rf.fileMode)) {
            resourceFile['file_mode'] = rf.fileMode;
          }
          resourceFiles.push(resourceFile);
        });
        multiInstanceSettings['resource_files'] = resourceFiles;
      }
      batchShipyardTask['multi_instance'] = multiInstanceSettings;

      // Generate a container name
      batchShipyardTask['name'] = task.id + '_container';
    }

    // Batch Shipyard specific properties
    batchShipyardTask['image'] = task.clientExtensions.dockerOptions.image;

    if (!__.isUndefined(task.clientExtensions.dockerOptions.additionalDockerRunOptions)) {
      batchShipyardTask['additional_docker_run_options'] = task.clientExtensions.dockerOptions.additionalDockerRunOptions;
    }

    if (!__.isUndefined(task.clientExtensions.dockerOptions.removeContainerAfterExit)) {
      batchShipyardTask['remove_container_after_exit'] = task.clientExtensions.dockerOptions.removeContainerAfterExit;
    }

    if (!__.isUndefined(task.clientExtensions.dockerOptions.useHostInfiniband)) {
      batchShipyardTask['infiniband'] = task.clientExtensions.dockerOptions.useHostInfiniband;
    }

    if (!__.isUndefined(task.clientExtensions.dockerOptions.dataVolumes)) {
      var dataVolumes = [];
      task.clientExtensions.dockerOptions.dataVolumes.forEach(function (dataVol, index) {
        dataVolumes.push(batchShipyardUtils.generateDataVolumeLabel(task.id, index));
      });
      batchShipyardTask['data_volumes'] = dataVolumes;
    }

    if (!__.isUndefined(task.clientExtensions.dockerOptions.sharedDataVolumes)) {
      var sharedVolumes = [];
      task.clientExtensions.dockerOptions.sharedDataVolumes.forEach(function (dataVol) {
        sharedVolumes.push(dataVol.name);
      });
      batchShipyardTask['shared_data_volumes'] = sharedVolumes;
    }

    batchShipyardTaskCollection.push(batchShipyardTask);
  });

  batchShipyardJob['tasks'] = batchShipyardTaskCollection;

  return { 'job_specifications': [ batchShipyardJob ]};
}

/**
 * Given an expanded job definition, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} jobJson      the expanded job definition
 */
batchShipyardUtils.getIgnoredJobPropertyNames = function(jobJson) {
  var JOB_PROPERTY_WHITELIST = [ 'id', 'commonEnvironmentSettings', 'taskFactory' ];

  var ignoredProperties = [];
  Object.keys(jobJson).forEach(function(key) {
    if (JOB_PROPERTY_WHITELIST.indexOf(key) == -1) {
      ignoredProperties.push(key);
    } 
  });

  return ignoredProperties;
}

/**
 * Given a task factory, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} taskFactory      the task factory definition
 */
batchShipyardUtils.getIgnoredTaskPropertyNamesFromFactory = function(taskFactory) {
  var ignoredProperties = [];
  if (!__.isUndefined(taskFactory.properties.tasks)) {
    taskFactory.properties.tasks.forEach(function (task) {
      ignoredProperties.push(batchShipyardUtils.getIgnoredTaskPropertyNames(task));
    }); 
  }
  if (!__.isUndefined(taskFactory.properties.repeatTask)) {
    ignoredProperties.push(batchShipyardUtils.getIgnoredTaskPropertyNames(taskFactory.properties.repeatTask));
  }
  if (!__.isUndefined(taskFactory.properties.mergeTask)) {
    ignoredProperties.push(batchShipyardUtils.getIgnoredTaskPropertyNames(taskFactory.properties.mergeTask));
  }
  
  return __.uniq(__.flatten(ignoredProperties));
}

/**
 * Given a task, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} task      the expanded definition
 */
batchShipyardUtils.getIgnoredTaskPropertyNames = function(task) {
  var TASK_PROPERTY_WHITELIST = [ 'id', 'commandLine', 'environmentSettings', 'dependsOn', 'resourceFiles', 'multiInstanceSettings', 'clientExtensions' ];
  var DEPENDS_ON_PROPERTY_WHITELIST = [ 'taskIds' ];

  var ignoredProperties = [];

  Object.keys(task).forEach(function(key) {
    if (TASK_PROPERTY_WHITELIST.indexOf(key) == -1) {
      ignoredProperties.push(key);
    } 
  });
  if (!__.isUndefined(task.dependsOn)) {
    Object.keys(task.dependsOn).forEach(function(key) {
      if (DEPENDS_ON_PROPERTY_WHITELIST.indexOf(key) == -1) {
        ignoredProperties.push('dependsOn.' + key);
      } 
    });
  }

  return ignoredProperties;
}

module.exports = batchShipyardUtils;