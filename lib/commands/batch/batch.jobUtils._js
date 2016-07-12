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
var uuid = require('node-uuid');

var profile = require('../../util/profile');
var util = require('util');
var utils = require('../../util/utils');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

var batchJob = {};

batchJob.createJob = function (jsonFile, options, logger, _) {
  if (!jsonFile) {
    jsonFile = options.jsonFile;
  }
  var parsedJson = {};

  if (!jsonFile) {
    if (!options.id) {
      jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
    } else {
      parsedJson = { 'id': options.id };

      var poolId = options.poolId;
      if (!poolId) {
        poolId = cli.interaction.promptIfNotGiven($('Pool id: '), poolId, _);
      }
      __.extend(parsedJson, { 'poolInfo': { 'poolId': poolId } });

      if (options.priority) {
        __.extend(parsedJson, { 'priority': Number(options.priority) });
      }

      var constraintsJson = {};
      if (options.maxWallClockTime) {
        __.extend(constraintsJson, { 'maxWallClockTime': options.maxWallClockTime });
      }

      if (options.maxTaskRetryCount) {
        __.extend(constraintsJson, { 'maxTaskRetryCount': Number(options.maxTaskRetryCount) });
      }

      __.extend(parsedJson, { 'constraints': constraintsJson });

      if (options.metadata) {
        ref = [];
        options.metadata.split(';').forEach(function (entry) {
          var item = entry.split('=');
          ref.push({ 'name': item[0], 'value': item[1] });
        });
        __.extend(parsedJson, { 'metadata': ref });
      }
    }
  }

  if (jsonFile) {
    var objJson = fs.readFileSync(jsonFile).toString();
    parsedJson = JSON.parse(objJson);
  }

  var client = batchUtil.createBatchServiceClient(options);

  var addJob = null;
  if (parsedJson !== null && parsedJson !== undefined) {
    var resultMapper = new client.models['JobAddParameter']().mapper();
    addJob = client.deserialize(resultMapper, parsedJson, 'result');
  }

  var tips = $('Creating Batch job');
  var batchOptions = {};
  batchOptions.jobAddOptions = batchUtil.getBatchOperationDefaultOption();

  startProgress(tips);
  try {
    client.job.add(addJob, batchOptions, _);
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

  logger.verbose(util.format($('Job %s has been created successfully'), addJob.id));
  showJob(addJob.id, options, _);
};

module.exports = batchJob;