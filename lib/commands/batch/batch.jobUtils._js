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

'use strict';
/*jshint esnext: true */

var batchUtil = require('./batch.util');
var batchPoolUtils = require('./batch.poolUtils');
var __ = require('underscore');

var batchJobUtils = {};

batchJobUtils.deployTasks = function (jobId, tasks, options, _) {
  var MAX_TASKS_COUNT_IN_BATCH = 100;
  var client = batchUtil.createBatchServiceClient(options);
  try {
    var start = 0;
    while (start < tasks.length) {
      var end = Math.min(start + MAX_TASKS_COUNT_IN_BATCH, tasks.length);
      var taskList = tasks.slice(start, end);
      client.task.addCollection(jobId, taskList, _);
      start = end;
    }
  } catch (err) {
    if (err.message) {
      if (typeof err.message === 'object') {
        err.message = err.message.value;
      }
    }
    throw err;
  }
};

batchJobUtils.getTaskCounts = function (jobId, options, _) {
  var client = batchUtil.createBatchServiceClient(options);
  var result;

  var taskCounts = {};
  taskCounts.active = 0;
  taskCounts.running = 0;
  taskCounts.completed = 0;

  try {
    var batchOptions = {};
    batchOptions.taskListOptions = batchUtil.getBatchOperationDefaultOption();
    batchOptions.taskListOptions.select = 'id, state';
    result = client.task.list(jobId, batchOptions, _);
    result.forEach(function (task) {
      // tasks.push(task);
      if (task.state == 'active') {
        taskCounts.active++;
      } else if (task.state == 'running') {
        taskCounts.running++;
      } else {
        taskCounts.completed++;
      }
    });
    var nextLink = result.odatanextLink;

    while (nextLink) {
      batchOptions = batchUtil.getBatchOperationDefaultOption();
      options.taskListOptions = batchOptions;
      result = client.task.listNext(nextLink, batchOptions, _);
      result.forEach(function (task) {
        //   tasks.push(task);
        if (task.state == 'active') {
          taskCounts.active++;
        } else if (task.state == 'running') {
          taskCounts.running++;
        } else {
          taskCounts.completed++;
        }
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
  }

  return taskCounts;
};

batchJobUtils.getTargetPoolOSType = function (job, batchClient, _) {
  if (__.isUndefined(job.poolInfo)) {
    throw new Error('Missing required poolInfo');
  }

  if (__.isUndefined(job.poolInfo.poolId) &&
    (__.isUndefined(job.poolInfo.autoPoolSpecification) || __.isUndefined(job.poolInfo.autoPoolSpecification.pool))) {
    throw new Error('Missing required poolId or autoPoolSpecification.pool');
  }

  var pool;
  if (!__.isUndefined(job.poolInfo.poolId)) {
    pool = batchClient.pool.get(job.poolInfo.poolId, {}, _);
  } else if (!__.isUndefined(job.poolInfo.autoPoolSpecification)) {
    pool = job.poolInfo.autoPoolSpecification.pool;
  } else {
    throw new Error('job.poolInfo must specify a poolId or an autoPoolSpecification.');
  }

  return batchPoolUtils.getPoolTargetOSType(pool);
};

module.exports = batchJobUtils;