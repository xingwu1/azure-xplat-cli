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

var should = require('should');
var utils = require('../../../lib/util/utils');
var CLITest = require('../../framework/arm-cli-test');
var templateUtils = require('../../../lib/commands/batch/batch.templateUtils');

var path = require('path');
var createJobScheduleJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJobScheduleForJobTests.json');
var createJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJob.json');
var updateJsonFilePath = path.resolve(__dirname, '../../data/batchUpdateJob.json');

var requiredEnvironment = [
];

var testPrefix = 'cli-batch-ncj-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch ncj', function () {
    before(function (done) {
      done();
    });
    
    after(function (done) {
      done();
    });
    
    beforeEach(function (done) {
      done();
    });
    
    afterEach(function (done) {
      done();
    });
    
    it('should correct replace parametric sweep command', function (done) {
      var result = templateUtils.replacementParameter("cmd {{{0}}}.mp3 {1}.mp3", [5, 10]);
      result.should.equal('cmd {5}.mp3 10.mp3');
      done();
    });

  });
});