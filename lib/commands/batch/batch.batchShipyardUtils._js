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
var os = require('os');
var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var utils = require('../../util/utils');
var batchUtil = require('./batch.util');
var batchFileUtils = require('./batch.fileUtils');

var $ = utils.getLocaleString;

var AZURE_FILE_VOLUME_TYPE = 'azurefile';

var batchShipyardUtils = {};

/**
 * Gets the label of the AutoStorage account to use in the credentials.json file
 * @returns {string}  the label of the AutoStorage account to use in the credentials.json file
 */
batchShipyardUtils.getAutoStorageCredentialsLabel = function () {
  return 'autostorage_account';
};

/**
 * Generates a label for a task data volume.
 * @returns {string} a label for a task data volume based on the task id and the index of the data volume
 */
batchShipyardUtils.generateDataVolumeLabel = function(taskId, dataVolumeIndex) {
  return taskId + '_' + dataVolumeIndex;
};

/**
 * Generates a name for a temporary directory to hold the Batch Shipyard config files.
 * This function uses the current time to create a directory name. If the user performs
 * multiple invocations of the script within less than < .001 seconds, there will be a
 * conflict.
 * @returns {string}  a temporary directory name based on the current time
 */
batchShipyardUtils.generateTempConfigDirName = function() {
  var now = new Date();
  var formattedDateString = now.toISOString();
  // ISO format is YYYY-MM-DDTHH:mm:ss.sssZ
  // Replace all ':' chars with '.' chars to get a cleaner dir name.
  formattedDateString = formattedDateString.replace(/:/g, '.');
  return 'BatchShipyardConfigs_' + formattedDateString;
};

/**
 * Invoke Batch Shipyard
 * @param {object} credentialsJson      the contents of the Batch Shipyard credentials.json file
 * @param {object} configJson           the contents of the Batch Shipyard config.json file
 * @param {object} poolJson             the contents of the Batch Shipyard pool.json file
 * @param {object} jobsJson             the contents of the Batch Shipyard jobs.json file
 * @param {string} action               the action argument to pass to Batch Shipyard
 * @param {object} cli                  the cli object
 * @param {callback} _                  the callback function
 */
batchShipyardUtils.invokeBatchShipyard = function(credentialsJson, configJson, poolJson, jobsJson, action, cli, _) {
  cli.output.info('Verifying Python installation...');
  try {
    childProcess.execSync('python --version', { stdio:[0,1,2] });
  } catch (e) {
    throw new Error('Error encountered invoking Python. Please verify that Python is installed and on the PATH.');
  }
  var batchShipyardPath = process.env['AZURE_BATCH_SHIPYARD_PATH'];
  batchShipyardPath = cli.interaction.promptIfNotGiven(
    'Please enter the full path to shipyard.py. To avoid seeing this prompt in the future, you can set the AZURE_BATCH_SHIPYARD_PATH environment variable: ',
    batchShipyardPath, _);

  // Write the config files to a temp dir
  var tempDir = os.tmpdir();
  var batchShipyardConfigDir = path.join(tempDir, batchShipyardUtils.generateTempConfigDirName());
  cli.output.info('Creating temporary directory ' + batchShipyardConfigDir + ' for Batch Shipyard config files...');
  fs.mkdir(batchShipyardConfigDir, _);
  cli.output.info('Writing Batch Shipyard configuration files.');
  var credentialsFile = path.join(batchShipyardConfigDir, 'credentials.json');
  var configFile = path.join(batchShipyardConfigDir, 'config.json');
  var poolFile = path.join(batchShipyardConfigDir, 'pool.json');
  var jobsFile;

  // Number of spaces to use when writing the JSON to improve readability
  var JSON_SPACE_COUNT = 2;
  fs.writeFile(credentialsFile, JSON.stringify(credentialsJson, null, JSON_SPACE_COUNT), _);
  fs.writeFile(configFile, JSON.stringify(configJson, null, JSON_SPACE_COUNT), _);
  fs.writeFile(poolFile, JSON.stringify(poolJson, null, JSON_SPACE_COUNT), _);
  if (!__.isUndefined(jobsJson)) {
    jobsFile = path.join(batchShipyardConfigDir, 'jobs.json');
    fs.writeFile(jobsFile, JSON.stringify(jobsJson, null, JSON_SPACE_COUNT), _);
  }
  cli.output.info('Configuration files written.');

  try {
    // Invoke Batch Shipyard
    var command = 'python ' + batchShipyardPath + ' --configdir ' + batchShipyardConfigDir + ' ' + action;
    cli.output.info('Invoking Batch Shipyard: ' + command);
    childProcess.execSync(command, { 
      cwd: path.dirname(batchShipyardPath),
      stdio:[0,1,2] 
    });
  } finally {
    // Cleanup the temp dir. Files deleted individually since the fs.rmdir function doesn't support recursive deletes.
    cli.output.info('Cleaning up config directory...');
    fs.unlink(credentialsFile, _);
    fs.unlink(configFile, _);
    fs.unlink(poolFile, _);
    if (!__.isUndefined(jobsFile)) {
      fs.unlink(jobsFile, _);
    }
    fs.rmdir(batchShipyardConfigDir, _);
    cli.output.info(batchShipyardConfigDir + ' deleted.');
  }
};

/**
 * Use Batch Shipyard to create a pool.
 * @param {object} poolJson      the expanded pool definition
 * @param {object} options       the commandline options
 * @param {object} cli           the cli object
 * @param {callback} _           callback function
 */
batchShipyardUtils.createPool = function (poolJson, options, cli, _) {
  var credentialsJson = batchShipyardUtils.createCredentialsJson(options, cli, _);
  var configJson = batchShipyardUtils.createConfigJsonFromPool(poolJson);
  var batchShipyardPoolJson = batchShipyardUtils.createBatchShipyardPoolJson(poolJson);

  // Warn about ignored properties
  var ignoredProperties = batchShipyardUtils.getIgnoredPoolPropertyNames(poolJson);
  if (ignoredProperties.length !== 0) {
    cli.output.warn('When specifying dockerOptions, the following supplied pool properties will be ignored: ' + ignoredProperties.join(','));
  }

  batchShipyardUtils.invokeBatchShipyard(credentialsJson, configJson, batchShipyardPoolJson, undefined, 'addpool', cli, _);
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
  var credentialsJson = batchShipyardUtils.createCredentialsJson(options, cli, _);
  var configJson = batchShipyardUtils.createConfigJsonFromTasks(taskCollection);
  var batchShipyardJobJson = batchShipyardUtils.createBatchShipyardJobsJson(jobJson, taskCollection);
  var batchShipyardPoolJson = batchShipyardUtils.createBatchShipyardPoolJsonFromJob(jobJson);

  // Warn about ignored properties
  var ignoredProperties = batchShipyardUtils.getIgnoredJobPropertyNames(jobJson);
  if (ignoredProperties.length !== 0) {
    cli.output.warn('When specifying dockerOptions, the following supplied job properties will be ignored: ' + ignoredProperties.join(','));
  }
  ignoredProperties = batchShipyardUtils.getIgnoredTaskPropertyNamesFromCollection(taskCollection);
  if (ignoredProperties.length !== 0) {
    cli.output.warn('When specifying dockerOptions, the following supplied task properties will be ignored: ' + ignoredProperties.join(','));
  }

  batchShipyardUtils.invokeBatchShipyard(credentialsJson, configJson, batchShipyardPoolJson, batchShipyardJobJson, 'addjobs', cli, _);
};

/**
 * Create the content of the Batch Shipyard credentials.json file.
 * @param {object} options       the commandline options
 * @param {object} cli           the cli object
 * @param {callback} _           the callback function
 * @returns {object}             the contents of the Batch Shipyard credentials.json file
 */
batchShipyardUtils.createCredentialsJson = function (options, cli, _) {
  var batchAccountInfo = batchUtil.getBatchAccountInformation(options);

  var credentials = {};
  var batchCredentials = {};
  batchCredentials['account'] = batchAccountInfo.accountName;
  batchCredentials['account_key'] = batchAccountInfo.accountKey;
  batchCredentials['account_service_url'] = batchAccountInfo.accountEndpoint;
  credentials['batch'] = batchCredentials;

  var storageClient = batchFileUtils.resolveStorageAccount(options, _);
  var storageCredentials = {};
  storageCredentials['account'] = storageClient.storageAccount;
  storageCredentials['account_key'] = storageClient.storageAccessKey;

  var endpoint = 'core.windows.net';
  try {
    // Example blob client endpoint: https://account-name.blob.core.windows.net:443/
    // We want the 'core.windows.net' part or equivalent. Other cloud environments
    // use similarly formatted suffixes (ex: 'core.usgovcloudapi.net', 'core.chinacloudapi.cn')
    var parts = storageClient.host.primaryHost.split('blob.');
    var endpointWithPort = parts[1];
    var portStartIndex = endpointWithPort.indexOf(':');
    if (portStartIndex === -1) {
      endpoint = endpointWithPort.endsWith('/') ? endpointWithPort.substring(0, endpointWithPort.length - 1) : endpointWithPort;
    } else {
      endpoint = endpointWithPort.substring(0, portStartIndex);
    }
  } catch (e) {
    cli.output.warn('Error reading Storage endpoint, using default value: ' + endpoint);
  }
  storageCredentials['endpoint'] = endpoint;
  var autoStorageLabelCredentials = {};
  autoStorageLabelCredentials[batchShipyardUtils.getAutoStorageCredentialsLabel()] = storageCredentials;
  credentials['storage'] = autoStorageLabelCredentials;

  return { 'credentials': credentials };
};

/**
 * Create the 'batch_shipyard' section of the config.json file
 * @returns {object}   the 'batch_shipyard' section of the Batch Shipyard config.json file
 */
batchShipyardUtils.createConfigBatchShipyardSection = function() {
  var config = {};
  var batchShipyard = {};
  batchShipyard['storage_account_settings'] = batchShipyardUtils.getAutoStorageCredentialsLabel();
  batchShipyard['storage_entity_prefix'] = 'shipyard';
  config['batch_shipyard'] = batchShipyard;
  return config;
};

/**
 * Create the contents of the Batch Shipyard config.json file using an expanded pool definition.
 * @param {object} poolJson      the expanded pool definition
 * @returns {object}             the contents of the Batch Shipyard config.json file
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
      if (!__.isUndefined(entry.volumeType) && entry.volumeType === AZURE_FILE_VOLUME_TYPE) {
        sharedVolProperties['volume_driver'] = entry.volumeType;
        // Set default mount options
        sharedVolProperties['mount_options'] = [ 'filemode=0777', 'dirmode=0777', 'nolock=true' ];
        sharedVolProperties['storage_account_settings'] = batchShipyardUtils.getAutoStorageCredentialsLabel();
        if (!__.isUndefined(entry.azureFileShareName)) {
          sharedVolProperties['azure_file_share_name'] = entry.azureFileShareName;
        }
      }
      else {
        throw new Error('Shared data volume must set the volumeType to "azurefile".');
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
};

/**
 * Create the contents of the Batch Shipyard config.json file using a collection of expanded task definitions.
 * @param {array} taskCollection  the collection of expanded task definitions
 * @returns {object}              the contents of the Batch Shipyard config.json file
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
      task.clientExtensions.dockerOptions.sharedDataVolumes.forEach(function (dataVol) {
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
  }
  if (hasSharedVolumes) {
    dockerVolumes['shared_data_volumes'] = sharedVolumes;
  }
  if (hasDataVolumes || hasSharedVolumes) {
    globalResources['docker_volumes'] = dockerVolumes;
  }

  config['global_resources'] = globalResources;
  return config;
};

/**
 * Create the contents of the Batch Shipyard pool.json file from an expanded pool definition.
 * @param {object} poolJson      the expanded pool definition
 * @returns {object}             the contents of the Batch Shipyard pool.json file
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
};

/** 
 * Create the Batch Shipyard pool.json contents from an expanded job definition
 * @param {object} jobJson       the expanded job definition
 * @returns {object}             the contents of the Batch Shipyard pool.json file
 */
batchShipyardUtils.createBatchShipyardPoolJsonFromJob = function(jobJson) {
  if (__.isUndefined(jobJson.poolInfo) || __.isUndefined(jobJson.poolInfo.poolId)) {
    throw new Error($('When specifying dockerOptions on your tasks, the job.poolInfo.poolId property must be set.'));
  }

  return { 'pool_specification' : { 'id': jobJson.poolInfo.poolId } };
};

/**
 * Given an expanded pool definition, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} poolJson      the expanded pool definition
 * @returns {array}              the collection of property names which will be ignored by Batch Shipyard
 */
batchShipyardUtils.getIgnoredPoolPropertyNames = function(poolJson) {
  var POOL_PROPERTY_WHITELIST = [ 'id', 'virtualMachineConfiguration', 'vmSize', 'targetDedicated', 'maxTasksPerNode', 'startTask', 'enableInterNodeCommunication', 'clientExtensions' ];
  var START_TASK_PROPERTY_WHITELIST = [ 'commandLine' ];
  var VIRTUAL_MACHINE_CONFIGURATION_PROPERTY_WHITELIST = [ 'imageReference' ];
  var IMAGE_REFERENCE_PROPERTY_WHITELIST = [ 'publisher', 'offer', 'sku' ];

  var ignoredProperties = [];
  __.each(poolJson, function(val, key) {
    if (POOL_PROPERTY_WHITELIST.indexOf(key) == -1) {
      ignoredProperties.push(key);
    } 
  });
  if (!__.isUndefined(poolJson.startTask)) {
    __.each(poolJson.startTask, function(val, key) {
      if (START_TASK_PROPERTY_WHITELIST.indexOf(key) == -1) {
        ignoredProperties.push('startTask.' + key);
      } 
    });
  }
  if (!__.isUndefined(poolJson.virtualMachineConfiguration)) {
    __.each(poolJson.virtualMachineConfiguration, function(val, key) {
      if (VIRTUAL_MACHINE_CONFIGURATION_PROPERTY_WHITELIST.indexOf(key) == -1) {
        ignoredProperties.push('virtualMachineConfiguration.' + key);
      } 
    });

    if (!__.isUndefined(poolJson.virtualMachineConfiguration.imageReference)) {
      __.each(poolJson.virtualMachineConfiguration.imageReference, function(val, key) {
        if (IMAGE_REFERENCE_PROPERTY_WHITELIST.indexOf(key) == -1) {
          ignoredProperties.push('virtualMachineConfiguration.imageReference.' + key);
        } 
      });
    }
  }

  return ignoredProperties;
};

/**
 * Create the contents of the Batch Shipyard jobs.json file from an expanded job and task definitions.
 * @param {object} jobJson         the expanded job definition
 * @param {array}  taskCollection  the collection of expanded task definitions
 * @returns {object}               the contents of the Batch Shipyard jobs.json file
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
        var commonResourceFiles = [];
        task.multiInstanceSettings.commonResourceFiles.forEach(function (rf) {
          var resourceFile = {};
          resourceFile['file_path'] = rf.filePath;
          resourceFile['blob_source'] = rf.blobSource;
          if (!__.isUndefined(rf.fileMode)) {
            resourceFile['file_mode'] = rf.fileMode;
          }
          commonResourceFiles.push(resourceFile);
        });
        multiInstanceSettings['resource_files'] = commonResourceFiles;
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
};

/**
 * Given an expanded job definition, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} jobJson      the expanded job definition
 * @returns {array}             the collection of property names which will be ignored by Batch Shipyard
 */
batchShipyardUtils.getIgnoredJobPropertyNames = function(jobJson) {
  var JOB_PROPERTY_WHITELIST = [ 'id', 'commonEnvironmentSettings', 'poolInfo', 'taskFactory' ];

  var ignoredProperties = [];
  __.each(jobJson, function(val, key) {
    if (JOB_PROPERTY_WHITELIST.indexOf(key) == -1) {
      ignoredProperties.push(key);
    } 
  });

  return ignoredProperties;
};

/**
 * Given a task collection, return an array of property names which will be ignored by Batch Shipyard.
 * @param {array} taskCollection      the task collection
 * @returns {array}                 the collection of property names which will be ignored by Batch Shipyard
 */
batchShipyardUtils.getIgnoredTaskPropertyNamesFromCollection = function(taskCollection) {
  var ignoredProperties = [];
  taskCollection.forEach(function (task) {
    ignoredProperties.push(batchShipyardUtils.getIgnoredTaskPropertyNames(task));
  }); 
  
  return __.uniq(__.flatten(ignoredProperties));
};

/**
 * Given a task, return an array of property names which will be ignored by Batch Shipyard.
 * @param {object} task      the expanded definition
 * @returns {array}          the collection of property names which will be ignored by Batch Shipyard
 */
batchShipyardUtils.getIgnoredTaskPropertyNames = function(task) {
  var TASK_PROPERTY_WHITELIST = [ 'id', 'commandLine', 'environmentSettings', 'dependsOn', 'resourceFiles', 'multiInstanceSettings', 'clientExtensions' ];
  var DEPENDS_ON_PROPERTY_WHITELIST = [ 'taskIds' ];

  var ignoredProperties = [];

  __.each(task, function(val, key) {
    if (TASK_PROPERTY_WHITELIST.indexOf(key) == -1) {
      ignoredProperties.push(key);
    } 
  });
  if (!__.isUndefined(task.dependsOn)) {
    __.each(task.dependsOn, function(val, key) {
      if (DEPENDS_ON_PROPERTY_WHITELIST.indexOf(key) == -1) {
        ignoredProperties.push('dependsOn.' + key);
      } 
    });
  }

  return ignoredProperties;
};

module.exports = batchShipyardUtils;