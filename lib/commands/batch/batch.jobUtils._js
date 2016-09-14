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

function _parseTaskApplicationPackageReferences(applicationPackageReferences, task, logger) {
    __.extend(task, { 'applicationPackageReferences' : task.applicationPackageReferences });
    return task;
}

function _parseTaskOutputFiles(outputFiles, task, logger) {
    return task;
}

function _parseSimpleTaskFactory(taskFactory, logger) {
    var tasks = taskFactory.tasks;

    if (!__.isArray(tasks) || __.isEmpty(tasks)) {
        throw new Error($('No task is defined in simple task factory.'));
    }

    var taskObjs = [];
    __.each(tasks, function(task) {
        if (__.isUndefined(task.id) || __.isUndefined(task.commandLine)) {
            throw new Error('id and commandLine is required for task.');
        }

        var newTask = {
            id: task.id,
            commandLine: task.commandLine
        };

        if (!__.isUndefined(task.displayName)) {
            __.extend(newTask, { 'displayName' : task.displayName });
        }
        if (!__.isUndefined(task.resourceFiles)) {
            __.extend(newTask, { 'resourceFiles' : task.resourceFiles });
        }
        if (!__.isUndefined(task.environmentSettings)) {
            __.extend(newTask, { 'environmentSettings' : task.environmentSettings });
        }
        if (!__.isUndefined(task.constraints)) {
            __.extend(newTask, { 'constraints' : task.constraints });
        }
        if (!__.isUndefined(task.runElevated)) {
            __.extend(newTask, { 'runElevated' : task.runElevated });
        }
        if (!__.isUndefined(task.multiInstanceSettings)) {
            __.extend(newTask, { 'multiInstanceSettings' : task.multiInstanceSettings });
        }
        if (!__.isUndefined(task.dependsOn)) {
            __.extend(newTask, { 'dependsOn' : task.dependsOn });
        }
        if (!__.isUndefined(task.exitConditions)) {
            __.extend(newTask, { 'exitConditions' : task.exitConditions });
        }

        // Handle applicationPackageReference
        if (!__.isUndefined(task.applicationPackageReferences)) {
            newTask = _parseTaskApplicationPackageReferences(task.applicationPackageReferences, newTask, logger);
        }

        // Handle outputFiles
        if (!__.isUndefined(task.outputFiles)) {
            newTask = _parseTaskOutputFiles(task.outputFiles, newTask, logger);
        }

        taskObjs.push(newTask);
    });
    
    return taskObjs
}

function _parseParameterSets(parameterSets, logger) {
  var parameterList = [];

  __.each(parameterSets, function(parameterSet) {
    if (__.isUndefined(parameterSet.start)) {
      throw new Error($('No start in parameter set'));
    }

    var start = parseInt(parameterSet.start);

    if (__.isUndefined(parameterSet.end)) {
      throw new Error($('No end in parameter set'));
    }
    
    var end = parseInt(parameterSet.end);

    var step = 1;
    if (!__.isUndefined(parameterSet.step)) {
      step = parseInt(parameterSet.step);
      if (step == 0) {
        throw new Error($('Step in parameter set can not be 0'));
      }
    }

    if (start > end && step > 0) {
      throw new Error($('Step has to be nagitive number when end is greater than start.'));
    }
    if (start < end && step < 0) {
      throw new Error($('Step has to be positive number when end is less than start.'));
    }

    var list = [];

    if (start <= end) {
      for (var i = start; i <= end; i += step) {
        list.push(i);
      }
    } else {
      for (i = start; i >= end; i += step) {
        list.push(i);
      }
    }

  	parameterList.push(list);
  });

  return parameterList;
}

function permutations(parameters, level, list, callback) {
    if (level >= parameters.length) {
        callback(list);
    } else {
        for (var i = 0; i < parameters[level].length; i++) {
            var newlist = list.slice();
            newlist.push(parameters[level][i]);
            permutations(parameters, level + 1, newlist, callback);
        }
    }
}

function _parseRepeatTask(task, logger) {
    if (__.isUndefined(task.commandLine)) {
        throw new Error('commandLine is required for task.');
    }

    var newTask = {
        commandLine: task.commandLine
    };

    if (!__.isUndefined(task.displayName)) {
        __.extend(newTask, { 'displayName' : task.displayName });
    }
    if (!__.isUndefined(task.resourceFiles)) {
        __.extend(newTask, { 'resourceFiles' : task.resourceFiles });
    }
    if (!__.isUndefined(task.environmentSettings)) {
        __.extend(newTask, { 'environmentSettings' : task.environmentSettings });
    }
    if (!__.isUndefined(task.constraints)) {
        __.extend(newTask, { 'constraints' : task.constraints });
    }
    if (!__.isUndefined(task.runElevated)) {
        __.extend(newTask, { 'runElevated' : task.runElevated });
    }
    if (!__.isUndefined(task.exitConditions)) {
        __.extend(newTask, { 'exitConditions' : task.exitConditions });
    }

    // Handle applicationPackageReference
    if (!__.isUndefined(task.applicationPackageReferences)) {
        newTask = _parseTaskApplicationPackageReferences(task.applicationPackageReferences, newTask, logger);
    }

    // Handle outputFiles
    if (!__.isUndefined(task.outputFiles)) {
        newTask = _parseTaskOutputFiles(task.outputFiles, newTask, logger);
    }
    
    return newTask;
}

function reverseString(s) {
  for (var i = s.length - 1, o = ''; i >= 0; o += s[i--]) { }
  return o;
}

function replacementParameter(data, parameters) {
    // By design, user should escape all the literal '{' or '}' to '{{' or '}}'
    // All other '{' or '}' characters are used for replacement

    // Handle '{' and '}' escape scenario : replace '{{' to '\uD800', and '}}' to '\uD801'
    // The reverse function is used to handle {{{0}}}
    data = reverseString(reverseString(data.replace(/\{\{/g, '\uD800')).replace(/\}\}/g, '\uD801'));

    // Handle {n} or {n:m} scenario
    var reg = /\{(\d+)(:(\d+))?\}/g;
    data = data.replace(reg, function(r, r1, r2, r3) {
        var n = parseInt(r1);
        if (n >= parameters.length) {
            throw new Error(util.format("The parameter pattern %s is out of bound.", r));
        }
        var numberStr = parameters[n].toString();
        if (r.indexOf(':') > -1) {
            // This is {n:m} scenario
            if (parameters[n] < 0) {
                throw new Error(util.format("The parameter %s is negative which can't be used in pattern %s.", parameters[n], r));
            }
            var m = parseInt(r3);
            if (r3 < 1 || r3 > 9) {
                throw new Error(util.format("The parameter pattern %s is out of bound. The padding number can be only between 1 to 9.", r));
            }
            
            var padding = numberStr.length >= m ? numberStr : Array(m - numberStr.length + 1).join('0') + numberStr;
            return padding;
        }
        else {
            // This is just {n} scenario
            return numberStr;
        }
    });

    if ((data.indexOf('\{') > -1) || (data.indexOf('\}') > -1)) {
        throw new Error('Invalid using bracket characters, do you forget to escape it?');
    }

    // Replace '\uD800' back to '{', and '\uD801' back to '}'
    data = data.replace(/\uD800/g, '\{').replace(/\uD801/g, '\}');
    return data;
}

function _parseParametricSweep(taskFactory, logger) {
	if (!__.isArray(taskFactory.parameterSets) || __.isEmpty(taskFactory.parameterSets)) {
        throw new Error($('No parameter set is defined in parametric sweep task factory.'));
	}

	if (__.isUndefined(taskFactory.repeatTask)) {
        throw new Error($('No repeat task is defined in parametric sweep task factory.'));
	}

    var parameters = _parseParameterSets(taskFactory.parameterSets, logger);
    var repeatTask = _parseRepeatTask(taskFactory.repeatTask, logger);

    var taskObjs = [];
    permutations(parameters, 0, [], function(replacements) {
        var newTask = __.clone(repeatTask);
        __.extend(newTask, { id: taskObjs.length.toString() });

        newTask.commandLine = replacementParameter(newTask.commandLine, replacements);

        if (newTask.displayName) {
            newTask.displayName = replacementParameter(newTask.displayName, replacements);
        }

        if (newTask.resourceFiles) {
            for (var k = 0; k < newTask.resourceFiles.length; k++) {
                newTask.resourceFiles[k].filePath = replacementParameter(newTask.resourceFiles[k].filePath, replacements);
                newTask.resourceFiles[k].blobSource = replacementParameter(newTask.resourceFiles[k].blobSource, replacements);
            }
        }
        
        if (newTask.environmentSettings) {
            for (var k = 0; k < newTask.environmentSettings.length; k++) {
                newTask.environmentSettings[k].name = replacementParameter(newTask.environmentSettings[k].name, replacements);
                if (newTask.environmentSettings[k].value) {
                    newTask.environmentSettings[k].value = replacementParameter(newTask.environmentSettings[k].value, replacements);
                }
            } 
        }

        taskObjs.push(newTask);
    });

    return taskObjs;
}

batchJobUtils.parseTaskFactory = function (taskFactory, logger, _) {
    if (__.isUndefined(taskFactory.type)) {
	    throw new Error('No type property in taskFactory.');
	}    

    if (taskFactory.type == "parametricSweep") {
        logger.info("Parsing parametric sweep to generate tasks");
        return _parseParametricSweep(taskFactory.properties, logger);
    } else if (taskFactory.type == "regular") {
        logger.info("Parsing regular task factory to generate tasks");
        return _parseSimpleTaskFactory(taskFactory.properties, logger);
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