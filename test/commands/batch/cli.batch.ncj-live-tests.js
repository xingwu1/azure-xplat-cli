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
  
  describe('batch shipyard integration', function () {
    var requiredEnvironment = [
      { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
      { name: 'AZURE_BATCH_ACCESS_KEY', defaultValue: 'non null default value' },
      { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' },
      { name: 'AZURE_BATCH_SHIPYARD_PATH', defaultValue: path.join('D:', 'batch-shipyard', 'shipyard.py') }
    ];
    
    var poolId = 'ncj-shipyard-test-pool01';
    var jobId = 'ncj-shipyard-test-job01';
    var taskId = 'task01';
    var poolTemplate = path.resolve(__dirname, path.join('..', '..', 'data', 'batch.shipyard.pool.json'));
    var jobTemplate = path.resolve(__dirname, path.join('..', '..', 'data', 'batch.shipyard.job.json'));
    
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      
      if (suite.isMocked || suite.isPlayback()) {
        throw new Error('NCJ Live tests are not recorded and can only be run in live mode');
      }
      
      suite.setupSuite(function () {
        batchAccount = process.env.AZURE_BATCH_ACCOUNT;
        batchAccountKey = process.env.AZURE_BATCH_ACCESS_KEY;
        batchAccountEndpoint = process.env.AZURE_BATCH_ENDPOINT;
        
        // Check if job exists, since Batch Shipyard will throw an error if the job already exists.
        // TODO: Should we just delete it and wait for it to disappear?
        suite.execute('batch job show %s --json', jobId, function (result) {
          if (result.text !== '') {
            throw new Error('Job ' + jobId + ' must be deleted in order to run this test.');
          }
          done();
        });
      });
    });
    
    after(function (done) {
      suite.teardownSuite(done);
    });
    
    beforeEach(function (_) {
      suite.setupTest(_);
    });
    
    afterEach(function (done) {
      suite.execute('batch job delete %s -q --json', jobId, function (result) {
        suite.teardownTest(done);
      });
    });
  
    // TODO: It seems like there's a 10 minute timeout on these tests by default?
    // When the full pool setup via Batch Shipyard is executed, the test will end after about 10 
    // minutes with no messages indicating why. For now, the test will create a pool normally with 
    // the same id and let Batch Shipyard return a conflict error.
    // Need to investigate if it's possible to extend the timeout.
    it('should attempt to create a pool using Batch Shipyard', function (done) {
      suite.execute('batch pool create -i %s -S standard_a1 -p Canonical -O UbuntuServer -K 16.04.0-LTS -t 0 -n %s --account-name %s --account-key %s --account-endpoint %s --json',  
        poolId, 'batch.node.ubuntu 16.04', batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        suite.execute('batch pool create --template %s', poolTemplate, function (result) {
          result.exitStatus.should.not.equal(0);
          result.errorText.should.not.be.null;
          result.errorText.should.containEql('Command failed: python ' + process.env['AZURE_BATCH_SHIPYARD_PATH']);
          done();
        });
      });
    });
    
    it('should create a job and task using Batch Shipyard', function (done) {
      suite.execute('batch job create --template %s', jobTemplate, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job show %s --json', jobId, function (result) {
          result.exitStatus.should.equal(0);
          var job = JSON.parse(result.text);
          job.id.should.equal(jobId);
          suite.execute('batch task show %s %s --json', jobId, taskId, function (result) {
            result.exitStatus.should.equal(0);
            var task = JSON.parse(result.text);
            task.id.should.equal(taskId);
            done();
          });
        });
      });
    });
  });
});