import os
import shutil
import logging

def setup_directories():
    base_dirs = ["input", "outputs"]
    for d in base_dirs:
        os.makedirs(d, exist_ok=True)

def get_job_dir(job_id: str) -> str:
    job_dir = os.path.join("outputs", job_id)
    os.makedirs(job_dir, exist_ok=True)
    return job_dir

def save_upload_file(upload_file, dest_path: str):
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

def cleanup_temp_files(job_dir: str):
    # Only clean up non-final files if needed, but for now we keep outputs.
    pass
