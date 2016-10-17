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
var path = require('path');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-ncj-live-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch job', function () {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      
      //If playback or record mode - fail.
      if (suite.isPlayback() || suite.isRecording) {
        throw new Error('NCJ Live tests are not recorded and can only be run in live mode');
      }

      suite.setupSuite(function () {
        batchAccount = process.env.AZURE_BATCH_ACCOUNT;
        batchAccountKey = process.env.AZURE_BATCH_ACCESS_KEY;
        batchAccountEndpoint = process.env.AZURE_BATCH_ENDPOINT;
        done();
      });
    });
    
    after(function (done) {
      suite.teardownSuite(done);
    });
    
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should upload a local file to auto-storage', function (done) {
      var input = ".\\test\\data\\batchFileTests\\foo.txt"
      suite.execute('batch file upload %s %s --json', input, testPrefix, function (result) {
        result.exitStatus.should.equal(0);
        //TODO: query storage to confirm container name and blob uploaded
        done();
      });
    });

    it('should upload a local file to auto-storage with path prefix', function (done) {
      var input = ".\\test\\data\\batchFileTests\\foo.txt"
      suite.execute('batch file upload %s %s --path \\test/data\\ --json', input, testPrefix, function (result) {
        result.exitStatus.should.equal(0);
        //TODO: query storage to confirm container name and blob uploaded
        done();
      });
    });
  });
});