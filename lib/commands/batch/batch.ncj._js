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
var uuid = require('node-uuid');
var moment = require('moment');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var storage = require('azure-storage');
var storageUtil = require('../../util/storage.util');
var utils = require('../../util/utils');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;
var jobClient = require('./batch.jobUtils');
var BlobConstants = storage.Constants.BlobConstants;
var BlobUtilities = storage.BlobUtilities;
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

  ncj.command('uploadFiles [jsonParameters]')
    .description($("Uploads files to storage to be used by a job"))
    .option('-f, --file <file>', $('the path to the file to upload'))
    .option('-d, --directory <directory>', $('the path to the directory of files to uplaod'))
    .option('-c, --container-url <container-url>', $('the name of the parameter whos value holds the destination container'))
    .option('-t, --sas-token <sas-token>', $('the name of the parameter where the upload sas token will be stored'))
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

  function uploadFiles(jsonParameters, options, _) {
    if (options.file && options.directory) {
      logger.warn("Cannot specify both 'file' and 'directory'");
      return;
    }
    if (!jsonParameters) {
      throw new Error("ERROR: No parameters file was supplied.");
    }
    if (!options.containerUrl) {
      throw new Error("ERROR: Must supply a container URL parameter.");
    }
    if (!options.sasExpiry) {
      options.sasExpiry = 12;
    }
    var objJson = fs.readFile(jsonParameters, _).toString();
    var parsedParams = JSON.parse(objJson);
    if (!parsedParams.parameters[options.containerUrl]) {
      throw new Error("ERROR: Invalid storage container parameter name.")
    }
    var containerURL = parsedParams.parameters[options.containerUrl].value.split('/');
    logger.info(containerURL);

    options.storageContainer = containerURL[containerURL.length-1];
    var connection = { accountName: options.storageAccount, accountKey: options.storageKey }
    var serviceClient = storageUtil.getServiceClient(storageUtil.getBlobService, connection);

    if (options.file) {
      var sasToken = _uploadBlob(options.file, options, serviceClient, _);
      logger.info(sasToken);
      if (options.sasToken) {
        parsedParams.parameters[options.sasToken].value = '?' + sasToken
      }
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
      var sasToken = _generateSasToken(serviceClient, options.storageContainer, null, options, logger, _);
      logger.info(sasToken);
      if (options.sasToken) {
        parsedParams.parameters[options.sasToken].value = '?' + sasToken
      }
    }
    fs.writeFile(jsonParameters, JSON.stringify(parsedParams, null, '\t'), _);
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
    //TODO: Allow for no parameters file - use defaults
    if (!jsonProperties || !jsonTemplate) {
      throw new Error("INFO: No template or properties file was supplied.");
    }
    var ncjId = uuid.v4();
    var strJson = fs.readFileSync(jsonTemplate).toString();
    var parsedJson = JSON.parse(strJson);
    var objJson = fs.readFile(jsonProperties, _).toString();
    var parsedParams = JSON.parse(objJson);

    //TODO: Some additional parsing validation if parameter value missing
    logger.info("Parsing JSON template and resolving parameters");
    parsedJson = jobClient.parseTemplate(strJson, parsedJson, parsedParams, logger, _);

    var ncjParsedApplications = parsedJson.resources.filter(function (x) { return x.type === "Microsoft.Batch/batchAccounts/softwares" });
    var ncjParsedPools = parsedJson.resources.filter(function (x) { return x.type === "Microsoft.Batch/batchAccounts/pools" });
    var ncjParsedJobs = parsedJson.resources.filter(function (x) { return x.type === "Microsoft.Batch/batchAccounts/NCJs" });

    //TODO: Actually check for existing app packge and upload if required
    var startCmds = []
    if (ncjParsedApplications) {
        logger.info("Configuring applications")
        
        for (var i = 0; i < ncjParsedApplications.length; i++) {
            var app = ncjParsedApplications[i];
            var appId = app.name.split('/');
            appId = appId[appId.length - 1];
            for (var j = 0; j < app.resources.length; j++) {
                appPackage = app.resources[j]
                appVersion = appPackage.name;
                jobClient.deployAppPackage(appId, appVersion, logger, _)
                startCmds.push(appPackage.properties.installCmd);
            }
        }
    }
    //TODO: Should only build start task from applications referenced by pool
    var poolStartTaskCmd = startCmds.join(' & ');

    //TODO: Check for existing pools/jobs and/or update existing pool
    //TODO: Complete pool object properties
    //TODO: Failure to deploy pool probably shouldn't stop other NCJ resources deploying
    if (ncjParsedPools) {
        logger.info("Configuring pools");
        for (var i = 0; i < ncjParsedPools.length; i++) {
            var pool = ncjParsedPools[i];
            var poolId = pool.name.split('/');
            poolId = poolId[poolId.length - 1];
            jobClient.deployPool(ncjId, poolId, pool.properties, poolStartTaskCmd, options, logger, _)
        }
    }

    //TODO: Complete job/task object properties
    //TODO: Check pool reference exists before deploying job
    //TODO: Wrap task commands to persist outputs to storage?
    if (ncjParsedJobs) {
      logger.info("Configuring jobs");
      for (var i = 0; i < ncjParsedJobs.length; i++) {
        var job = ncjParsedJobs[i];
        var jobId = job.name.split('/');
        jobId = jobId[jobId.length - 1];
        jobClient.deployJob(ncjId, jobId, job.properties, options, logger, _);
        var tasks = jobClient.parseTasks(job.properties.taskfactory, logger, _);
        logger.info(util.format("Submitting %s tasks", tasks.length));
        jobClient.deployTasks(jobId, tasks, options, logger, _);
      }
    }
    logger.info(util.format($('NCJ %s has been created successfully'), ncjId));
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
    ncjId = interaction.promptIfNotGiven($('NCJ id: '), ncjId, _);
    var ncjPools = [];
    var ncjJobs = [];
    var tips = $('Getting Batch ncj information');

    startProgress(tips);
    try {
      var pools = client.pool.list(_);
      for (var i = 0; i < pools.length;i++) {
        if (pools[i].metadata) {
          var ncjMetadata = pools[i].metadata.filter(function(x){return (x.name === "NCJ" && x.value === ncjId)});
          if (ncjMetadata) {
            ncjPools.push(pools[i]);
          }
        }
      }
      var jobs = client.job.list(_);
      for (var i = 0; i < jobs.length;i++) {
        if (jobs[i].metadata) {
          var ncjMetadata = jobs[i].metadata.filter(function(x){return (x.name === "NCJ" && x.value === ncjId)});
          if (ncjMetadata) {
            ncjJobs.push(jobs[i]);
          }
        }
      }
    } catch (e) {
      if (e.message) {
        if (typeof e.message === 'object') {
          e.message = e.message.value;
        }
      }
      throw e;
    } finally {
      endProgress();
    }
    if (!ncjJobs || !ncjPools) {
      throw new Error("No NCJ components found with this ID.")
    }
    //TODO: Format show output to something useful.
    for (var i = 0; i < ncjPools.length; i++) {
      batchShowUtil.showCloudPool(ncjPools[i], cli.output);
    }
    for (var i = 0; i < ncjJobs.length; i++) {
      batchShowUtil.showCloudJob(ncjJobs[i], cli.output);
    }
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

  function _generateSasToken(blobService, container, blobname, options, logger, _) {
    logger.verbose("Generating SAS token");
    var accessPolicy = {
      Permissions: BlobUtilities.SharedAccessPermissions.READ,
      Expiry: moment().add(options.sasExpiry, 'hours')
    };
    return blobService.generateSharedAccessSignature(container, blobname, {AccessPolicy:accessPolicy});
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
    return _generateSasToken(blobService, specifiedContainerName, specifiedBlobName, options, logger, _);
  }
};