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
var fs = require('fs');
var path = require('path');

var utils = require('../../../lib/util/utils');
var CLITest = require('../../framework/arm-cli-test');
var templateUtils = require('../../../lib/commands/batch/batch.templateUtils');

/*
 * File Paths for reused template files
 * (Paths for files used by only one test are resolved individually)
 */

// File path to an application template with no parameters - a static template that always does exactly the same thing
const staticApplicationTemplateFilePath = path.resolve(__dirname, '../../data/batch-appTemplate-static.json');

// File path to an application path with parameters
const applicationTemplateWithParametersFilePath = path.resolve(__dirname, "../../data/batch-appTemplate-parameters.json");

var requiredEnvironment = [
];

var testPrefix = 'cli-batch-appTemplate-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch applicationTemplates', function () {
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


  });
  
    it('should do nothing when no application template is required', function(done){

      const job = { 
        id : "jobid"
      };

      templateUtils.expandApplicationTemplate(job, function(err, result) {
        result.should.equal(job);
        done();
      });
    });  

    it('should throw error if no filePath supplied for application template', function(done) {
      const job = {
        id : "jobid",
        applicationTemplateInfo : {
        }
      };

      templateUtils.expandApplicationTemplate(job, function(err, result) {
        should(result).not.exist;
        should(err).not.be.null;
        done();
      });
    });

});
