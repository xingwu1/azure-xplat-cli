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
exports.init = function (cli) {

  //Init batchUtil
  batchUtil.init(cli);

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

  ncj.command('test')
    .execute(test);

  /**
  * Implement batch ncj cli
  */

  function test() {
    console.log("Hello World!");
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
          logger.info("      Batch Resource (" +batchResource.type + "): " + batchResource.name);
        }
      }
    }

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
};