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


describe('cli', function () {
  describe('batch template parsing', function () {
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

    describe('validateParameterUsage', function () {
      //TODO
    });

    describe('expression evaluation', function() {

      it('should replace a string containing only an expression', function(done) {
        const definition = {
          value : "['evaluateMe']"
        };
        const template = JSON.stringify(definition);
        const parameters = { };
        const result = templateUtils.parseTemplate(template, definition, parameters);
        result.value.should.equal("evaluateMe");
        done();
      });

      it('should replace an expression within a string', function(done) {
        const definition = {
          value : "prequel ['alpha'] sequel"
        };
        const template = JSON.stringify(definition);
        const parameters = { };
        const result = templateUtils.parseTemplate(template, definition, parameters);
        result.value.should.equal("prequel alpha sequel");
        done();
      });

      it('should replace multiple expressions within a string', function(done) {
        const definition = {
          value : "prequel ['alpha'] interquel ['beta'] sequel"
        };
        const template = JSON.stringify(definition);
        const parameters = { };
        const result = templateUtils.parseTemplate(template, definition, parameters);
        result.value.should.equal("prequel alpha interquel beta sequel");
        done();
      });

    });
    describe('parameters() function', function() {

      it('should replace string value for a string parameter', function(done) {

        // Arrange
        const template = {
          result : "[parameters('code')]",
          parameters : {
            code : {
              "type": "string"
            }
          }
        };
        const parameters = {
          code : "stringValue"
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);
        // Assert

        resolved.result.should.equal("stringValue");

        done();
      });

      it('should replace numeric value for string parameter as a string', function(done) {

        // Arrange
        const template = {
          result : "[parameters('code')]",
          parameters : {
            code : {
              "type": "string"
            }
          }
        };
        const parameters = {
          code : 42
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);
        // Assert

        resolved.result.should.equal("42");  // Expect a string

        done();
      });

      it('should replace int value for int parameter', function(done) {

        // Arrange
        const template = {
          result : "[parameters('code')]",
          parameters : {
            code : {
              "type": "int"
            }
          }
        };
        const parameters = {
          code : 42
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);

        // Assert
        resolved.result.should.equal(42);

        done();
      });
      it('should replace string value for int parameter as int', function(done) {

        // Arrange
        const template = {
          result : "[parameters('code')]",
          parameters : {
            code : {
              "type": "int"
            }
          }
        };
        const parameters = {
          code : "42"
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);

        // Assert
        resolved.result.should.equal(42);

        done();
      });

      it('should replace int values for int parameters in nested expressions', function(done) {

        // Arrange
        const template = {
          framesize : "Framesize is ([parameters('width')]x[parameters('height')]).",
          parameters : {
            width : {
              type: "int"
            },
            height : {
              type : "int"
            }
          }
        };

        const parameters = {
          width : 1920,
          height: 1080
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);

        // Assert
        resolved.framesize.should.equal("Framesize is (1920x1080).");

        done();
      });

      it('should replace bool value for bool parameter', function(done) {

        // Arrange
        const template = {
          result : "[parameters('code')]",
          parameters : {
            code : {
              "type": "bool"
            }
          }
        };
        const parameters = {
          code : true
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);

        // Assert
        resolved.result.should.equal(true);

        done();
      });

      it('should replace string value for bool parameter as bool value', function(done) {

        // Arrange
        const template = {
          result : "[parameters('code')]",
          parameters : {
            code : {
              "type": "bool"
            }
          }
        };
        const parameters = {
          code : "true"
        };
        const templateString = JSON.stringify(template);

        // Act
        const resolved = templateUtils.parseTemplate( templateString, template, parameters);

        // Assert
        resolved.result.should.equal(true);

        done();
      });

    });

  });
});
