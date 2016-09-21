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
var utils = require('../../util/utils');

var $ = utils.getLocaleString;

var batchTemplateUtils = {};

batchTemplateUtils.parseTaskApplicationPackageReferences = function (applicationPackageReferences, task) {
    __.extend(task, { 'applicationPackageReferences' : task.applicationPackageReferences });
    return task;
};

batchTemplateUtils.parseTaskOutputFiles = function (outputFiles, task) {
    return task;
};

batchTemplateUtils.parseSimpleTaskFactory = function (taskFactory) {
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
            newTask = batchTemplateUtils.parseTaskApplicationPackageReferences(task.applicationPackageReferences, newTask);
        }

        // Handle outputFiles
        if (!__.isUndefined(task.outputFiles)) {
            newTask = batchTemplateUtils.parseTaskOutputFiles(task.outputFiles, newTask);
        }

        taskObjs.push(newTask);
    });
    
    return taskObjs;
};

batchTemplateUtils.parseParameterSets = function (parameterSets) {
  var parameterList = [];

  if (!__.isArray(parameterSets) || parameterSets.length < 1) {
      throw new Error('No parameter set is defined.');
  }

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
      if (step === 0) {
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
    var i;

    if (start <= end) {
      for (i = start; i <= end; i += step) {
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
};

// A full permutation helper function on parameters input
// parameters : array of values would like to do full permutation
// level, list : helper parameter, should start with 0 and []
// callback: the callback function to be called when each permutation is generated
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

function parseRepeatTask(task) {
    if (task.id) {
        throw new Error('should not have id for repeat task.');
    }
    
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
        newTask = batchTemplateUtils.parseTaskApplicationPackageReferences(task.applicationPackageReferences, newTask);
    }

    // Handle outputFiles
    if (!__.isUndefined(task.outputFiles)) {
        newTask = batchTemplateUtils.parseTaskOutputFiles(task.outputFiles, newTask);
    }
    
    return newTask;
}

function reverseString(s) {
    for (var i = s.length - 1, o = ''; i >= 0; ) { 
        o += s[i--]; 
    }
    return o;
}

batchTemplateUtils.replacementParameter = function (data, parameters) {
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
            throw new Error(util.format('The parameter pattern %s is out of bound.', r));
        }
        var numberStr = parameters[n].toString();
        if (r.indexOf(':') > -1) {
            // This is {n:m} scenario
            if (parameters[n] < 0) {
                throw new Error(util.format('The parameter %s is negative which can\'t be used in pattern %s.', parameters[n], r));
            }
            var m = parseInt(r3);
            if (r3 < 1 || r3 > 9) {
                throw new Error(util.format('The parameter pattern %s is out of bound. The padding number can be only between 1 to 9.', r));
            }
            
            var padding = numberStr.length >= m ? numberStr : new Array(m - numberStr.length + 1).join('0') + numberStr;
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
};

batchTemplateUtils.parseParametricSweep = function (taskFactory) {
	if (!__.isArray(taskFactory.parameterSets) || __.isEmpty(taskFactory.parameterSets)) {
        throw new Error($('No parameter set is defined in parametric sweep task factory.'));
	}

	if (__.isUndefined(taskFactory.repeatTask)) {
        throw new Error($('No repeat task is defined in parametric sweep task factory.'));
	}

    var parameters = batchTemplateUtils.parseParameterSets(taskFactory.parameterSets);
    var repeatTask = parseRepeatTask(taskFactory.repeatTask);

    var taskObjs = [];
    permutations(parameters, 0, [], function(replacements) {
        // Need deep clone here
        var newTask = JSON.parse(JSON.stringify(repeatTask));
        __.extend(newTask, { id: taskObjs.length.toString() });

        newTask.commandLine = batchTemplateUtils.replacementParameter(newTask.commandLine, replacements);

        if (newTask.displayName) {
            newTask.displayName = batchTemplateUtils.replacementParameter(newTask.displayName, replacements);
        }

        var k;
        if (newTask.resourceFiles) {
            for (k = 0; k < newTask.resourceFiles.length; k++) {
                newTask.resourceFiles[k].filePath = batchTemplateUtils.replacementParameter(newTask.resourceFiles[k].filePath, replacements);
                newTask.resourceFiles[k].blobSource = batchTemplateUtils.replacementParameter(newTask.resourceFiles[k].blobSource, replacements);
            }
        }
        
        if (newTask.environmentSettings) {
            for (k = 0; k < newTask.environmentSettings.length; k++) {
                newTask.environmentSettings[k].name = batchTemplateUtils.replacementParameter(newTask.environmentSettings[k].name, replacements);
                if (newTask.environmentSettings[k].value) {
                    newTask.environmentSettings[k].value = batchTemplateUtils.replacementParameter(newTask.environmentSettings[k].value, replacements);
                }
            } 
        }

        taskObjs.push(newTask);
    });

    if (taskFactory.mergeTask) {
        var mergeTask = parseRepeatTask(taskFactory.mergeTask);
        __.extend(mergeTask, { id: 'merge' });
        __.extend(mergeTask, { dependsOn: { taskIdRanges: { start : 0, end : taskObjs.length -1 }} });

        taskObjs.push(mergeTask);
    }
    return taskObjs;
};

batchTemplateUtils.parseARMStyleTemplate = function (value, template, properties) {
    if (!isNaN(value)) {
        return value;
    }
    if (value[0] === '[' && value[value.length - 1] === ']') {
        value = value.substring(1, value.length - 1);

    } else if (value[0] === '(' && value[value.length - 1] === ')') {
        return batchTemplateUtils.parseARMStyleTemplate(value.substring(1, value.length - 1), template, properties);

    } else if (value[0] === '\'' && value[value.length - 1] === '\'') {
        return value.substring(1, value.length - 1);
    }

    var subValue;
    var variable;
    if (new RegExp('^parameters').test(value)) {
        subValue = value.substring(12, value.length - 2);
        var userValue = template.parameters[subValue].defaultValue;
        if (properties && properties[subValue]) {
            userValue = properties[subValue].value;
        }
        if (!userValue) {
            // TODO: Should we prompt the user in this case??

            throw new Error(util.format('No value supplied for parameter %s and no default value.', subValue));
        }
        return userValue;

    } else if (new RegExp('^variables').test(value)) {
        subValue = value.substring(11, value.length - 2);
        variable = batchTemplateUtils.parseARMStyleTemplate(template.variables[subValue], template, properties);
        return variable;

    } else if (new RegExp('^concat').test(value)) {
        subValues = value.substring(7, value.length - 1).split(',');
        var concatValues = subValues.map(function (x) { return x.trim(); });
        concatValues = concatValues.map(function (x) { return batchTemplateUtils.parseARMStyleTemplate(x, template, properties); });
        return concatValues.join('');

    } else if (new RegExp('^reference').test(value)) {
        subValue = value.substring(10, value.length - 1);
        variable = batchTemplateUtils.parseARMStyleTemplate(subValue, template, properties);
        return '[reference(' + variable + ')]';

    } else {
        return value;
    }
};

batchTemplateUtils.parseTaskFactory = function (taskFactory) {
    if (__.isUndefined(taskFactory.type)) {
	    throw new Error('No type property in taskFactory.');
	}    

    if (taskFactory.type == 'parametricSweep') {
        return batchTemplateUtils.parseParametricSweep(taskFactory.properties);
    } else if (taskFactory.type == 'regular') {
        return batchTemplateUtils.parseSimpleTaskFactory(taskFactory.properties);
    } else {
        throw new Error(util.format('%s is not a valid task factory', taskFactory.type));
    }
};

batchTemplateUtils.parseTemplate = function (template, jsonTemplate, parameters) {
    
    // TODO: explain the regexp
    var re = /\[[\w ,.\(\)\-/'\{\}\$]+\]/g;
    var match = re.exec(template);
    var updatedJson = '';
    var currentIndex = 0;
    while (match) {
        var replace = batchTemplateUtils.parseARMStyleTemplate(match[0], jsonTemplate, parameters);
        updatedJson = updatedJson + template.substring(currentIndex, match.index) + replace;
        currentIndex = match.index + match[0].length;
        match = re.exec(template);
    }
    updatedJson = updatedJson + template.substring(currentIndex);
    return JSON.parse(updatedJson);
};

module.exports = batchTemplateUtils;