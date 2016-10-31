import os
import util
import pytest
import uploader


def setup_module(module):
    os.environ['AZ_BATCH_TASK_WORKING_DIR'] = os.getcwd()


def get_expected_path(partial_path):
    return os.path.join(os.environ['AZ_BATCH_TASK_WORKING_DIR'], partial_path)


def test_exact_relative_path():
    path = os.path.join('foo', 'bar', 'test.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert get_expected_path(os.path.join('foo', 'bar')) == base_path
    assert get_expected_path(path) == pattern
    assert not recursive


def test_exact_absolute_path():
    root = _getroot()
    path = os.path.join(root, 'foo', 'bar', 'test.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert os.path.join(root, 'foo', 'bar') == base_path
    assert path == pattern
    assert not recursive


def test_nonrecursive_relative_pattern():
    path = os.path.join('foo', 'bar', '*.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert get_expected_path(os.path.join('foo', 'bar')) == base_path
    assert get_expected_path(path) == pattern
    assert not recursive


def test_nonrecursive_absolute_pattern():
    root = _getroot()
    path = os.path.join(root, 'foo', 'bar', '*.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert os.path.join(root, 'foo', 'bar') == base_path
    assert path == pattern
    assert not recursive


def test_recursive_relative_pattern():
    path = os.path.join('foo', 'bar', '**', '*.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert get_expected_path(os.path.join('foo', 'bar')) == base_path
    assert get_expected_path(path) == pattern
    assert recursive


def test_recursive_absolute_pattern():
    root = _getroot()
    path = os.path.join(root, 'foo', 'bar', '**', '*.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert os.path.join(root, 'foo', 'bar') == base_path
    assert path == pattern
    assert recursive


def test_path_with_environment_variable():
    os.environ['TEST'] = 'foo'
    if util.on_windows():
        env_var = '%TEST%'
    else:
        env_var = '$TEST'
    path = os.path.join(env_var, 'myfile.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert get_expected_path('foo') == base_path
    assert get_expected_path(os.path.join('foo', 'myfile.txt')) == pattern
    assert not recursive


@pytest.mark.skip(reason="This currently fails")
def test_path_with_dots():
    root = _getroot()
    path = os.path.join(root, 'foo', 'bar', '..', '..', 'myfile.txt')
    base_path, pattern, fullpath, recursive = uploader._extract_pathinfo(path)
    assert root == base_path
    assert 'myfile.txt' == pattern
    assert not recursive


def _getroot():
    if util.on_windows():
        root = 'C:'
    else:
        root = '/'
    return root
