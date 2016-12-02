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
const staticApplicationTemplateFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-static.json');

// File path to an application path with parameters
const applicationTemplateWithParametersFilePath = path.resolve(__dirname, "../../data/batch-applicationTemplate-parameters.json");

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
  
      it('should throw an error if the value provided for an int parameter is not type compatible', function(done) {
        const parameters = { 
          age : "eleven"
        };
        const definitions = {
          age : {
            type : "int"
          }
        };
        var error;
        try {
          templateUtils.validateParameterUsage(parameters, definitions);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('age').should.be.above(0, 'Expect parameter \'age\' to be mentioned: ' + error.message);
        done();
      });
  
      it('should throw an error if the value provided for an bool parameter is not type compatible', function(done) { 
        const parameters = { 
          isMember : "frog"
        };
        const definitions = {
          isMember : {
            type : "bool"
          }
        };
        var error;
        try {
          templateUtils.validateParameterUsage(parameters, definitions);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('isMember').should.be.above(0, 'Expect parameter \'isMember\' to be mentioned: ' + error.message);
        done();
      });
  
      it('should throw an error if a value is provided for a non-existing parameter', function(done) {
        const parameters = { 
          membership : "Gold"
        };
        const definitions = {
          customerType : { 
            type : "string",
            defaultValue : "peasant"
          }
        };
        var error;
        try {
          templateUtils.validateParameterUsage(parameters, definitions);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('membership').should.be.above(0, 'Expect parameter \'membership\' to be mentioned: ' + error.message);
        done();
      });
  
      it('should accept having no job parameters if there are no template parameters', function(done) { 
        const parameters = undefined;
        const definitions = undefined;
        templateUtils.validateParameterUsage(parameters, definitions);
        // Pass implied by no Error
        done();
      });
  
      it('should accept having no job parameters if all template parameters have defaults', function(done) { 
        const parameters = undefined;
        const definitions = {
          customerType : { 
            type : "string",
            defaultValue : "peasant"
          }
        };
        templateUtils.validateParameterUsage(parameters, definitions);
        // Pass implied by no Error
        done();
      });
  
    });

    describe('mergeMetadata()', function () {
  
      it('should return empty metadata when no metadata supplied', function(done) { 
        const alpha = undefined;
        const beta = undefined;
        const result = templateUtils.mergeMetadata(alpha, beta);
        result.length.should.equal(0);
        done();
      });
  
      it('should return base metadata when only base metadata supplied', function(done) { 
        const alpha = [{
          name : 'name',
          value : 'Adam'
        }, {
          name : 'age',
          value : 'old'
        }];
        const beta = undefined;
        const result = templateUtils.mergeMetadata(alpha, beta);
        should.deepEqual(result, alpha);
        done();
      });
  
      it('should return more metadata when only more metadata supplied', function(done) {
        const alpha = undefined;
        const beta = [{
          name : 'gender',
          value : 'unspecified'
        }];
        const result = templateUtils.mergeMetadata(alpha, beta);
        should.deepEqual(result, beta);
        done();
      });
  
      it('should throw an error if the two collections overlap', function(done) {
        const alpha = [{
          name : 'name',
          value : 'Adam'
        }, {
          name : 'age',
          value : 'old'
        }];
        const beta = [{
          name : 'name',
          value : 'Brian'
        }, {
          name : 'gender',
          value : 'unspecified'
        }];
        var error;
        try {
          templateUtils.mergeMetadata(alpha, beta);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('name').should.be.above(0, 'Expect metadata \'name\' to be mentioned: ' + error.message);
        done();
      });
  
      it('should return merged metadata when there is no overlap', function(done) {
        const alpha = [{
          name : 'name',
          value : 'Adam'
        }, {
          name : 'age',
          value : 'old'
        }];
        const beta = [{
          name : 'gender',
          value : 'unspecified'
        }];
        const expected = [{
          name : 'name',
          value : 'Adam'
        }, {
          name : 'age',
          value : 'old'
        }, {
          name : 'gender',
          value : 'unspecified'
        }]
        var result = templateUtils.mergeMetadata(alpha, beta);
        should.deepEqual(result, expected);
        done();      
      });
    });

    describe('validateGeneratedJob', function () {

      it('should throw an error if the generated job uses a property reserved for template use', function(done) {
        const job = {
          id : 'jobid',
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath
          },
          usesTaskDependencies : true
        };
        var error;
        try {
          templateUtils.validateGeneratedJob(job);
        } catch (e) {
          error = e;
        }
        should.exist(error);
        error.message.indexOf('applicationTemplateInfo').should.be.above(0, 'Expect property \'applicationTemplateInfo\' to be mentioned: ' + error.message);
        done();
      });

    });

    describe('template merging', function () {

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

      it('should merge a template with no parameters', function(_) {
        const job = {
          id : "jobid",
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath
          }
        };
        const result = templateUtils.expandApplicationTemplate(job, _);
        should.exist(result.jobManagerTask, "expect the template to have provided jobManagerTask.");
      });

      it('should preserve properties on the job when expanding the template', function(_) {
        const jobId = "importantjob";
        const priority = 500;
  
        const job = {
          id : jobId,
          priority: priority,
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath
          }
        };
        const result = templateUtils.expandApplicationTemplate(job, _);
        result.id.should.equal(jobId);
        result.priority.should.equal(priority);
      });

      it('should use parameters from the job to expand the template', function(_) {
        const job = {
          id : "parameterJob",
          applicationTemplateInfo : {
            filePath : applicationTemplateWithParametersFilePath,
            parameters : {
              blobName : "music.mp3",
              keyValue : "yale"
            }
          }
        };
        const result = templateUtils.expandApplicationTemplate(job, _);
        result.jobManagerTask.resourceFiles[1].filePath.should.equal(job.applicationTemplateInfo.parameters.blobName);
        result.metadata[0].value.should.equal(job.applicationTemplateInfo.parameters.keyValue);  
      });

      it('should throw an error if any parameter has an undefined type', function(_) {
        const untypedParameterFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-untypedParameter.json');
        const job = {
          id : "parameterJob",
          applicationTemplateInfo : {
            filePath : untypedParameterFilePath,
            parameters : {
              blobName : "music.mp3",
              keyValue : "yale"
            }
          }
        };
        var error;
        try {
          templateUtils.expandApplicationTemplate(job, _);  
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('blobName').should.be.above(0, 'Expect parameter \'blobName\' to be mentioned: ' + error.message);
      });

      it('should not have an applicationTemplateInfo property on the expanded job', function(_) {
        const jobId = "importantjob";
        const priority = 500;
        const job = {
          id : jobId,
          priority: priority,
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath
          }
        };
        const result = templateUtils.expandApplicationTemplate(job, _);
        should.not.exist(result.applicationTemplateInfo, 'Expect applicationTemplateInfo from job to not be present.');
      });

      it('should not copy templateMetadata to the expanded job', function(_) {
        const job = {
          id : 'importantjob',
          priority: 500,
          applicationTemplateInfo : {
            filePath : staticApplicationTemplateFilePath
          }
        };
        const result = templateUtils.expandApplicationTemplate(job, _);
        should.not.exist( result.templateMetadata, 'Expect templateMetadata from template to not be present.');
      });

      it('should not have a parameters property on the expanded job', function(_) {
        const jobId = 'importantjob';
        const priority = 500;
        const job = {
          id : jobId,
          priority: priority,
          applicationTemplateInfo : {
            filePath : applicationTemplateWithParametersFilePath,
            parameters : {
              blobName: "Blob",
              keyValue: "Key"
            }
          }
        };
        const result =  templateUtils.expandApplicationTemplate(job, _);
        should.not.exist(result.parameters, 'Expect parameters from template to not be present');
      });

      it('should throw error if application template specifies \'id\' property', function(_) {
        const templateFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-prohibitedId.json');
        const job = {
          id : "jobid",
          applicationTemplateInfo : {
            filePath : templateFilePath
          }
        };
        var error;
        try {
           templateUtils.expandApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('id').should.be.above(0, 'Expect property \'id\' to be mentioned: ' + error.message);     
      });

      it('should throw error if application template specifies \'poolInfo\' property', function(_) {
        const templateFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-prohibitedPoolInfo.json');
        const job = {
          id : "jobid",
          applicationTemplateInfo : {
            filePath : templateFilePath
          }
        };
        var error;
        try {
           templateUtils.expandApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('poolInfo').should.be.above(0, 'Expect property \'poolInfo\' to be mentioned: ' + error.message);     
      });

      it('should throw error if application template specifies \'applicationTemplateInfo\' property', function(_) {
        const templateFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-prohibitedApplicationTemplateInfo.json');
        const job = {
          id : "jobid",
          applicationTemplateInfo : {
            filePath : templateFilePath
          }
        };
        var error;
        try {
           templateUtils.expandApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('applicationTemplateInfo').should.be.above(0, 'Expect property \'applicationTemplateInfo\' to be mentioned: ' + error.message);     
      });

      it('should throw error if application template specifies \'priority\' property', function(_){
        const templateFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-prohibitedPriority.json');
        const job = {
          id : "jobid",
          applicationTemplateInfo : {
            filePath : templateFilePath
          }
        };
        var error;
        try {
           templateUtils.expandApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('priority').should.be.above(0, 'Expect property \'priority\' to be mentioned: ' + error.message);     
      });

      it('should throw error if application template specifies unrecognized property', function(_) {
        const templateFilePath = path.resolve(__dirname, '../../data/batch-applicationTemplate-unsupportedProperty.json');
        const job = {
          id : "jobid",
          applicationTemplateInfo : {
            filePath : templateFilePath
          }
        };
        var error;
        try {
           templateUtils.expandApplicationTemplate(job, _);
        } catch (e) {
          error = e;
        }
        should.exist(error, "Expect to have an error");
        error.message.indexOf('fluxCapacitorModel').should.be.above(0, 'Expect property \'fluxCapacitorModel\' to be mentioned: ' + error.message);     
      }); 

      it('should include metadata from original job on generated job', function(_) {
        const job = {
          id : 'importantjob',
          priority: 500,
          applicationTemplateInfo : {
            filePath : applicationTemplateWithParametersFilePath,
            parameters : {
              blobName : 'henry',
              keyValue : 'yale'
            }
          },
          metadata : [ {
            name : 'author',
            value : 'batman'
          }]
        };
        var generated = templateUtils.expandApplicationTemplate(job, _);
        should.exist(generated.metadata, 'Expect to have metadata');
        generated.metadata.should.containEql({
            name : 'author',
            value : 'batman'
          });
      });

      it('should include metadata from template on generated job', function(_) {
        const job = {
          id : 'importantjob',
          priority: 500,
          applicationTemplateInfo : {
            filePath : applicationTemplateWithParametersFilePath,
            parameters : {
              blobName : 'henry',
              keyValue : 'yale'
            }
          },
          metadata : [ {
            name : 'author',
            value : 'batman'
          }]
        };
        var generated = templateUtils.expandApplicationTemplate(job, _);
        should.exist(generated.metadata, 'Expect to have metadata');
        generated.metadata.should.containEql({
            name : 'myproperty',
            value : 'yale'
          });
      });

    });
    
  });
});
