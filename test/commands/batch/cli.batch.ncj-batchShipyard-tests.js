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

var __ = require('underscore');
var should = require('should');
var utils = require('../../../lib/util/utils');
var CLITest = require('../../framework/arm-cli-test');
var batchShipyardUtils = require('../../../lib/commands/batch/batch.batchShipyardUtils');
var templateUtils = require('../../../lib/commands/batch/batch.templateUtils');

var requiredEnvironment = [
];

var testPrefix = 'cli-batch-ncj-batchShipyard-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

var poolBody = {
  'id': 'poolId',
  'virtualMachineConfiguration': {
    'imageReference': {
      'publisher': 'Canonical',
      'offer': 'UbuntuServer',
      'sku': '16.04.0-LTS',
      'version': 'latest'
    },
    'nodeAgentSKUId': 'batch.node.ubuntu 16.04'
  },
  'displayName': 'poolDisplayName',
  'vmSize': 'STANDARD_D1_V2',
  'targetDedicated': 1,
  'maxTasksPerNode': 1,
  'enableInterNodeCommunication': false,
  'startTask': {
    'commandLine': '/bin/bash -c "echo hello"',
    'runElevated': true
  },
  'clientExtensions': {
    'dockerOptions': {
      'image': 'ncj/caffe:cpu',
      'registry': {
        'hub': {
          'username': 'hubUser',
          'password': 'hubPassword'
        },
        'private': {
          'allowPublicPullOnMissing': false
        }
      },
      'sharedDataVolumes': [
        {
          'name': 'volume1',
          'volumeType': 'azurefile',
          'azureFileShareName': 'fileShare1'
        },
        {
          'name': 'volume2',
          'volumeType': 'azurefile',
          'azureFileShareName': 'fileShare2'
        }
      ]
    }
  }
};

var jobBody = {
  'id': 'job01',
  'commonEnvironmentSettings': [
    {
      'name': 'jobEnv1',
      'value': 'jobVal1'
    },
    {
      'name': 'jobEnv2',
      'value': 'jobVal2'
    },
  ],
  'displayName': 'Job Display Name',
  'constraints': {
    'maxTaskRetryCount': 5
  },
  'poolInfo': {
    'poolId': 'pool01'
  },
  'taskFactory': {
  }
}

var taskCollection = [
  {
    'id': 'task01',
    'commandLine': '/opt/run_mnist.sh',
    'dependsOn': {
      'taskIds': [
        '2',
        'orange'
      ]
    },
    'clientExtensions': {
      'dockerOptions': {
        'image': 'ncj/caffe:cpu',
        'dataVolumes': [
          {
            'hostPath': '/tmp',
            'containerPath': '/hosttmp'
          }
        ]
      }
    }
  },
  {
    'id': 'task02',
    'commandLine': '/opt/run_mnist.sh',
    'environmentSettings': [
      {
        'name': 'taskEnv1',
        'value': 'taskVal1'
      }
    ],
    'resourceFiles': [
      {
        'filePath': 'localFilePath',
        'blobSource': 'https://some.blob.url',
        'fileMode': '0777'
      },
      {
        'filePath': 'localFilePath2',
        'blobSource': 'https://some.other.blob.url'
      }
    ],
    'clientExtensions': {
      'dockerOptions': {
        'image': 'ncj/caffe:cpu2',
        'additionalDockerRunOptions': [
          '-p 50000'
        ],
        'sharedDataVolumes': [
          {
            'name': 'share2',
            'volumeType': 'azurefile',
            'containerPath': '/fileShare2'
          }
        ]
      }
    }
  },
  {
    'id': 'task03',
    'commandLine': '/opt/run_mnist.sh',
    'multiInstanceSettings': {
      'numInstances': 5,
      'coordinationCommandLine': 'coordinate.sh',
      'commonResourceFiles': [
        {
          'filePath': 'commonFile',
          'blobSource': 'https://some.blob.url',
          'fileMode': '0777'
        }
      ]
    },
    'clientExtensions': {
      'dockerOptions': {
        'image': 'ncj/caffe:cpu3',
        'dataVolumes': [
          {
            'containerPath': '/abc'
          },
          {
            'hostPath': '/tmp3',
            'containerPath': '/hosttmp3'
          }
        ],
        'useHostInfiniband': true,
        'removeContainerAfterExit': false,
        'sharedDataVolumes': [
          {
            'name': 'share3',
            'volumeType': 'azurefile',
            'containerPath': '/fileShare3'
          }
        ]
      }
    }
  }
];

describe('cli', function () {
  describe('batch ncj shipyard', function () {
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
    
    it('should add Docker Hub login info to the credentials JSON given a pool body', function (done) {
      var originalCredentialsJson = {
        "credentials": {
          "batch": {
            "account": "batchaccount",
            "account_key": "batchkey",
            "account_service_url": "https://batchaccount.antarctica.batch.azure.com/"
          },
          "storage": {
            "mystorageaccount": {
              "account": "storageaccount",
              "account_key": "storagekey",
              "endpoint": "core.windows.net"
            }
          }
        }
      };
      var credentialsWithDockerHubLogin = batchShipyardUtils.addDockerHubLoginToCredentialsConfig(originalCredentialsJson, poolBody);

      var expectedCredentialsJson = {
        "credentials": {
          "batch": {
            "account": "batchaccount",
            "account_key": "batchkey",
            "account_service_url": "https://batchaccount.antarctica.batch.azure.com/"
          },
          "storage": {
            "mystorageaccount": {
              "account": "storageaccount",
              "account_key": "storagekey",
              "endpoint": "core.windows.net"
            }
          },
          "docker_registry" : {
            "hub": {
              "username": "hubUser",
              "password": "hubPassword"
            }
          }
        }
      };
      expectedCredentialsJson.should.eql(credentialsWithDockerHubLogin);
      done();
    });

    it('should create the correct Batch Shipyard config json given a pool body', function (done) {
      var configJson = batchShipyardUtils.createConfigJsonFromPool(poolBody);
      var expectedConfigJson = {
        'batch_shipyard': {
          'storage_account_settings': batchShipyardUtils.getAutoStorageCredentialsLabel(),
          'storage_entity_prefix': 'shipyard'
        },
        'docker_registry': {
          'private': {
            'allow_public_docker_hub_pull_on_missing': false
          }
        },
        'global_resources': {
          'docker_images': [
            'ncj/caffe:cpu'
          ],
          'docker_volumes': {
            'shared_data_volumes': {
              'volume1': {
                'volume_driver': 'azurefile',
                'storage_account_settings': batchShipyardUtils.getAutoStorageCredentialsLabel(),
                'azure_file_share_name': 'fileShare1',
                'mount_options': [
                  'filemode=0777',
                  'dirmode=0777',
                  'nolock=true'
                ]
              },
              'volume2': {
                'volume_driver': 'azurefile',
                'storage_account_settings': batchShipyardUtils.getAutoStorageCredentialsLabel(),
                'azure_file_share_name': 'fileShare2',
                'mount_options': [
                  'filemode=0777',
                  'dirmode=0777',
                  'nolock=true'
                ]
              }
            }
          }
        }
      };
      expectedConfigJson.should.eql(configJson);
      done();
    });

    it('should create the correct Batch Shipyard config json given a task collection', function (done) {
      var configJson = batchShipyardUtils.createConfigJsonFromTasks(taskCollection);
      var expectedConfigJson = {
        'batch_shipyard': {
          'storage_account_settings': batchShipyardUtils.getAutoStorageCredentialsLabel(),
          'storage_entity_prefix': 'shipyard'
        },
        'global_resources': {
          'docker_images': [
            'ncj/caffe:cpu',
            'ncj/caffe:cpu2',
            'ncj/caffe:cpu3'
          ],
          'docker_volumes': {
            'data_volumes': {
              'task01_0': {
                'host_path': '/tmp',
                'container_path': '/hosttmp'
              },
              'task03_0': {
                'container_path': '/abc'
              },
              'task03_1': {
                'host_path': '/tmp3',
                'container_path': '/hosttmp3'
              }
            },
            'shared_data_volumes': {
              'share2': {
                'volume_driver': 'azurefile',
                'container_path': '/fileShare2'
              },
              'share3': {
                'volume_driver': 'azurefile',
                'container_path': '/fileShare3'
              }
            }
          }
        }
      };
      expectedConfigJson.should.eql(configJson);
      done();
    });

    it('should create the correct Batch Shipyard pool json given a pool body', function (done) {
      var batchShipyardPoolJson = batchShipyardUtils.createBatchShipyardPoolJson(poolBody);
      var expectedPoolJson = {
        'pool_specification': {
          'id': 'poolId',
          'vm_size': 'STANDARD_D1_V2',
          'vm_count': 1,
          'max_tasks_per_node': 1,
          'inter_node_communication_enabled': false,
          'publisher': 'Canonical',
          'offer': 'UbuntuServer',
          'sku': '16.04.0-LTS',
          'reboot_on_start_task_failed': true,
          'block_until_all_global_resources_loaded': true,
          'additional_node_prep_commands': [
            '/bin/bash -c "echo hello"'
          ],
        }
      };
      batchShipyardPoolJson.should.eql(expectedPoolJson);
      done();
    });
    
    it('should create the correct Batch Shipyard pool json given a job body', function (done) {
      var jobPool = {
        'id': 'pool01',
        'vmSize': 'standard_a1',
        'targetDedicated': 3
      };

      var batchShipyardPoolJson = batchShipyardUtils.createBatchShipyardPoolJsonForJob(jobBody, jobPool);

      var expectedPoolJson = {
        'pool_specification': {
          'id': 'pool01',
          'vm_size': 'standard_a1',
          'vm_count': 3,
          'reboot_on_start_task_failed': true,
          'block_until_all_global_resources_loaded': true
        }
      };
      batchShipyardPoolJson.should.eql(expectedPoolJson);
      done();
    });

    it('should identify the ignored properties in the supplied pool body', function (done) {
      var ignoredProperties = batchShipyardUtils.getIgnoredPoolPropertyNames(poolBody);
      var expectedIgnoredProperties = [ 'displayName', 'virtualMachineConfiguration.nodeAgentSKUId', 'virtualMachineConfiguration.imageReference.version', 'startTask.runElevated' ];
      ignoredProperties.forEach(function (property) {
        expectedIgnoredProperties.indexOf(property).should.not.eql(-1);
      });
      done();
    });

    it('should create the correct Batch Shipyard jobs json given a job body and task collection', function (done) {
      var batchShipyardJobsJson = batchShipyardUtils.createBatchShipyardJobsJson(jobBody, taskCollection);
      var expectedJobsJson = {
        'job_specifications': [
          {
            'id': 'job01',
            'environment_variables': {
              'jobEnv1': 'jobVal1',
              'jobEnv2': 'jobVal2'
            },
            'tasks': [
              {
                'id': 'task01',
                'depends_on': [
                  '2',
                  'orange'
                ],
                'command': '/opt/run_mnist.sh',
                'image': 'ncj/caffe:cpu',
                'data_volumes': [
                  'task01_0'
                ]
              },
              {
                'id': 'task02',
                'command': '/opt/run_mnist.sh',
                'environment_variables': {
                  'taskEnv1': 'taskVal1'
                },
                'resource_files': [
                  {
                    'file_path': 'localFilePath',
                    'blob_source': 'https://some.blob.url',
                    'file_mode': '0777'
                  },
                  {
                    'file_path': 'localFilePath2',
                    'blob_source': 'https://some.other.blob.url'
                  }
                ],
                'additional_docker_run_options': [
                  '-p 50000'
                ],
                'image': 'ncj/caffe:cpu2',
                'shared_data_volumes': [
                  'share2'
                ]
              },
              {
                'id': 'task03',
                'command': '/opt/run_mnist.sh',
                'image': 'ncj/caffe:cpu3',
                'name': 'task03_container',
                'remove_container_after_exit': false,
                'infiniband': true,
                'data_volumes': [
                  'task03_0',
                  'task03_1'
                ],
                'shared_data_volumes': [
                  'share3'
                ],
                'multi_instance': {
                  'num_instances': 5,
                  'coordination_command': 'coordinate.sh',
                  'resource_files': [
                    {
                      'file_path': 'commonFile',
                      'blob_source': 'https://some.blob.url',
                      'file_mode': '0777'
                    }
                  ]
                }
              }
            ]
          }
        ]
      };
      batchShipyardJobsJson.should.eql(expectedJobsJson);
      done();
    });

    it('should identify the ignored properties in the supplied job body', function (done) {
      var ignoredProperties = batchShipyardUtils.getIgnoredJobPropertyNames(jobBody);
      var expectedIgnoredProperties = ['displayName', 'constraints' ];
      ignoredProperties.forEach(function (property) {
        expectedIgnoredProperties.indexOf(property).should.not.eql(-1);
      });
      expectedIgnoredProperties.length.should.eql(ignoredProperties.length);
      done();
    });

    it('should identify the ignored properties in the supplied task body', function (done) {
      var task = {
        'id': 'myTask',
        'commandLine': 'cmd.exe',
        'dependsOn': {
          'taskIds': ['2', 'orange'],
          'taskIdRanges': [ { 'start': 1, 'end': 10 }]
        },
        'displayName': 'Task Display Name',
        'clientExtensions': {
          'dockerOptions': {
            'image': 'ncj/caffe:cpu'
          }
        }
      }
      var ignoredProperties = batchShipyardUtils.getIgnoredTaskPropertyNames(task);
      var expectedIgnoredProperties = ['displayName', 'dependsOn.taskIdRanges'];
      ignoredProperties.forEach(function (property) {
        expectedIgnoredProperties.indexOf(property).should.not.eql(-1);
      });
      expectedIgnoredProperties.length.should.eql(ignoredProperties.length);
      done();
    });

    it('should identify the ignored properties in the supplied task collection factory', function (done) {
      var taskFactory = {
        'tasks': [
          {
            'id': 'myTask',
            'commandLine': 'cmd.exe',
            'dependsOn': {
              'taskIds': ['2', 'orange'],
              'taskIdRanges': [{ 'start': 1, 'end': 10 }]
            },
            'displayName': 'Task Display Name',
            'clientExtensions': {
              'dockerOptions': {
                'image': 'ncj/caffe:cpu'
              }
            }
          },
          {
            'id': 'myTask',
            'commandLine': 'cmd.exe',
            'constraints': {
              'maxTaskRetryCount': 3,
            },
            'displayName': 'Task Display Name',
            'clientExtensions': {
              'dockerOptions': {
                'image': 'ncj/caffe:cpu'
              }
            }
          }
        ]
      }
      var tasks = templateUtils.parseTaskCollectionTaskFactory(taskFactory);
      var ignoredProperties = batchShipyardUtils.getIgnoredTaskPropertyNamesFromCollection(tasks);
      var expectedIgnoredProperties = ['displayName', 'dependsOn.taskIdRanges', 'constraints' ];
      ignoredProperties.forEach(function (property) {
        expectedIgnoredProperties.indexOf(property).should.not.eql(-1);
      });
      expectedIgnoredProperties.length.should.eql(ignoredProperties.length);
      done();
    });

    it('should identify the ignored properties in the supplied parametric sweep', function (done) {
      var taskFactory = {
        'repeatTask': {
          'commandLine': 'cmd.exe',
          'dependsOn': {
            'taskIds': ['2', 'orange'],
            'taskIdRanges': [{ 'start': 1, 'end': 10 }]
          },
          'displayName': 'Task Display Name',
          'outputFiles': [
            {
              "filePattern": "*.txt",
              "destination": {
                "container": {
                  "path": "{0}",
                  "containerSas": "[parameters('outputFileStorageUrl')]"
                }
              },
              "uploadDetails": {
                "taskStatus": "TaskSuccess"
              }
            }
          ],
          'clientExtensions': {
            'dockerOptions': {
              'image': 'ncj/caffe:cpu'
            }
          }
        },
        'mergeTask': {
          'commandLine': 'merge.exe',
          'constraints': {
            'maxTaskRetryCount': 3,
          },
          'displayName': 'Task Display Name',
          'clientExtensions': {
            'dockerOptions': {
              'image': 'ncj/caffe:cpu'
            }
          }
        },
        'parameterSets': [ {start:1, end:2} ]        
      }
      var tasks = templateUtils.parseParametricSweep(taskFactory);
      var ignoredProperties = batchShipyardUtils.getIgnoredTaskPropertyNamesFromCollection(tasks);
      var expectedIgnoredProperties = ['displayName', 'dependsOn.taskIdRanges', 'constraints', 'outputFiles' ];
      ignoredProperties.forEach(function (property) {
        expectedIgnoredProperties.indexOf(property).should.not.eql(-1);
      });
      expectedIgnoredProperties.length.should.eql(ignoredProperties.length);
      done();
    });

    it('should throw an error when a shared volume on a pool has no name', function (done) {
      var poolBodyWithUnNamedSharedVolume = {
        'id': 'poolId',
        'clientExtensions': {
          'dockerOptions': {
            'image': 'ncj/caffe:cpu',
            'sharedDataVolumes': [
              {
                'volumeType': 'azurefile',
                'azureFileShareName': 'fileShare1'
              }
            ]
          }
        }
      };
      (function () { batchShipyardUtils.createConfigJsonFromPool(poolBodyWithUnNamedSharedVolume) }).should.throw('Shared data volume must have a name.');
      done();
    });
    
    it('should throw an error when a shared volume is not supported', function (done) {
      var poolBodyWithUnsupportedSharedVolume = {
        'id': 'poolId',
        'clientExtensions': {
          'dockerOptions': {
            'image': 'ncj/caffe:cpu',
            'sharedDataVolumes': [
              {
                'volumeType': 'unknowntype',
                'azureFileShareName': 'fileShare1'
              }
            ]
          }
        }
      };
      (function () { batchShipyardUtils.createConfigJsonFromPool(poolBodyWithUnsupportedSharedVolume) }).should.throw('Shared data volume must set the volumeType to "azurefile".');
      done();
    });

    it('should throw an error when a shared volume on a task has no name', function (done) {
      var taskBodyWithUnNamedSharedVolume = {
        'id': 'taskId',
        'clientExtensions': {
          'dockerOptions': {
            'image': 'ncj/caffe:cpu',
            'sharedDataVolumes': [
              {
                'volumeType': 'azurefile',
                'azureFileShareName': 'fileShare1'
              }
            ]
          }
        }
      };
      (function () { batchShipyardUtils.createConfigJsonFromTasks([taskBodyWithUnNamedSharedVolume]) }).should.throw('Shared data volume must have a name.');
      done();
    });

    it('should throw an error when a job does not reference a pool id', function (done) {
      var jobBodyWithoutPoolId = {
        'id': 'myJob',
        'poolInfo': {
          'autoPoolSpecification': {
            'poolLifetimeOption': 'job',
            'pool': {
              'vmSize': 'small',
              'targetDedicated': 1,
              'cloudServiceConfiguration': {
                'osFamily': '4',
                'targetOSVersion': '*'
              }
            }
          }
        }
      };

      (function() { batchShipyardUtils.createBatchShipyardPoolJsonForJob(jobBodyWithoutPoolId, undefined) }).should.throw(
        'When specifying dockerOptions on your tasks, the job.poolInfo.poolId property must be set.');
      done();
    });
  });
});