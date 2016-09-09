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

var batchTemplateUtil = {};

/**
 * Parse the ARM pool reference and confirm that the pool exists.
 */
function _parsePoolRef(client, reference, _) {
    if (reference.substring(1, 10) === 'reference') {
        var poolRef = reference.substring(11, reference.length-2);
        var poolPath = poolRef.split('/');
        var poolId = poolPath[poolPath.length-1];
        try {
          client.pool.get(poolId, _);
          return poolId;
        } catch (err) {
          if (batchUtil.isNotFoundException(err)) {
            throw new Error(util.format($('Job %s set to run on pool %s that does not exist'), poolRef));
          } else {
            if (err.message) {
              if (typeof err.message === 'object') {
                err.message = err.message.value;
              }
            } 
            throw err;
          }
        }
    } else {
        throw new Error("Invalid pool reference in job");
    }
}

function _parseARM(value, template, properties, logger, _) {
    logger.verbose(value)
    if (!isNaN(value)) {
        logger.verbose(util.format("found a number %s", value));
        return value;
    }
    if (value[0] === '[' && value[value.length - 1] === ']') {
        logger.verbose(util.format("Processing ARM value: %s", value));
        value = value.substring(1, value.length - 1);

    } else if (value[0] === '(' && value[value.length - 1] === ')') {
        return _parseARM(value.substring(1, value.length - 1), template, properties, logger, _);

    } else if (value[0] === '\'' && value[value.length - 1] === '\'') {
        return value.substring(1, value.length - 1);
    }

    if (new RegExp("^parameters").test(value)) {
        logger.verbose("found parameter");
        var subValue = value.substring(12, value.length - 2);
        logger.verbose(subValue);
        var userValue = template.parameters[subValue].defaultValue;
        if (properties && properties[subValue]) {
            userValue = properties[subValue].value;
        }
        if (!userValue) {
            // TODO: Should we prompt the user in this case??

            throw new Error(util.format("No value supplied for parameter %s and no default value.", subValue));
        }
        logger.verbose(util.format("parsed param %s to %s", value, userValue));
        return userValue;

    } else if (new RegExp("^variables").test(value)) {
        logger.verbose("found variable");
        var subValue = value.substring(11, value.length - 2);
        var variable = _parseARM(template.variables[subValue], template, properties, logger, _);
        logger.verbose(util.format("parsed var %s to %s"), value, variable);
        return variable;

    } else if (new RegExp("^concat").test(value)) {
        logger.verbose("found concat string");
        var subValues = value.substring(7, value.length - 1).split(',');
        logger.verbose(subValues);
        var concatValues = subValues.map(function (x) { return x.trim() });
        concatValues = concatValues.map_(_, function (_, x) { return _parseARM(x, template, properties, logger, _) });
        logger.verbose(util.format("parsed var %s to %s", value, concatValues.join('')));
        return concatValues.join('');

    } else if (new RegExp("^reference").test(value)) {
        logger.verbose("found reference");
        var subValue = value.substring(10, value.length - 1);
        logger.verbose(subValue);
        var variable = _parseARM(subValue, template, properties, logger, _);
        return "[reference(" + variable + ")]";

    } else {
        return value;
    }
}

batchTemplateUtil.parseTemplate = function (template, jsonTemplate, parameters, logger, _) {
    
    var re = /\[[\w ,.\(\)\-/'\{\}\$]+\]/g
    var match = null;
    var matches = [];
    var updatedJson = ""
    var currentIndex = 0
    while (match = re.exec(template)) {
        logger.verbose(util.format("Found param: %s at %s", match[0], match.index))
        var replace = _parseARM(match[0], jsonTemplate, parameters, logger, _);
        logger.verbose(util.format("Replacing with", replace));
        updatedJson = updatedJson + template.substring(currentIndex, match.index) + replace;
        currentIndex = match.index + match[0].length;
    }
    updatedJson = updatedJson + template.substring(currentIndex);
    return JSON.parse(updatedJson);
}

module.exports = batchTemplateUtil;