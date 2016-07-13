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
var fs = require('fs');
var path = require('path');
var util = require('util');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var storage = require('azure-storage');
var storageUtil = require('../../util/storage.util');
var utils = require('../../util/utils');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;
var jobClient = require('./batch.jobUtils');
var BlobConstants = storage.Constants.BlobConstants;
var SpeedSummary = storage.BlobService.SpeedSummary;
// var poolClient = require('batch.pool');

var $ = utils.getLocaleString;

/**
* Init batch ncj command
*/
exports.init = function (cli) {

  //Init batchUtil
  batchUtil.init(cli);
  storageUtil.init(cli);

  /**
  * Define batch ncj command usage
  */
  var batch = cli.category('batch');

  var ncj = batch.category('ncj').description($('Commands to manage your Batch NCJs'));

  var logger = cli.output;

  var interaction = cli.interaction;

  ncj.command('create [json-template] [json-parameters]')
    .description($('Adds a NCJ (No Code Job) to the specified account'))
    .option('-f, --json-template <json-template>', $('the file containing the NCJ object to create in JSON format; if this parameter is specified, all other ncj parameters are ignored.'))
    .option('-f, --json-parameters <json-parameters>', $('the file containing the NCJ parameters to pass into the template.'))
    .appendBatchAccountOption()
    .execute(createNcj);

  ncj.command('list')
    .description($('Lists all of the ncjs in the specified account'))
    .option('-i, --ncj-schedule-id [ncjScheduleId]', $('the id of the ncj schedule from which you want to get a list of ncjs'))
    .appendODataFilterOption(true, true, true)
    .appendBatchAccountOption()
    .execute(listNcjs);

  ncj.command('show [ncjId]')
    .description($('Show information about the specified ncj'))
    .option('-i, --id <ncjId>', $('the id of the ncj'))
    .appendODataFilterOption(true, false, true)
    .appendBatchAccountOption()
    .execute(showNcj);

  ncj.command('uploadFiles')
    .description($("Uploads files to storage to be used by a job"))
    .option('-f, --file <file>', $('the path to the file to upload'))
    .option('-d, --directory <directory>', $('the path to the directory of files to uplaod'))
    .option('-t, --json-template <json-template>', $('The file containing the NCJ object. Any referenced files will be uploaded.'))
	  .option('-e, --sas-expiry <sasExpiry>', $('length of time in hours before resource file SAS token expiry'))
	  //.option('-w, --update-json <>', $('If set, will output an updated NCJ json-template with local path sources replaced by SAS tokens'))
    .appendBatchAccountOption()
	  .appendStorageAccountOption()
    .execute(uploadFiles);

  ncj.command('test')
    .execute(test);

  /**
  * Implement batch ncj cli
  */

  function test() {
    console.log("Hello World!");
  }

  function uploadFiles(options, _) {
    if (options.file && options.directory) {
      logger.warn("Cannot specify both 'file' and 'directory'");
      return;
    }
    if (options.template && (options.file || options.directory)) {
        logger.warn("Cannot specify 'template' and either 'file' or 'directory'");
        return;
    }
    options.storageContainer = interaction.promptIfNotGiven($('Container: '), options.storageContainer, _);
    var connection = { accountName: options.storageAccount, accountKey: options.storageKey }
    var serviceClient = storageUtil.getServiceClient(storageUtil.getBlobService, connection);

    if (options.file) {
      _uploadBlob(options.file, options, serviceClient, _);
    }

    if (options.directory) {
      var fsStatus = fs.stat(options.directory, _);
      if (!fsStatus.isDirectory()) {
        throw new Error(util.format($('%s is not a valid directory'), options.directory));
      }
      logger.info("Upload all files in directory: " + options.directory);
      files = fs.readdir(options.directory, _);
      for (var i = 0; i < files.length; i++) {
        file = path.join(options.directory, files[i]);
        var fsStatus = fs.stat(file, _);
        if (!fsStatus.isDirectory()) {
          _uploadBlob(file, options, serviceClient, _);
        }
      }
      
    }
    return;
  }

  /**
  * Create a batch ncj
  * @param {string} [jsonTemplate] the file containing the ncj to create in JSON format
  * @param {string} [jsonProperties] the file containing the ncj to create in JSON format
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createNcj(jsonTemplate, jsonProperties, options, _) {
    if (!jsonTemplate) {
      jsonTemplate = options.jsonFile;
    }

    var properties = {};
    if (!jsonProperties) {
      logger.info("INFO: No properties file was supplied. Using default properties from template");
    } else {
      properties = _parseProperties(jsonProperties);
    }

    // console.log("Properties: " + JSON.stringify(properties));

    var parsedJson = {};
    if (jsonTemplate) {
      var objJson = fs.readFileSync(jsonTemplate).toString();
      parsedJson = JSON.parse(objJson);
    }

    var ncjJob = {};
    var ncjPool = {};
    var ncjApplications = [];
    var ncjTaskFactory = {};

    logger.info("The following batch entities will be created:");
    var resources = parsedJson.resources;
    for (var i = 0; i < resources.length; i++) {
      logger.verbose("Resource: " + resources[i].name);

      for (var j = 0; j < resources[i].resources.length; j++) {
        // This is the NCJ resrouce
        var ncjResource = resources[i].resources[j];
        logger.verbose("  NCJ Resource: " + ncjResource.name);

        for (var k = 0; k < ncjResource.resources.length; k++) {
          // This is a job or a pool or an application or something...
          var batchResource = ncjResource.resources[k];
          logger.info("      Batch Resource (" + batchResource.type + "): " + batchResource.name);

          switch (batchResource.type) {
            case "NCJSoftwares":
              var application = batchResource;
              ncjApplications.push({
                application
              });
              break;
            case "NCJPaaSPools":
              var pool = batchResource;
              ncjPool.id = pool.name;
              ncjPool.targetDedicated = pool.properties.count;
              ncjPool.vmSize = pool.properties.size;
              ncjPool.osFamily = pool.properties.osFamily;
              ncjPool.osVersion = pool.properties.version;

              // TODO: This needs to run all application command lines
              ncjPool.startTaskCmd = "ping -n 2 localhost";
              ncjPool.appPackageRef = [];

              break;
            case "NCJJobs":
              ncjJob.id = batchResource.name;
              ncjJob.maxWallClockTime = batchResource.properties.maxWallClockTime;

              ncjTaskFactory.type = batchResource.properties.taskfactory.type;
              if (ncjTaskFactory.type == "parametricsweepTask") {
                ncjTaskFactory.start = batchResource.properties.taskfactory.properties.start;
                ncjTaskFactory.end = batchResource.properties.taskfactory.properties.end;
                ncjTaskFactory.skip = batchResource.properties.taskfactory.properties.skip;
                ncjTaskFactory.commandLine = batchResource.properties.taskfactory.properties.cmdLine;
              }

              ncjTaskFactory.resourceFiles = batchResource.properties.taskfactory.properties.resourceFiles;
              break;
          }

        }
      }
    }

    // Now that everything is set in place, backfill required objects

    // Backfill Job
    ncjJob.poolId = ncjPool.id;

    // Print Applications
    logger.verbose("");
    logger.verbose("Applications");
    console.log(JSON.stringify(ncjApplications));

    // Print Pool
    logger.verbose("");
    logger.verbose("Pool");
    logger.verbose(JSON.stringify(ncjPool));

    // Print Job
    logger.verbose("");
    logger.verbose("Job");
    logger.verbose(JSON.stringify(ncjJob));

    // Print Task Factory
    logger.verbose("");
    logger.verbose("Task Factory");
    logger.verbose(JSON.stringify(ncjTaskFactory));


    // Start creating objects
    // 1. Create Job
    jobClient.createJob("", ncjJob, logger, _);

    // 2. Create Tasks for job using task factory
    // 3. Create Pool


    // if (!jsonFile) {
    //   jsonFile = options.jsonFile;
    // }
    // var parsedJson = {};

    // if (!jsonFile) {
    //   if (!options.id) {
    //     jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
    //   } else {
    //     parsedJson = { 'id': options.id };

    //     var poolId = options.poolId;
    //     if (!poolId) {
    //       poolId = cli.interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    //     }
    //     __.extend(parsedJson, { 'poolInfo': { 'poolId': poolId } });

    //     if (options.priority) {
    //       __.extend(parsedJson, { 'priority': Number(options.priority) });
    //     }

    //     var constraintsJson = {};
    //     if (options.maxWallClockTime) {
    //       __.extend(constraintsJson, { 'maxWallClockTime': options.maxWallClockTime });
    //     }

    //     if (options.maxTaskRetryCount) {
    //       __.extend(constraintsJson, { 'maxTaskRetryCount': Number(options.maxTaskRetryCount) });
    //     }

    //     __.extend(parsedJson, { 'constraints': constraintsJson });

    //     if (options.metadata) {
    //       ref = [];
    //       options.metadata.split(';').forEach(function (entry) {
    //         var item = entry.split('=');
    //         ref.push({ 'name': item[0], 'value': item[1] });
    //       });
    //       __.extend(parsedJson, { 'metadata': ref });
    //     }
    //   }
    // }

    // if (jsonFile) {
    //   var objJson = fs.readFileSync(jsonFile).toString();
    //   parsedJson = JSON.parse(objJson);
    // }

    // var client = batchUtil.createBatchServiceClient(options);

    // var addncj = null;
    // if (parsedJson !== null && parsedJson !== undefined) {
    //   var resultMapper = new client.models['ncjAddParameter']().mapper();
    //   addncj = client.deserialize(resultMapper, parsedJson, 'result');
    // }

    // var tips = $('Creating Batch ncj');
    // var batchOptions = {};
    // batchOptions.ncjAddOptions = batchUtil.getBatchOperationDefaultOption();

    // startProgress(tips);
    // try {
    //   client.ncj.add(addncj, batchOptions, _);
    // } catch (err) {
    //   if (err.message) {
    //     if (typeof err.message === 'object') {
    //       err.message = err.message.value;
    //     }
    //   }

    //   throw err;
    // }
    // finally {
    //   endProgress();
    // }

    // logger.verbose(util.format($('ncj %s has been created successfully'), addncj.id));
    // showncj(addncj.id, options, _);
  }

  /**
  * Show the details of the specified Batch ncj
  * @param {string} [ncjId] ncj id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showNcj(ncjId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!ncjId) {
      ncjId = options.id;
    }
    ncjId = interaction.promptIfNotGiven($('ncj id: '), ncjId, _);
    var tips = $('Getting Batch ncj information');

    var batchOptions = {};
    batchOptions.ncjGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.ncjGetOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.ncjGetOptions.expand = options.expandClause;
    }

    var ncj = null;

    startProgress(tips);
    try {
      ncj = client.ncj.get(ncjId, batchOptions, _);
    } catch (e) {
      if (batchUtil.isNotFoundException(e)) {
        throw new Error(util.format($('ncj %s does not exist'), ncjId));
      } else {
        if (e.message) {
          if (typeof e.message === 'object') {
            e.message = e.message.value;
          }
        }

        throw e;
      }
    } finally {
      endProgress();
    }

    batchShowUtil.showCloudncj(ncj, cli.output);
  }

  /**
  * List batch ncjs
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listNcjs(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing Batch ncjs');
    var batchOptions = {};

    var ncjOptions = batchUtil.getBatchOperationDefaultOption();
    if (options.selectClause) {
      ncjOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      ncjOptions.expand = options.expandClause;
    }
    if (options.filterClause) {
      ncjOptions.filter = options.filterClause;
    }

    if (options.ncjScheduleId) {
      batchOptions.ncjListFromncjScheduleOptions = ncjOptions;
    } else {
      batchOptions.ncjListOptions = ncjOptions;
    }

    var ncjs = [];
    startProgress(tips);

    try {
      if (options.ncjScheduleId) {
        result = client.ncj.listFromncjSchedule(options.ncjScheduleId, batchOptions, _);
      } else {
        result = client.ncj.list(batchOptions, _);
      }
      result.forEach(function (ncj) {
        ncjs.push(ncj);
      });
      var nextLink = result.odatanextLink;

      while (nextLink) {
        batchOptions = {};
        ncjOptions = batchUtil.getBatchOperationDefaultOption();

        if (options.ncjScheduleId) {
          batchOptions.ncjListFromncjScheduleOptions = ncjOptions;
          result = client.ncj.listFromncjScheduleNext(nextLink, batchOptions, _);
        } else {
          batchOptions.ncjListOptions = ncjOptions;
          result = client.ncj.listNext(nextLink, batchOptions, _);
        }
        result.forEach(function (ncj) {
          ncjs.push(ncj);
        });
        nextLink = result.odatanextLink;
      }

    } catch (err) {
      if (err.message) {
        if (typeof err.message === 'object') {
          err.message = err.message.value;
        }
      }

      throw err;
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(ncjs, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No ncj found'));
      } else {
        logger.table(outputData, function (row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
        });
      }
    });
  }

  function _parseTempalte(jsonTemplate) {
    var pool = {};
    var job = {};
    var applications = {};
  }

  function _parseProperties(jsonParameters) {
    var properties = {};
    var poolProps = {};
    var jobProps = {};
    var applicationProps = {};

    properties.pool = poolProps;
    properties.job = jobProps;
    properties.application = applicationProps;
    return properties;
  }

  function _createTaskFactory(taskFactorySpec) {

  }

  function _uploadBlob(file, options, blobService, _) {

    var specifiedContainerName = options.storageContainer;
    operation = storageUtil.getStorageOperation(blobService, storageUtil.OperationType.Blob, 'createContainerIfNotExists');
    storageUtil.performStorageOperation(operation, function (error) { if (error) { throw error; } }, specifiedContainerName);

    var specifiedFileName = file
    var specifiedBlobName = path.basename(specifiedFileName);
    var specifiedBlobType = BlobConstants.BlobTypes['BLOCK'];
    var storageOptions = storageUtil.getStorageOperationDefaultOption();
    storageOptions.parallelOperationThreadCount = storageUtil.threadsInOperation;

    storageOptions.storeBlobContentMD5 = true;

    var summary = new SpeedSummary(specifiedBlobName);
    storageOptions.speedSummary = summary;
    specifiedBlobName = storageUtil.convertFileNameToBlobName(specifiedBlobName);

    if (!utils.fileExists(specifiedFileName, _)) {
      throw new Error(util.format($('Local file %s doesn\'t exist'), specifiedFileName));
    }
    var fsStatus = fs.stat(specifiedFileName, _);
    if (!fsStatus.isFile()) {
      throw new Error(util.format($('%s is not a file'), specifiedFileName));
    }

    var sizeLimit = storageUtil.MaxBlockBlobSize;
    if (fsStatus.size > sizeLimit) {
      throw new Error(util.format($('The local file size %d exceeds the Azure blob size limit %d'), fsStatus.size, sizeLimit));
    }

    var tips = '';
    var blobProperties = null;
    try {
        tips = util.format($('Checking blob %s in container %s'), specifiedBlobName, specifiedContainerName);
        startProgress(tips);
        var propertiesOperation = storageUtil.getStorageOperation(blobService, storageUtil.OperationType.Blob, 'getBlobProperties');
        blobProperties = storageUtil.performStorageOperation(propertiesOperation, _,
          specifiedContainerName, specifiedBlobName, storageOptions);
    } catch (e) {
        if (!storageUtil.isNotFoundException(e)) {
            throw e;
        }
    } finally {
        endProgress();
    }

    if (!blobProperties || options.overwrite) {
        if (blobProperties && blobProperties.blobType !== specifiedBlobType) {
            throw new Error(util.format($('BlobType mismatch. The current blob type is %s'),
              blobProperties.blobType));
        }
        tips = util.format($('Uploading %s to blob %s in container %s'), specifiedFileName, specifiedBlobName, specifiedContainerName);
        var operation = storageUtil.getStorageOperation(blobService, storageUtil.OperationType.Blob, 'createBlockBlobFromLocalFile');
        storageOptions.parallelOperationThreadCount = storageOptions.parallelOperationThreadCount;
        var printer = storageUtil.getSpeedPrinter(summary);
        var intervalId = -1;
        if (!logger.format().json) {
          intervalId = setInterval(printer, 1000);
        }
        startProgress(tips);
        endProgress();
        try {
          //Upload block blob
          operation = storageUtil.getStorageOperation(blobService, storageUtil.OperationType.Blob, 'createBlockBlobFromLocalFile');
          storageUtil.performStorageOperation(operation, _, specifiedContainerName, specifiedBlobName, specifiedFileName, storageOptions);
        } catch (e) {
          printer(true);
          throw e;
        } finally {
          printer(true);
          clearInterval(intervalId);
        }
    } else {
      tips = util.format($('File %s already uploaded'), specifiedBlobName);
      startProgress(tips);
      endProgress();
    }
  }
};