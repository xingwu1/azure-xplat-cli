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
var util = require('util');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Init batch ncj command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch ncj command usage
  */
  var batch = cli.category('batch');

  var ncj = batch.category('ncj').description($('Commands to manage your Batch ncjs'));

  var ncjPrepAndReleaseStatus = ncj.category('prep-release-status')
    .description($('Commands to manage the status of your ncj preparation and release tasks'));

  var logger = cli.output;

  var interaction = cli.interaction;

  ncj.command('create [json-file]')
    .description($('Adds a ncj to the specified account'))
    .option('-f, --json-file <json-file>', $('the file containing the ncj object to create in JSON format; if this parameter is specified, all other ncj parameters are ignored.'))
    .option('-i, --id <ncjId>', $('the Batch ncj id'))
    .option('-p, --pool-id <poolId>', $('the id of an existing pool; all the tasks of the ncj will run on the speicfied pool'))
    .option('--metadata <--metadata>', $('the semicolon separated list of name-value pairs associated with the ncj as metadata, ex: name1=value1;name2=value2'))
    .option('--priority <priority>', $('the priority of the ncj, ranging from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority; the default value is 0.'))
    .option('--max-wall-clock-time <max-wall-clock-time>', $('the maximum elapsed time that a ncj may run, in ISO 8601 duration formation'))
    .option('--max-task-retry-count <max-task-retry-count>', $('the maximum number of times each task may be retried'))
    .appendBatchAccountOption()
    .execute(createncj);

  ncj.command('list')
    .description($('Lists all of the ncjs in the specified account'))
    .option('-i, --ncj-schedule-id [ncjScheduleId]', $('the id of the ncj schedule from which you want to get a list of ncjs'))
    .appendODataFilterOption(true, true, true)
    .appendBatchAccountOption()
    .execute(listncjs);
  
  ncj.command('show [ncjId]')
    .description($('Show information about the specified ncj'))
    .option('-i, --id <ncjId>', $('the id of the ncj'))
    .appendODataFilterOption(true, false, true)
    .appendBatchAccountOption()
    .execute(showncj);

  ncj.command('delete [ncjId]')
    .description($('Delete the specified ncj'))
    .option('-i, --id <ncjId>', $('the id of the ncj to delete'))
    .option('-q, --quiet', $('remove the specified ncj without confirmation'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(deletencj);

  ncj.command('set [ncjId] [json-file]')
    .description($('Patch/Update the properties of a ncj'))
    .option('-i, --id <ncjId>', $('the id of the ncj whose properties you want to patch/update'))
    .option('-p, --pool-id <poolId>', $('the id of an existing pool; all the tasks of the ncj will run on the speicfied pool'))
    .option('--metadata <--metadata>', $('the semicolon separated list of name-value pairs associated with the ncj as metadata, ex: name1=value1;name2=value2'))
    .option('--priority <priority>', $('the priority of the ncj, ranging from -1000 to 1000, with -1000 being the lowest priority and 1000 being the highest priority; the default value is 0.'))
    .option('--max-wall-clock-time <max-wall-clock-time>', $('the maximum elapsed time that a ncj may run, in ISO 8601 duration formation'))
    .option('--max-task-retry-count <max-task-retry-count>', $('the maximum number of times each task may be retried'))
    .option('-f, --json-file <json-file>', $('the file containing the ncj properties to patch/update in JSON format; if this parameter is specified, all other ncj parameters are ignored.'))
    .option('-r, --replace', $('uses update instead of patch'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(updatencj);

  ncj.command('enable <ncjId>')
    .description($('Enables the specified ncj, allowing new tasks to run'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(enablencj);

  ncj.command('disable <ncjId>')
    .description($('Disables the specified ncj.  Disabled ncjs do not run new tasks, but may be re-enabled later.'))
    .option('-o, --disable-option <disableOption>', $('specifies what to do with active tasks during a disable ncj operation, available options include "requeue", "terminate", and "wait"'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(disablencj);

  ncj.command('stop <ncjId>')
    .description($('Terminates the specified ncj, marking it as completed'))
    .option('-r, --reason [reason]', $('the text you want to appear as the ncj\'s terminate reason'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(terminatencj);

  ncjPrepAndReleaseStatus.command('list <ncjId>')
    .description($('Lists the execution status of the ncj preparation and ncj release task for the specified ncj across the compute nodes where the ncj has run'))
    .appendODataFilterOption(true, true, false)
    .appendBatchAccountOption()
    .execute(listncjPrepAndReleaseTaskStatus);

  ncj.command('test')
    .execute(test);

  /**
  * Implement batch ncj cli
  */

  function test() {
    console.log("Hello World");
  }

  /**
  * Create a batch ncj
  * @param {string} [jsonFile] the file containing the ncj to create in JSON format
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createncj(jsonFile, options, _) {
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    var parsedJson = {};

    if (!jsonFile) {
      if (!options.id) {
        jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
      } else {
        parsedJson = { 'id' : options.id };
        
        var poolId = options.poolId;
        if (!poolId) {
          poolId = cli.interaction.promptIfNotGiven($('Pool id: '), poolId, _);
        }
        __.extend(parsedJson, { 'poolInfo' : { 'poolId' : poolId } });

        if (options.priority) {
          __.extend(parsedJson, { 'priority' : Number(options.priority) });
        }

        var constraintsJson = {};
        if (options.maxWallClockTime) {
          __.extend(constraintsJson, { 'maxWallClockTime' : options.maxWallClockTime });
        }

        if (options.maxTaskRetryCount) {
          __.extend(constraintsJson, { 'maxTaskRetryCount' : Number(options.maxTaskRetryCount) });
        }

        __.extend(parsedJson, { 'constraints' : constraintsJson });

        if (options.metadata) {
          ref = [];
          options.metadata.split(';').forEach(function(entry) {
            var item = entry.split('=');
            ref.push({ 'name' : item[0], 'value' : item[1] });
          });
          __.extend(parsedJson, { 'metadata' : ref });
        }
      }
    }

    if (jsonFile) {
      var objJson = fs.readFileSync(jsonFile).toString();
      parsedJson = JSON.parse(objJson);
    }

    var client = batchUtil.createBatchServiceClient(options);

    var addncj = null;
    if (parsedJson !== null && parsedJson !== undefined) {
      var resultMapper = new client.models['ncjAddParameter']().mapper();
      addncj = client.deserialize(resultMapper, parsedJson, 'result');
    }

    var tips = $('Creating Batch ncj');
    var batchOptions = {};
    batchOptions.ncjAddOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);
    try {
      client.ncj.add(addncj, batchOptions, _);
    } catch (err) {
      if (err.message) {
        if (typeof err.message === 'object') {
          err.message = err.message.value;
        }
      }

      throw err;
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('ncj %s has been created successfully'), addncj.id));
    showncj(addncj.id, options, _);
  }

  /**
  * Show the details of the specified Batch ncj
  * @param {string} [ncjId] ncj id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showncj(ncjId, options, _) {
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
  function listncjs(options, _) {
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
        logger.table(outputData, function(row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
        });
      }
    });
  }

  /**
  * Delete the specified batch ncj
  * @param {string} [ncjId] ncj Id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deletencj(ncjId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!ncjId) {
      ncjId = options.id;
    }
    ncjId = interaction.promptIfNotGiven($('ncj id: '), ncjId, _);
    var tips = util.format($('Deleting ncj %s'), ncjId);
    var batchOptions = {};
    batchOptions.ncjDeleteMethodOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.ncjDeleteMethodOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.ncjDeleteMethodOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.ncjDeleteMethodOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.ncjDeleteMethodOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete ncj %s? [y/n]: '), ncjId), _)) {
        return;
      }
    }
    
    startProgress(tips);

    try {
      client.ncj.deleteMethod(ncjId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('ncj %s does not exist'), ncjId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('ncj %s has been deleted successfully'), ncjId));
  }

  /**
   * Update/Patch the specified batch ncj
   * @param {string} [ncjId] ncj Id
   * @param {string} [jsonFile] file containing the ncj properties to update in JSON format
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function updatencj(ncjId, jsonFile, options, _) {
    if (!ncjId) {
      ncjId = options.id;
    }
    ncjId = interaction.promptIfNotGiven($('ncj id: '), ncjId, _);
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }

    var parsedJson = {};

    if (!jsonFile) {
      if (!options.poolId && !options.priority && !options.maxWallClockTime && !options.maxTaskRetryCount && !options.metadata) {
        jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
      } else {
        var poolId = options.poolId;
        if (options.poolId) {
          __.extend(parsedJson, { 'poolInfo' : { 'poolId' : poolId } });
        }

        if (options.priority) {
          __.extend(parsedJson, { 'priority' : Number(options.priority) });
        }

        var constraintsJson = {};
        if (options.maxWallClockTime) {
          __.extend(constraintsJson, { 'maxWallClockTime' : options.maxWallClockTime });
        }

        if (options.maxTaskRetryCount) {
          __.extend(constraintsJson, { 'maxTaskRetryCount' : Number(options.maxTaskRetryCount) });
        }

        __.extend(parsedJson, { 'constraints' : constraintsJson });

        if (options.metadata) {
          ref = [];
          options.metadata.split(';').forEach(function(entry) {
            var item = entry.split('=');
            ref.push({ 'name' : item[0], 'value' : item[1] });
          });
          __.extend(parsedJson, { 'metadata' : ref });
        }
      }
    }

    if (jsonFile) {
      var objJson = fs.readFileSync(jsonFile).toString();
      parsedJson = JSON.parse(objJson);
    }

    var client = batchUtil.createBatchServiceClient(options);

    var resultMapper;
    var tips;

    var ncjOptions = batchUtil.getBatchOperationDefaultOption();
    if (options.ifMatch) {
      ncjOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      ncjOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      ncjOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      ncjOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }
    
    var batchOptions = {};

    if (options.replace) {
      if (parsedJson !== null && parsedJson !== undefined) {
        resultMapper = new client.models['ncjUpdateParameter']().mapper();
        updatencjParam = client.deserialize(resultMapper, parsedJson, 'result');
      }

      tips = util.format($('Updating ncj %s'), ncjId);

      batchOptions.ncjUpdateOptions = ncjOptions;

      startProgress(tips);

      try {
        client.ncj.update(ncjId, updatencjParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('ncj %s does not exist'), ncjId));
        } else {
          if (err.message) {
            if (typeof err.message === 'object') {
              err.message = err.message.value;
            }
          }

          throw err;
        }
      } finally {
        endProgress();
      }
    } else {
      if (parsedJson !== null && parsedJson !== undefined) {
        resultMapper = new client.models['ncjPatchParameter']().mapper();
        updatencjParam = client.deserialize(resultMapper, parsedJson, 'result');
      }

      tips = util.format($('Patching ncj %s'), ncjId);

      batchOptions.ncjPatchOptions = ncjOptions;

      startProgress(tips);

      try {
        client.ncj.patch(ncjId, updatencjParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('ncj %s does not exist'), ncjId));
        } else {
          if (err.message) {
            if (typeof err.message === 'object') {
              err.message = err.message.value;
            }
          }

          throw err;
        }
      } finally {
        endProgress();
      }    
    }

    logger.verbose(util.format($('ncj %s has been updated/patched successfully'), ncjId));
    showncj(ncjId, options, _);
  }

  /**
   * Enable the specified batch ncj
   * @param {string} <ncjId> ncj Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function enablencj(ncjId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var tips = util.format($('Enabling ncj %s'), ncjId);
    var batchOptions = {};
    batchOptions.ncjEnableOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.ncjEnableOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.ncjEnableOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.ncjEnableOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.ncjEnableOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    startProgress(tips);

    try {
      client.ncj.enable(ncjId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('ncj %s does not exist'), ncjId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('ncj %s has been enabled'), ncjId));
  }

  /**
   * Disable the specified batch ncj
   * @param {string} <ncjId> ncj Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function disablencj(ncjId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var disableOption = options.disableOption;
    if (!disableOption) {
      disableOption = interaction.promptIfNotGiven($('ncj disable option: '), disableOption, _);
    }

    var tips = util.format($('Disabling ncj %s'), ncjId);
    var batchOptions = {};
    batchOptions.ncjDisableOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.ncjDisableOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.ncjDisableOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.ncjDisableOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.ncjDisableOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    startProgress(tips);

    try {
      client.ncj.disable(ncjId, disableOption, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('ncj %s does not exist'), ncjId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('ncj %s has been disabled'), ncjId));
  }

  /**
   * Terminate the specified batch ncj
   * @param {string} <ncjId> ncj Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function terminatencj(ncjId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var tips = util.format($('Terminating ncj %s'), ncjId);
    var batchOptions = {};
    batchOptions.ncjTerminateOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.ncjTerminateOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.ncjTerminateOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.ncjTerminateOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.ncjTerminateOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    if (options.terminateReason) {
      batchOptions.terminateReason = options.terminateReason;
    }

    startProgress(tips);

    try {
      client.ncj.terminate(ncjId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('ncj %s does not exist'), ncjId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('ncj %s has been terminated'), ncjId));
  }

 /**
  * List batch ncj prep and release task status
  * @param {string} <ncjId> ncj id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listncjPrepAndReleaseTaskStatus(ncjId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var tips = util.format($('Listing Batch ncj preparation and release task status for ncj %s'), ncjId);
    var batchOptions = {};

    batchOptions.ncjListPreparationAndReleaseTaskStatusOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.ncjListPreparationAndReleaseTaskStatusOptions.select = options.selectClause;
    }
    if (options.filterClause) {
      batchOptions.ncjListPreparationAndReleaseTaskStatusOptions.filter = options.filterClause;
    } 

    var ncjPrepReleaseExecutionInfos = [];
    startProgress(tips);

    try {
      result = client.ncj.listPreparationAndReleaseTaskStatus(ncjId, batchOptions, _);
      result.forEach(function (ncjPrepReleaseExecutionInfo) {
        ncjPrepReleaseExecutionInfos.push(ncjPrepReleaseExecutionInfo);
      });
      var nextLink = result.odatanextLink;
            
      while (nextLink) {
        batchOptions = batchUtil.getBatchOperationDefaultOption();
        
        batchOptions.ncjListPreparationAndReleaseTaskStatusNextOptions = batchOptions;
        result = client.ncj.listPreparationAndReleaseTaskStatusNext (nextLink, batchOptions, _);
        result.forEach(function (ncjPrepReleaseExecutionInfo) {
          ncjPrepReleaseExecutionInfos.push(ncjPrepReleaseExecutionInfo);
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

    cli.interaction.formatOutput(ncjPrepReleaseExecutionInfos, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No ncj preparation or ncj release task execution details found'));
      } else {
        logger.table(outputData, function(row, item) {
          row.cell($('Pool id'), item.poolId);
          row.cell($('Node id'), item.nodeId);
          if (item.ncjPreparationTaskExecutionInfo) {
            row.cell($('ncj Prep State'), item.ncjPreparationTaskExecutionInfo.state);
          }
          if (item.ncjReleaseTaskExecutionInfo) {
            row.cell($('ncj Release State'), item.ncjReleaseTaskExecutionInfo.state);
          }
        });
      }
    });
  }
};