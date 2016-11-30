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

    describe('validateJobRequestingApplicationTemplate()', function () {

      it('should do nothing for a job not using an application template', function(_) {
        const job = {
          id : 'jobid'
        };
        templateUtils.validateJobRequestingApplicationTemplate(job, _);
      });

      it('should throw an error if job does not specify template location', function(_) {
        const job = {
          id : 'jobid',
          applicationTemplateInfo : { }
        };
        var error;
        try {
          templateUtils.validateJobRequestingApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error);
      });

      it('should throw an error if the template referenced by the job does not exist', function(_) {
        const job = {
          id : 'jobid',
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath + '.notfound'
          }
        };
        var error;
        try {
          templateUtils.validateJobRequestingApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
      });

      it('should throw an error if job uses property reserved for application template use', function(_) {
        const job = {
          id : 'jobid',
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath
          },
          usesTaskDependencies : true
        };
        var error;
        try {
          templateUtils.validateJobRequestingApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
      });
    });
    
    describe('validateApplicationTemplate()', function() {

      it('should throw an error if the template uses a property reserved for use by the job', function(_) {
        const template = {
          usesTaskDependencies : true,
          displayName : 'display this name'
        }
        var error;
        try {
          templateUtils.validateApplicationTemplate(template);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('displayName').should.be.above(0, 'Expect property \'displayName\' to be mentioned: ' + error.message);
      });

      it('should throw an error if the template uses a property not recognized', function(_) {
        const template = {
          usesTaskDependencies : true,
          vendor : 'origin'
        }
        var error;
        try {
          templateUtils.validateApplicationTemplate(template);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('vendor').should.be.above(0, 'Expect property \'vendor\' to be mentioned: ' + error.message);
      });

      it('should throw an error if a parameter does not declare a specific type', function(_) {
        const template = {
          usesTaskDependencies : true,
          parameters : {
            name : {
              defaultValue : 'Mouse' 
            }
          }
        };
        var error;
        try {
          templateUtils.validateApplicationTemplate(template);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('name').should.be.above(0, 'Expect parameter \'name\' to be mentioned: ' + error.message);
      });
      
      it('should throw an error if a parameter does not declare a supported type', function(_) {
        const template = {
          usesTaskDependencies : true,
          parameters : {
            name : {
              defaultValue : 'Mouse',
              type : 'dateTime'
            }
          }
        };
        var error;
        try {
          templateUtils.validateApplicationTemplate(template);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('name').should.be.above(0, 'Expect parameter \'name\' to be mentioned: ' + error.message);
      });

    });
    
    describe('validateParameterUsage()', function () {
  
      it('should throw an error if no value is provided for a parameter without a default', function(done) { 
        const parameters = { };
        const definitions = {
          name : {
            type : "string"
          }
        };
        var error;
        try {
          templateUtils.validateParameterUsage(parameters, definitions);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('name').should.be.above(0, 'Expect parameter \'name\' to be mentioned: ' + error.message);
        done();
      });
  
    });

    it('should do nothing when no application template is required', function(_){
      const job = { 
        id : "jobid"
      };
      const result = templateUtils.expandApplicationTemplate(job, _);
      result.should.equal(job);
    });  

    it('should throw error if no filePath supplied for application template', function(_) {
      const job = {
        id : "jobid",
        applicationTemplateInfo : {
        }
      };
      var error;
      try {
        templateUtils.expandApplicationTemplate(job, _);
      } catch (e) {
        error = e;
      }
      should.exist(error, "Expect to have an error");
    });

  });
});
