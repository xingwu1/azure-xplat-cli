import os
import io
import json

import pytest

import batchfileuploader
import configuration

_SPEC_ENV = 'specification_env'


@pytest.mark.parametrize('use_env', [True, False])
def test_load_specification_basic_valid(tmpdir, use_env):
    dict = {
        'outputFiles': [
            {
                'filePattern': '*.txt',
                'destination': {'container': {'containerSas': 'sas', 'path': 'a/b/c'}},
                'uploadDetails': {'taskStatus': 'TaskFailure'}
            }
        ]
    }
    if not use_env:
        file_path = _create_specification_file(dict, str(tmpdir))
        spec = batchfileuploader.load_specification_from_file(file_path)
    else:
        _create_specification_env(dict, _SPEC_ENV)
        spec = batchfileuploader.load_specification_from_env(_SPEC_ENV)

    assert len(spec.output_files) == 1
    assert spec.output_files[0].file_pattern == '*.txt'
    assert spec.output_files[0].destination.container.container_sas == 'sas'
    assert spec.output_files[0].destination.container.path == 'a/b/c'
    assert spec.output_files[0].upload_details.task_status == configuration.TaskStatus.TaskFailure


@pytest.mark.parametrize('use_env', [True, False])
def test_load_specification_multiple_specifications(tmpdir, use_env):
    dict = {
        'outputFiles': [
            {
                'filePattern': 'a.txt',
                'destination': {'container': {'containerSas': 'sas'}},
                'uploadDetails': {'taskStatus': 'TaskFailure'}
            },
            {
                'filePattern': 'b.txt',
                'destination': {'container': {'containerSas': 'sas'}},
                'uploadDetails': {'taskStatus': 'TaskSuccess'}
            },
            {
                'filePattern': 'c.txt',
                'destination': {'container': {'containerSas': 'sas'}},
                'uploadDetails': {'taskStatus': 'TaskCompletion'}
            },
        ]
    }

    if not use_env:
        file_path = _create_specification_file(dict, str(tmpdir))
        spec = batchfileuploader.load_specification_from_file(file_path)
    else:
        _create_specification_env(dict, _SPEC_ENV)
        spec = batchfileuploader.load_specification_from_env(_SPEC_ENV)

    assert len(spec.output_files) == 3
    assert spec.output_files[0].file_pattern == 'a.txt'
    assert spec.output_files[0].destination.container.container_sas == 'sas'
    assert spec.output_files[0].upload_details.task_status == configuration.TaskStatus.TaskFailure

    assert spec.output_files[1].file_pattern == 'b.txt'
    assert spec.output_files[1].destination.container.container_sas== 'sas'
    assert spec.output_files[1].upload_details.task_status == configuration.TaskStatus.TaskSuccess

    assert spec.output_files[2].file_pattern == 'c.txt'
    assert spec.output_files[2].destination.container.container_sas == 'sas'
    assert spec.output_files[2].upload_details.task_status == configuration.TaskStatus.TaskCompletion


@pytest.mark.parametrize('use_env', [True, False])
def test_load_specification_missing_required(tmpdir, use_env):
    dict = {
        'outputFiles': [
            {
                'destination': {'container': {'containerSas': 'sas'}},
                'uploadDetails': {'taskStatus': 'TaskFailure'}
            }
        ]
    }
    if not use_env:
        file_path = _create_specification_file(dict, str(tmpdir))
        with pytest.raises(KeyError) as e:
            batchfileuploader.load_specification_from_file(file_path)
    else:
        _create_specification_env(dict, _SPEC_ENV)
        with pytest.raises(KeyError) as e:
            batchfileuploader.load_specification_from_env(_SPEC_ENV)

    assert e.value.message == 'filePattern'


@pytest.mark.parametrize('use_env', [True, False])
def test_load_specification_invalid_taskstatus(tmpdir, use_env):
    dict = {
        'outputFiles': [
            {
                'filePattern': '*.txt',
                'destination': {'container': {'containerSas': 'sas'}},
                'uploadDetails': {'taskStatus': 'Foo'}
            }
        ]
    }

    if not use_env:
        file_path = _create_specification_file(dict, str(tmpdir))
        with pytest.raises(ValueError) as e:
            batchfileuploader.load_specification_from_file(file_path)
    else:
        _create_specification_env(dict, _SPEC_ENV)
        with pytest.raises(ValueError) as e:
            batchfileuploader.load_specification_from_env(_SPEC_ENV)

    assert e.value.message == 'Foo is not a valid TaskStatus'


@pytest.mark.parametrize('use_env', [True, False])
def test_load_specification_invalid_child_type(tmpdir, use_env):
    dict = {
        'outputFiles': [
            {
                'filePattern': '*.txt',
                'destination': {'container': {'containerSas': 'sas'}, 'bar': 'test'},
                'uploadDetails': {'taskStatus': 'TaskFailure'}
            }
        ]
    }
    if not use_env:
        file_path = _create_specification_file(dict, str(tmpdir))
        with pytest.raises(ValueError) as e:
            batchfileuploader.load_specification_from_file(file_path)
    else:
        _create_specification_env(dict, _SPEC_ENV)
        with pytest.raises(ValueError) as e:
            batchfileuploader.load_specification_from_env(_SPEC_ENV)

    assert e.value.message == 'unexpected keys {}'.format([u'bar'])


def _create_specification_file(specification, directory):
    print(json.dumps(specification, indent=4))

    file_path = os.path.join(directory, 'spec.json')
    with io.open(file_path, mode='wb') as f:
        json.dump(specification, f, indent=4)
    return file_path


def _create_specification_env(specification, env):
    print(json.dumps(specification, indent=4))
    os.environ[env] = json.dumps(specification)
