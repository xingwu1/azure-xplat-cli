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
var __ = require('underscore');

var batchPoolUtils = {};

batchPoolUtils.PoolOperatingSystemFlavor = {
    windows: 'windows',
    linux: 'linux'
};

batchPoolUtils.getPoolTargetOSType = function (pool) {
    let imagePublisher;
    if (!__.isUndefined(pool.virtualMachineConfiguration)) {
        imagePublisher = pool.virtualMachineConfiguration.imageReference.publisher;
    }

    var osFlavor = batchPoolUtils.PoolOperatingSystemFlavor.windows;
    if (!__.isUndefined(imagePublisher)) {
        osFlavor = imagePublisher.indexOf('MicrosoftWindowsServer') > -1 ? 
            batchPoolUtils.PoolOperatingSystemFlavor.windows : batchPoolUtils.PoolOperatingSystemFlavor.linux;
    }

    return osFlavor;
};

module.exports = batchPoolUtils;