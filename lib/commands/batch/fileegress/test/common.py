try:
    from unittest import mock
except ImportError:
    import mock

import azure.storage.blob


def create_append_blob_service():
    blob_client = azure.storage.blob.AppendBlobService('foo', 'bar')

    blob_client.create_blob = mock.MagicMock(
        return_value=azure.storage.blob.models.ResourceProperties())
    blob_client.append_blob_from_bytes = mock.MagicMock()
    blob_client.delete_blob = mock.MagicMock()
    blob_client.generate_blob_shared_access_signature = mock.MagicMock(
        return_value='http://this-is-a-sas')
    return blob_client
