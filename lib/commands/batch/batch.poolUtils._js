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

var batchPoolUtils = {};

batchPoolUtils.deployAppPackage = function (appId, appVersion, logger, _) {
    logger.info(util.format("Deploying application package %s version %s...", appId, appVersion));
}

batchPoolUtils.deployPool = function (ncjId, poolId, properties, startCmd, options, logger, _) {
    var client = batchUtil.createBatchServiceClient(options);
    //Check if pool already exists.
    try {
      client.pool.get(poolId, _);
      logger.warn(util.format("Pool %s already exists. Continuing to deploy remaining resources.", poolId));
      return
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
    var pool = { id: poolId };
    pool.metadata = [{'name': 'NCJ', 'value': ncjId}];
    pool.vmSize = properties.size;
    pool.targetDedicated = Number(properties.count);
    pool.cloudServiceConfiguration = {}
    pool.cloudServiceConfiguration.osFamily = properties.cloudServiceConfiguration.osFamily;
    pool.cloudServiceConfiguration.targetOSVersion = properties.cloudServiceConfiguration.targetOSVersion;
    pool.startTask = { commandLine: "cmd /c " + startCmd, runElevated: true };
    pool.applicationPackageReferences = []
    for (var i = 0; i < properties.softwares.length; i++) {
        var appRef = {}
        var refPath = properties.softwares[i].substring(11, properties.softwares[i].length - 2).split('/');
        appRef.applicationId = refPath[refPath.length - 3];
        appRef.version = refPath[refPath.length - 1];
        pool.applicationPackageReferences.push(appRef);
    }
    logger.info(util.format("Deploying pool: %s", pool.id));
    logger.verbose(JSON.stringify(pool));
    try {
        client.pool.add(pool, _);
    } catch (err) {
        if (err.message) {
            if (typeof err.message === 'object') {
                err.message = err.message.value;
            }
        }
        throw err;
    }    
}

module.exports = batchPoolUtils;