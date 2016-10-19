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
var fs = require('fs');
var os = require('os');
var storage = require('azure-storage');
var should = require('should');
var util = require('util');

var testPrefix = 'cli-batch-ncj-live-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;
var batchClient;

var storageAccount;
var outputBlobContainer = 'aaatestcontainer'; //TODO: Fix this
var outputContainerSas;
var blobClient;

var userName = process.env['USERNAME'] //TODO: This is probably windows specific

function submitJobWrapper(fileName, callback) {
  suite.execute('batch job create --template %s --account-name %s --account-key %s --account-endpoint %s',
    fileName, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
      console.log('Result text:' + result.text);
      console.log('Result error text:' + result.errorText);
      console.log('Result error stack: ' + result.errorStack);
      callback(null, result);
    });
}

function waitForTasksComplete(jobId, timeout, callback) {
  console.log('waiting for tasks to be complete');
  batchClient.task.list(jobId, function (error, result) {
    var tasks = [];
    var loop = function (nextLink) {
      if (nextLink !== null && nextLink !== undefined) {
        batchClient.task.listNext(nextLink, function (err, res) {
          tasks = tasks.concat(res);
          loop(res.odatanextLink);
        });
      } else {
        // Determine if the tasks are in completed state
        var allCompleted = true;
        console.log('determining if ' + tasks.length + ' tasks are complete');
        for (var i = 0; i < tasks.length; i++) {
          var task = tasks[i];
          if(task.state !== 'completed') {
            console.log('state is: ' + task.state);
            allCompleted = false;
          }
        }
        if(allCompleted) {
          console.log('Tasks in job ' + jobId + ' are now completed.');
          callback(null);
        } else {
          var waitFor = 3 * 1000;
          var timeRemaining = timeout - waitFor;
          if(timeRemaining < 0) {
            callback(new Error('Timed out'));
          } else {
            setTimeout(waitForTasksComplete, waitFor, jobId, timeRemaining, callback);
          }
        }
      }
    };
    tasks = tasks.concat(result);
    loop(result.odatanextLink);
  });
}

function waitForPoolSteady(poolId, timeout, callback) {
  console.log('waiting for pool to reach steady state');
  batchClient.pool.get(poolId, function(error, result) {
    if(result.allocationState === 'steady') {
      console.log('pool reached steady state');
      callback(null);
    } else {
      var waitFor = 3 * 1000;
      var timeRemaining = timeout - waitFor;
      if (timeRemaining < 0) {
        callback(new Error('Timed out'));
      } else {
        setTimeout(waitForPoolSteady, waitFor, poolId, timeRemaining, callback);
      }
    }
  });
}

function waitForVMsIdle(poolId, timeout, callback) {
  console.log('waiting for vms to be idle');
  batchClient.computeNodeOperations.list(poolId, function (error, result) {
    var nodes = [];
    var loop = function (nextLink) {
      if (nextLink !== null && nextLink !== undefined) {
        batchClient.computeNodeOperations.listNext(nextLink, function (err, res) {
          nodes = nodes.concat(res)
          loop(res.odatanextLink);
        });
      } else {
        // Determine if the nodes are in the idle state
        var allIdle = true;
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if(node.state !== 'idle') {
            allIdle = false;
          }
        }
        if(allIdle) {
          console.log('VMs in pool ' + poolId + ' are now idle.');
          callback(null, null);
        } else {
          var waitFor = 3 * 1000;
          var timeRemaining = timeout - waitFor;
          if(timeRemaining < 0) {
            callback(new Error('Timed out'), null);
          } else {
            setTimeout(waitForVMsIdle, waitFor, poolId, timeRemaining, callback);
          }
        }
      }
    };
    nodes = nodes.concat(result);
    loop(result.odatanextLink);
  });
};

function clearContainer(containerName, _) {
  console.log('clearing container ' + containerName);
  var blobs = listBlobs(containerName, _);
  blobs = blobs.map(function (x) { return x.name });

  for(var i = 0; i < blobs.length; i++) {
    blobClient.deleteBlob(containerName, blobs[i], _);
  }
}

function listBlobs(containerName, _) {
  var blobs = [];
  var listBlobResult = blobClient.listBlobsSegmented(containerName, null, _);
  blobs = blobs.concat(listBlobResult.entries);
  while (listBlobResult.continuationToken !== null && listBlobResult.continuationToken !== undefined) {
    listBlobResult = blobClient.listBlobsSegmented(containerName, listBlobResult.continuationToken, _);
    blobs = blobs.concat(listBlobResult.entries);
  }
  return blobs;
}

function createBasicSpec(jobId, poolId, taskId, textToEcho) {
  var spec = {
    job: {
      type: 'Microsoft.Batch/batchAccounts/jobs',
      apiVersion: '2016-12-01',
      properties: {
        id: jobId,
        poolInfo: {
          poolId: poolId
        },
        taskFactory: {
          type: 'taskCollection',
          tasks: [
            {
              id: taskId,
              commandLine: util.format('echo %s', textToEcho),
              outputFiles: [
                {
                  filePattern: '$AZ_BATCH_TASK_DIR/*.txt',
                  destination: {
                    container: {
                      containerSas: outputContainerSas
                    }
                  },
                  uploadDetails: {
                    taskStatus: 'TaskSuccess'
                  }
                }
              ]
            }
          ]
        }
      }
    }
  };

  return spec;
}

function createPoolIfNotExist(poolId, flavor, _) {
  console.log('Creating pool: ' + poolId);
  var skuResults = [];
  var result = batchClient.account.listNodeAgentSkus(_);
  skuResults = skuResults.concat(result);
  while(result.odatanextLink !== null && result.odatanextLink !== undefined) {
    result = batchClient.account.listNodeAgentSkusNext(result.odatanextLink, _);
    skuResults = skuResults.concat(result);
  }

  var publisher;
  var offer;
  var skuId;
  var nodeAgentSkuId;

  var skuFilterFunction = function (sku) {
    var length = sku.verifiedImageReferences.filter(function (imageRef) {
      return imageRef.publisher === publisher &&
        imageRef.offer === offer &&
        imageRef.sku === skuId
    }).length;
    return length > 0;
  };

  if (flavor === 'ubuntu14') {
    publisher = 'Canonical';
    offer = 'UbuntuServer';
    skuId = '14.04.5-LTS';
    var nodeAgentSkuResults = skuResults.filter(skuFilterFunction);
    nodeAgentSkuId = nodeAgentSkuResults[0].id;
  } else if (flavor === 'ubuntu16') {
    publisher = 'Canonical';
    offer = 'UbuntuServer';
    skuId = '16.04.0-LTS';
    var nodeAgentSkuResults = skuResults.filter(skuFilterFunction);
    nodeAgentSkuId = nodeAgentSkuResults[0].id;
  } else if (flavor === 'centos') {
    publisher = 'OpenLogic';
    offer = 'CentOS';
    skuId = '7.0';
    var nodeAgentSkuResults = skuResults.filter(skuFilterFunction);
    nodeAgentSkuId = nodeAgentSkuResults[0].id;
  } else if (flavor === 'debian') {
    publisher = 'Credativ';
    offer = 'Debian';
    skuId = '8';
    var nodeAgentSkuResults = skuResults.filter(skuFilterFunction);
    nodeAgentSkuId = nodeAgentSkuResults[0].id;
  } else if (flavor === 'suse-sles') {
    publisher = 'SUSE';
    offer = 'SLES';
    skuId = '12-SP1';
    var nodeAgentSkuResults = skuResults.filter(skuFilterFunction);
    nodeAgentSkuId = nodeAgentSkuResults[0].id;
  }

  console.log(util.format('Allocating pool %s, %s, %s with agent %s', publisher, offer, skuId, nodeAgentSkuId));
  
  var pool = {
    id: poolId,
    vmSize: 'STANDARD_D1_V2',
    virtualMachineConfiguration: {
      imageReference: {
        publisher: publisher,
        offer: offer,
        sku: skuId
      },
      nodeAgentSKUId: nodeAgentSkuId
    },
    targetDedicated: 1
  };

  try {
    batchClient.pool.add(pool, _);
    console.log('Successfully created pool ' + poolId);
  } catch (error) {
    if (error.code === 'PoolExists') {
      console.log('Pool already exists')
    } else {
      throw error;
    }
  }
  waitForPoolSteady(poolId, 5 * 60 * 1000, _);
  waitForVMsIdle(poolId, 5 * 60 * 1000, _);
}

function fileUploadTestHelper(jobId, poolId, taskId, poolFlavor, _) {
  try {
    createPoolIfNotExist(poolId, poolFlavor, _);
    var text = 'test'
    var spec = createBasicSpec(jobId, poolId, taskId, text);

    var fileName = path.join(os.tmpdir(), 'uploadTest.json')
    fs.writeFile(fileName, JSON.stringify(spec), _);
    var result = submitJobWrapper(fileName, _);
    result.exitStatus.should.equal(0);
    
    var job = batchClient.job.get(jobId, _);
    job.id.should.be.equal(jobId);
    
    waitForTasksComplete(jobId, 30 * 1000, _);
    
    var task = batchClient.task.get(jobId, taskId, _);

    should.exist(task.executionInfo);
    should.not.exist(task.executionInfo.schedulingError);
    task.executionInfo.exitCode.should.be.equal(0);

    var blobs = listBlobs(outputBlobContainer, _);

    var blobNames = blobs.map(function (x) { return x.name });
    blobNames.should.containEql('stdout.txt');
    blobNames.should.containEql('stderr.txt');
    blobNames.should.containEql('uploadlog.txt');
    var stdoutBlob = blobs.filter(function(x) { return x.name === 'stdout.txt' })[0];
    stdoutBlob.contentLength.should.be.equal('5');
  } finally {
    console.log('Deleting job ' + jobId);
    batchClient.job.deleteMethod(jobId, _);
  }
}

describe('cli', function () {
  describe('batch job', function () {

    var requiredEnvironment = [
      { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
      { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
    ];

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

  describe('batch ncj file egress', function () {

    var requiredEnvironment = [
      { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
      { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' },
      { name: 'AZURE_STORAGE_ACCOUNT', defaultValue: 'defaultaccount' },
      { name: 'AZURE_STORAGE_ACCESS_KEY', defaultValue: '1234' },
      { name: 'AZURE_STORAGE_BLOB_ENDPOINT', defaultValue: 'blob.core.windows.net' }
    ];

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      
      if (suite.isMocked || suite.isPlayback()) {
        throw new Error('NCJ Live tests are not recorded and can only be run in live mode');
      }
      
      suite.setupSuite(function () {
        batchAccount = process.env.AZURE_BATCH_ACCOUNT;
        batchAccountKey = process.env.AZURE_BATCH_ACCESS_KEY;
        batchAccountEndpoint = process.env.AZURE_BATCH_ENDPOINT;
        storageAccount = process.env.AZURE_STORAGE_ACCOUNT;

        blobClient = storage.createBlobService(
          storageAccount,
          process.env.AZURE_STORAGE_ACCESS_KEY,
          process.env.AZURE_STORAGE_BLOB_ENDPOINT);
        batchClient = utils.createBatchClient(batchAccount, batchAccountKey, batchAccountEndpoint);

        var now = new Date();
        outputContainerSas = blobClient.generateSharedAccessSignature(
          outputBlobContainer,
          null,
          {
            AccessPolicy: {
              Start: now,
              Expiry: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
              Permissions: 'rw'
            }
          });
        console.log('created output container sas: ' + outputContainerSas);

        //TODO: Do this better?
        outputContainerSas = 'https://' + storageAccount + '.blob.core.windows.net/' + outputBlobContainer + '?' + outputContainerSas;
        console.log('Full container sas: ' + outputContainerSas);

        done();
      });
    });
    
    after(function (done) {
      suite.teardownSuite(done);
    });
    
    beforeEach(function (_) {
      clearContainer(outputBlobContainer, _);
      suite.setupTest(_);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    it('file egress should work on ubuntu 14.04', function (_) {
      var jobId = util.format('%s-ncj-ubuntu1404', userName);
      var poolId = util.format('%s-ncj-ubuntu1404', userName);
      var taskId = 'myTask';

      fileUploadTestHelper(jobId, poolId, taskId, 'ubuntu14', _);
    });

    it('should work on ubuntu 16.04', function (_) {
      var jobId = util.format('%s-ncj-ubuntu1604', userName);
      var poolId = util.format('%s-ncj-ubuntu1604', userName);
      var taskId = 'myTask';

      fileUploadTestHelper(jobId, poolId, taskId, 'ubuntu16', _);
    });

    it('should work on CentOS 7', function (_) {
      var jobId = util.format('%s-ncj-centos70', userName);
      var poolId = util.format('%s-ncj-centos70', userName);
      var taskId = 'myTask';

      fileUploadTestHelper(jobId, poolId, taskId, 'centos', _);
    });

    it('should work on Debian 8', function (_) {
      var jobId = util.format('%s-ncj-debian8', userName);
      var poolId = util.format('%s-ncj-debian8', userName);
      var taskId = 'myTask';

      fileUploadTestHelper(jobId, poolId, taskId, 'debian', _);
    });

    it('should work on SUSE-SLES', function (_) {
      var jobId = util.format('%s-ncj-suse-sles', userName);
      var poolId = util.format('%s-ncj-suse-sles', userName);
      var taskId = 'myTask';

      fileUploadTestHelper(jobId, poolId, taskId, 'suse-sles', _);
    });

  });
});