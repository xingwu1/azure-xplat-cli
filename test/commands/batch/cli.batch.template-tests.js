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

var jobId = 'helloworld';
var poolId = 'testpool1';

var path = require('path');
var simpleJobTemplate = path.resolve(__dirname, '../../data/batch.job.simple.json');
var simplePoolTemplate = path.resolve(__dirname, '../../data/batch.pool.simple.json');
var simpleJobParameter = path.resolve(__dirname, '../../data/batch.job.parameters.json');
var simplePoolParameter = path.resolve(__dirname, '../../data/batch.pool.parameters.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-template-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch job', function () {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      
      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(function () {
        batchAccount = process.env.AZURE_BATCH_ACCOUNT;
        if (suite.isPlayback()) {
          batchAccountKey = 'non null default value';
        } else {
          batchAccountKey = process.env.AZURE_BATCH_ACCESS_KEY;
        }
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
    
    it('should create a job and tasks from ARM-style template', function (done) {
      suite.execute('batch job create --template %s --parameters %s  --account-name %s --account-key %s --account-endpoint %s --json', 
          simpleJobTemplate, simpleJobParameter, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdJob = JSON.parse(result.text);
        createdJob.should.not.be.null;
        createdJob.id.should.equal(jobId);

        suite.execute('batch task list %s --account-name %s --account-key %s --account-endpoint %s --json', 
          jobId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var tasks = JSON.parse(result.text);
          tasks.some(function (task) {
            return task.id === 'mytask1';
          }).should.be.true;

          suite.execute('batch job delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', 
              jobId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    });

    it('should create a pool from ARM-style template', function (done) {
      suite.execute('batch pool create --template %s --parameters %s  --account-name %s --account-key %s --account-endpoint %s --json', 
          simplePoolTemplate, simplePoolParameter, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdPool = JSON.parse(result.text);
        createdPool.should.not.be.null;
        createdPool.id.should.equal(poolId);
        createdPool.virtualMachineConfiguration.should.not.be.null;

        suite.execute('batch pool delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet',  
            poolId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });    
  });
});