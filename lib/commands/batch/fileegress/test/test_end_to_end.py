import io
import pytest
import os
import datetime

try:
    import urllib.parse as urlparse
except:
    import urlparse
    pass

import azure.storage.blob
import uploader
import batchfileuploader
import configuration
import util


class Fixture:
    def __init__(
            self,
            container,  # type: str
            blob_client,  # type: azure.storage.blob.BlockBlobService
            file_uploader,  # type: uploader.FileUploader
            sas  # type: str
    ):
        self.container = container
        self.blob_client = blob_client
        self.file_uploader = file_uploader
        self.sas = sas


def generate_sas(blob_client, container):
    sas = blob_client.generate_container_shared_access_signature(
        container,
        permission=azure.storage.blob.ContainerPermissions(read=True, write=True),
        expiry=util.datetime_utcnow() + datetime.timedelta(days=1))

    print("Generated SAS: {}".format(sas))

    url_segments = ['https', '{}.blob.core.windows.net'.format(blob_client.account_name), container, sas, '']
    full_container_sas = urlparse.urlunsplit(url_segments)

    print("full container sas: {}".format(full_container_sas))
    return full_container_sas



@pytest.fixture()
def fixture(tmpdir):
    container = 'aaatestcontainer'
    storage_account = os.environ['MABOM_StorageAccount']
    storage_key = os.environ['MABOM_StorageKey']
    blob_client = azure.storage.blob.BlockBlobService(
        storage_account,
        storage_key)

    cleanup_container(blob_client, container)
    try:
        os.remove(batchfileuploader.UPLOAD_LOG_NAME)
    except OSError:
        pass

    os.environ['AZ_BATCH_TASK_DIR'] = os.getcwd()
    os.environ['AZ_BATCH_TASK_WORKING_DIR'] = os.getcwd()

    full_container_sas = generate_sas(blob_client, container)

    file_uploader = uploader.FileUploader(
        'job-id',
        'task-id',
        os.path.join(str(tmpdir), batchfileuploader.UPLOAD_LOG_NAME))

    return Fixture(container, blob_client, file_uploader, full_container_sas)


def cleanup_container(blob_client, container):
    blobs = blob_client.list_blobs(container)
    for blob in blobs:
        blob_client.delete_blob(container, blob.name)


def create_files(count, rootdir, directory, file_size=None):
    if file_size is None:
        file_size = 7
    directory = os.path.join(rootdir, directory)
    files_to_create = ['{}.txt'.format(x) for x in range(0, count)]
    files_to_create = \
        [os.path.join(directory, file_path)
         for file_path in files_to_create]
    if not os.path.exists(directory):
        os.makedirs(directory)

    for file_path in files_to_create:
        with io.open(file_path, mode='wb') as file:
            file.seek(file_size)
            file.write('\0')


def create_specification(file_pattern, sas, destination_path=None, task_status=None):
    if task_status is None:
        task_status = configuration.TaskStatus.TaskCompletion
    file_mapping = configuration.Specification()
    file_mapping.output_files.append(configuration.OutputFile(
        file_pattern=file_pattern,
        destination=configuration.OutputFileDestination(
            container=configuration.BlobContainerDestination(container_sas=sas, path=destination_path)),
        upload_details=configuration.OutputFileUploadDetails(task_status=task_status)))
    return file_mapping


_success_and_status_pairs = [
    (True, configuration.TaskStatus.TaskSuccess),
    (False, configuration.TaskStatus.TaskFailure),
    (None, configuration.TaskStatus.TaskCompletion),
    (True, configuration.TaskStatus.TaskCompletion),
    (False, configuration.TaskStatus.TaskCompletion)]


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_single_file_after_process_exit(fixture, tmpdir, task_success, upload_task_status):
    file_path = os.path.join(str(tmpdir), 'test1.txt')

    spec = create_specification(file_path, fixture.sas, task_status=upload_task_status)
    with io.open(file_path, mode='wb') as file:
        file.write('test')

    fixture.file_uploader.run(spec, task_success=task_success)

    blob_properties = fixture.blob_client.get_blob_properties(fixture.container, 'test1.txt')
    assert os.path.getsize(file_path) == blob_properties.properties.content_length


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_directory_after_process_exit(fixture, tmpdir, task_success, upload_task_status):
    file_count = 10
    create_files(file_count, str(tmpdir), 'abc')

    spec = create_specification(os.path.join(str(tmpdir), 'abc', '*.txt'), fixture.sas, task_status=upload_task_status)

    fixture.file_uploader.run(spec, task_success=task_success)
    assert file_count == len(list(fixture.blob_client.list_blobs(fixture.container)))


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_missing_file_after_process_exit(fixture, tmpdir, task_success, upload_task_status):
    file_path = os.path.join(str(tmpdir), 'missing_file.txt')
    spec = create_specification(file_path, fixture.sas, task_status=upload_task_status)

    fixture.file_uploader.run(spec, task_success=task_success)

    blobs = fixture.blob_client.list_blobs(fixture.container)
    assert 0 == len(list(blobs))


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_and_reroot_directory_after_process_exit(fixture, tmpdir, task_success, upload_task_status):
    file_count = 10
    create_files(file_count, str(tmpdir), 'abc')

    sub_directory = 'abc/def'

    spec = create_specification(
        os.path.join(str(tmpdir), 'abc', '*.txt'),
        fixture.sas,
        sub_directory,
        task_status=upload_task_status)

    fixture.file_uploader.run(spec, task_success=task_success)

    blobs = list(fixture.blob_client.list_blobs(fixture.container))
    assert file_count == len(blobs)
    for blob in blobs:
        assert blob.name.startswith(sub_directory)


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_and_rename_single_file_after_process_exit(fixture, tmpdir, task_success, upload_task_status):
    file_path = os.path.join(str(tmpdir), 'test1.txt')
    destination_blob_name = 'foo.txt'
    spec = create_specification(file_path, fixture.sas, destination_blob_name, task_status=upload_task_status)
    with io.open(file_path, mode='wb') as file:
        file.write('test')

    fixture.file_uploader.run(spec, task_success=task_success)

    blob_properties = fixture.blob_client.get_blob_properties(fixture.container, destination_blob_name)
    assert os.path.getsize(file_path) == blob_properties.properties.content_length


@pytest.mark.parametrize(('task_success', 'upload_task_status'),
                         [(False, configuration.TaskStatus.TaskSuccess),
                          (True, configuration.TaskStatus.TaskFailure)])
def test_upload_files_skipped_on_unmatching_task_status(fixture, tmpdir, task_success, upload_task_status):
    file_path = os.path.join(str(tmpdir), 'test1.txt')
    destination_blob_name = 'foo.txt'
    spec = create_specification(
        file_path,
        fixture.sas,
        destination_blob_name,
        task_status=upload_task_status)

    with io.open(file_path, mode='wb') as file:
        file.write('test')

    fixture.file_uploader.run(spec, task_success=task_success)

    blobs = fixture.blob_client.list_blobs(fixture.container)
    assert 0 == len(list(blobs))


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_with_bad_sas_fails(fixture, tmpdir, task_success, upload_task_status):
    file_path = os.path.join(str(tmpdir), 'test1.txt')
    destination_blob_name = 'foo.txt'
    bad_sas = fixture.sas[:-6]
    spec = create_specification(file_path, bad_sas, destination_blob_name, task_status=upload_task_status)
    with io.open(file_path, mode='wb') as file:
        file.write('test')

    with pytest.raises(uploader.AggregateException) as agg:
        fixture.file_uploader.run(spec, task_success=task_success)

    assert len(agg.value.errors) == 1
    file, pattern, error = agg.value.errors[0]
    assert file == file_path
    assert pattern == file_path
    assert error.status_code == 403
    print(repr(agg.value))


@pytest.mark.parametrize(('task_success', 'upload_task_status'), _success_and_status_pairs)
def test_upload_to_nonexistant_container(fixture, tmpdir, task_success, upload_task_status):
    file_path = os.path.join(str(tmpdir), 'test1.txt')
    destination_blob_name = 'foo.txt'
    bad_sas = generate_sas(fixture.blob_client, 'nonexistcontainer')
    spec = create_specification(file_path, bad_sas, destination_blob_name, task_status=upload_task_status)
    with io.open(file_path, mode='wb') as file:
        file.write('test')

    with pytest.raises(uploader.AggregateException) as agg:
        fixture.file_uploader.run(spec, task_success=task_success)

    assert len(agg.value.errors) == 1
    file, pattern, error = agg.value.errors[0]
    assert file == file_path
    assert pattern == file_path
    assert error.status_code == 404
    print(repr(agg.value))