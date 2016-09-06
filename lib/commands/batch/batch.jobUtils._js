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
var moment = require('moment');
var profile = require('../../util/profile');
var util = require('util');
var utils = require('../../util/utils');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

var batchJobUtils = {};

function _parseParametricSweep(taskFactory, logger, _) {
    var start = Number(taskFactory.start);
    var end = Number(taskFactory.end);
    var skip = Number(taskFactory.skip);
    var taskObjs = []
    var taskParams = taskFactory.repeatTask
    for (var i = start; i <= end; i += skip) {
        var newTask = { id: i.toString() }
        if (taskParams.cmdLine) {
            newTask.commandLine = taskParams.cmdLine.replace(/\{\$\}/g, i);
        }
        if (taskParams.resourceFiles) {
            newTask.resourceFiles = []
            files = taskParams.resourceFiles;;
            for (var k = 0; k < files.length; k++) {
                var resource = {}
                resource.filePath = files[k].path.replace(/\{\$\}/g, i);
                resource.blobSource = files[k].source.replace(/\{\$\}/g, i);
                newTask.resourceFiles.push(resource);
            }
        }
        logger.verbose(JSON.stringify(newTask));
        taskObjs.push(newTask);
    }
    return taskObjs;
}

function _parseSimpleTaskFactory(taskFactory, logger, _) {
    var taskObjs = [];
    var tasks = taskFactory.tasks;
    for (var i = 0; i < tasks.length; i++) {
        var newTask = {
            id: i.toString(),
            commandLine: tasks[i].cmdLine,
        };

        if (tasks[i].resourceFiles) {
            newTask.resourceFiles = tasks[i].resourceFiles;
        }

        taskObjs.push(newTask);
    }
    return taskObjs
}

batchJobUtils.parseTasks = function (taskFactory, logger, _) {
    if (taskFactory.type == "parametricSweepTask") {
        logger.info("Parsing parametric sweep to generate tasks");
        return _parseParametricSweep(taskFactory.properties, logger, _);
    } else if (taskFactory.type == "regular") {
        logger.info("Parsing regular task factory to generate tasks");
        return _parseSimpleTaskFactory(taskFactory.properties, logger, _);
    } else {
        throw new Error(util.format('%s is not a valid task factory', taskFactory.type));
    }
}

batchJobUtils.deployJob = function (job, options, logger, _) {
    var client = batchUtil.createBatchServiceClient(options);
    //Check if job already exists.
    try {
        client.job.get(job.id, _);
        logger.warn(util.format("Job %s already exists. Continuing to deploy remaining resources.", job.id));
        return false;
    } catch (err) {
        if (!batchUtil.isNotFoundException(err)) {
            if (err.message) {
                if (typeof err.message === 'object') {
                    err.message = err.message.value;
                }
            }
            throw err;
        }
    }

    job = _handleSpecialCaseInputs(job);
    logger.info(util.format("Deploying job: %s", job.id));
    logger.verbose(JSON.stringify(job));
    try {
        client.job.add(job, _);
    } catch (err) {
        if (err.message) {
            if (typeof err.message === 'object') {
                err.message = err.message.value;
            }
        }
        throw err;
    }
    return true;
}

batchJobUtils.deployTasks = function (jobId, tasks, options, logger, _) {
    var client = batchUtil.createBatchServiceClient(options);
    logger.verbose(JSON.stringify(tasks));
    try {
        client.task.addCollection(jobId, tasks, _);
    } catch (err) {
        if (err.message) {
            if (typeof err.message === 'object') {
                err.message = err.message.value;
            }
        }
        throw err;
    }
}

batchJobUtils.getTaskCounts = function (jobId, options, logger, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var result;

    var taskCounts = {};
    taskCounts.active = 0;
    taskCounts.running = 0;
    taskCounts.completed = 0;

    try {
        var batchOptions = {};
        batchOptions.taskListOptions = batchUtil.getBatchOperationDefaultOption();
        batchOptions.taskListOptions.select = "id, state";
        result = client.task.list(jobId, batchOptions, _);
        result.forEach(function (task) {
            // tasks.push(task);
            if (task.state == "active") {
                taskCounts.active++;
            } else if (task.state == "running") {
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
                if (task.state == "active") {
                    taskCounts.active++;
                } else if (task.state == "running") {
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
}

function _handleSpecialCaseInputs(jobRef) {
    var job = jobRef;
    if (job.constraints && job.constraints.maxWallClockTime) {
        job.constraints.maxWallClockTime = moment.duration(job.constraints.maxWallClockTime);
    }

    return job;
}

module.exports = batchJobUtils;