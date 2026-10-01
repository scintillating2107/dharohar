import os
import shutil
import tempfile
import pytest
from app.repository.storage import StorageRepository

def test_storage_repository_save_and_read():
    temp_dir = tempfile.mkdtemp()
    try:
        repo = StorageRepository(base_dir=temp_dir)
        
        # Test binary file save
        rel_path = repo.save_file("original_pdfs", "test_doc.pdf", b"PDF Content")
        assert "original_pdfs" in rel_path
        assert repo.read_bytes(rel_path) == b"PDF Content"

        # Test JSON save
        json_data = {"khasra_number": "101/A", "owner": "Mohan Lal"}
        json_rel_path = repo.save_json("extracted_json", "record_101.json", json_data)
        assert repo.read_json(json_rel_path) == json_data
        
    finally:
        shutil.rmtree(temp_dir)
