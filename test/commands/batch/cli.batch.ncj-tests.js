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
      templateUtils.replacementParameter("cmd {{{0}}}.mp3 {1}.mp3", [5, 10]).should.equal('cmd {5}.mp3 10.mp3');
      templateUtils.replacementParameter("cmd {{0}}.mp3 {1}.mp3", [5, 10]).should.equal('cmd {0}.mp3 10.mp3');
      templateUtils.replacementParameter("cmd {0}.mp3 {1}.mp3", [5, 10]).should.equal('cmd 5.mp3 10.mp3');
      templateUtils.replacementParameter("cmd {0}{1}.mp3 {1}.mp3", [5, 10]).should.equal('cmd 510.mp3 10.mp3');
      templateUtils.replacementParameter("cmd {0}.mp3 {0}.mp3", [5, 10]).should.equal('cmd 5.mp3 5.mp3');
      templateUtils.replacementParameter("cmd {0:3}.mp3 {0}.mp3", [5, 10]).should.equal('cmd 005.mp3 5.mp3');
      templateUtils.replacementParameter("cmd {0:3}.mp3 {1:3}.mp3", [5, 1234]).should.equal('cmd 005.mp3 1234.mp3');
      templateUtils.replacementParameter("cmd {{}}.mp3", [5, 1234]).should.equal('cmd {}.mp3');
      done();
    });

    it('should raise error when replace invalid parametric sweep command', function (done) {
      (function(){ templateUtils.replacementParameter("cmd {0}.mp3 {2}.mp3", [5, 10]); }).should.throw();
      (function(){ templateUtils.replacementParameter("cmd {}.mp3 {2}.mp3", [5, 10]); }).should.throw();
      (function(){ templateUtils.replacementParameter("cmd {{0}}}.mp3 {1}.mp3", [5, 10]); }).should.throw();
      (function(){ templateUtils.replacementParameter("cmd {0:3}.mp3 {1}.mp3", [-5, 10]); }).should.throw();
      (function(){ templateUtils.replacementParameter("cmd {0:-3}.mp3 {1}.mp3", [5, 10]); }).should.throw();      
      done();
    });

    it('should correct parse parameter sets', function (done) {
      templateUtils.parseParameterSets([{start:1, end:2}]).should.eql([[1,2]]);
      templateUtils.parseParameterSets([{start:1, end:1}]).should.eql([[1]]);
      templateUtils.parseParameterSets([{start:1, end:2}, {start:-1, end:-3, step: -1}]).should.eql([[1,2], [-1, -2, -3]]);
      templateUtils.parseParameterSets([{start:1, end:2}, {start:-1, end:-3, step: -1}, {start: -5, end: 5, step: 3}]).should.eql([[1,2], [-1, -2, -3], [-5, -2, 1, 4]]);
      templateUtils.parseParameterSets([{start:1, end:2, step: 2000}, {start:-1, end:-3, step: -1}, {start: -5, end: 5, step: 3}]).should.eql([[1], [-1, -2, -3], [-5, -2, 1, 4]]);
      var result = templateUtils.parseParameterSets([{start:1, end:2000}]);
      result.length.should.equal(1);
      result[0].length.should.equal(2000);
      done();
    });

    it('should raise error when replace invalid parametric sweep command', function (done) {
      (function(){ templateUtils.parseParameterSets([]); }).should.throw();
      (function(){ templateUtils.parseParameterSets([{start:2, end:1}]); }).should.throw();
      (function(){ templateUtils.parseParameterSets([{start:1, end:3, step: -1}]); }).should.throw();
      (function(){ templateUtils.parseParameterSets([{start:1, end:3, step: 0}]); }).should.throw();
      (function(){ templateUtils.parseParameterSets([{end:3, step: 1}]); }).should.throw();
      (function(){ templateUtils.parseParameterSets([{start:3, step: 1}]); }).should.throw();
      (function(){ templateUtils.parseParameterSets([{start:1, end:2}, {}]); }).should.throw();
      done();
    });

    it('should correct parse parametric sweep', function (done) {
      templateUtils.parseParametricSweep({ parameterSets: [{start:1, end:2}, {start: 3, end: 5}], repeatTask : { commandLine: "cmd {0}.mp3 {1}.mp3" } }).should.eql(  
        [ { commandLine: 'cmd 1.mp3 3.mp3', id: '0' },
          { commandLine: 'cmd 1.mp3 4.mp3', id: '1' },
          { commandLine: 'cmd 1.mp3 5.mp3', id: '2' },
          { commandLine: 'cmd 2.mp3 3.mp3', id: '3' },
          { commandLine: 'cmd 2.mp3 4.mp3', id: '4' },
          { commandLine: 'cmd 2.mp3 5.mp3', id: '5' } ]);

      templateUtils.parseParametricSweep(
        { parameterSets: [
            {start:1, end:3}
          ], 
          repeatTask : { 
            commandLine: "cmd {0}.mp3", 
            resourceFiles : [
              { 
                filePath: "run.exe",
                blobSource: "http://account.blob/run.exe"
              },
              { 
                filePath: "{0}.mp3",
                blobSource: "http://account.blob/{0}.dat"
              }
            ] 
          } 
        }).should.eql(  
        [ { commandLine: 'cmd 1.mp3',              
            resourceFiles : [
              { 
                filePath: "run.exe",
                blobSource: "http://account.blob/run.exe"
              },
              { 
                filePath: "1.mp3",
                blobSource: "http://account.blob/1.dat"
              }
            ], id: '0' },
          { commandLine: 'cmd 2.mp3',
            resourceFiles : [
              { 
                filePath: "run.exe",
                blobSource: "http://account.blob/run.exe"
              },
              { 
                filePath: "2.mp3",
                blobSource: "http://account.blob/2.dat"
              }
            ], id: '1' },
          { commandLine: 'cmd 3.mp3',
            resourceFiles : [
              { 
                filePath: "run.exe",
                blobSource: "http://account.blob/run.exe"
              },
              { 
                filePath: "3.mp3",
                blobSource: "http://account.blob/3.dat"
              }
            ], id: '2' }
        ]);

      templateUtils.parseParametricSweep(
        { parameterSets: [
            {start:1, end:3}
          ], 
          repeatTask : { 
            commandLine: "cmd {0}.mp3"
          },
          mergeTask : {
            commandLine: "summary.exe"
          }
        }).should.eql(  
        [ { commandLine: 'cmd 1.mp3', id: '0' },
          { commandLine: 'cmd 2.mp3', id: '1' },
          { commandLine: 'cmd 3.mp3', id: '2' },
          { commandLine: 'summary.exe', id: 'merge',
              dependsOn: { taskIdRanges: { start: 0, end: 2 }} } ]);
          
      done();
    });

    it('should raise error when invalid parametric sweep task factory', function (done) {
      (function(){templateUtils.parseParametricSweep(
        { repeatTask : { 
            commandLine: "cmd {0}.mp3"
          }
        });
      }).should.throw();

      (function(){templateUtils.parseParametricSweep(
        {  parameterSets: [
            {start:1, end:3}
          ]
        });
      }).should.throw();

      // no commandline
      (function(){templateUtils.parseParametricSweep(
        { parameterSets: [
            {start:1, end:3}
          ], 
          repeatTask : { 
            resourceFiles : [
              { 
                filePath: "run.exe",
                blobSource: "http://account.blob/run.exe"
              },
              { 
                filePath: "{0}.mp3",
                blobSource: "http://account.blob/{0}.dat"
              }
            ] 
          } 
        });
      }).should.throw();

      templateUtils.parseParametricSweep(
        { parameterSets: [
            {start:1, end:3}
          ], 
          repeatTask : { 
            commandLine: "cmd {0}.mp3", 
            resourceFiles : [
              { 
                filePath: "run.exe",
                blobSource: "http://account.blob/run.exe"
              },
              { 
                filePath: "{0}.mp3",
                blobSource: "http://account.blob/{0}.dat"
              }
            ] 
          } 
        })
      done();
    });
  });
});