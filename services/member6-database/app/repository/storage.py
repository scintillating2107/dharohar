import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from app.config import settings

class StorageRepository:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.STORAGE_BASE_DIR)
        
        # Define storage subdirectories
        self.dirs = {
            "original_pdfs": self.base_dir / "original_pdfs",
            "original_images": self.base_dir / "original_images",
            "processed_images": self.base_dir / "processed_images",
            "ocr_outputs": self.base_dir / "ocr_outputs",
            "extracted_json": self.base_dir / "extracted_json",
            "verified_records": self.base_dir / "verified_records",
        }
        
        # Ensure directories exist
        for d in self.dirs.values():
            d.mkdir(parents=True, exist_ok=True)

    def save_file(self, category: str, file_name: str, content: bytes) -> str:
        """Saves binary file content to target category folder and returns relative path."""
        if category not in self.dirs:
            raise ValueError(f"Invalid storage category: {category}")
        
        target_dir = self.dirs[category]
        file_path = target_dir / file_name
        
        with open(file_path, "wb") as f:
            f.write(content)
            
        return str(file_path.relative_to(self.base_dir))

    def save_json(self, category: str, file_name: str, data: Dict[str, Any]) -> str:
        """Saves dictionary data as formatted JSON and returns relative path."""
        json_bytes = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
        if not file_name.endswith(".json"):
            file_name = f"{file_name}.json"
        return self.save_file(category, file_name, json_bytes)

    def get_absolute_path(self, relative_path: str) -> Path:
        """Resolves relative file path to full absolute file path."""
        path = Path(relative_path)
        if path.is_absolute():
            return path
        return self.base_dir / path

    def read_json(self, relative_path: str) -> Optional[Dict[str, Any]]:
        """Reads and parses JSON file from storage."""
        full_path = self.get_absolute_path(relative_path)
        if not full_path.exists():
            return None
        with open(full_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def read_bytes(self, relative_path: str) -> Optional[bytes]:
        """Reads raw binary bytes from storage."""
        full_path = self.get_absolute_path(relative_path)
        if not full_path.exists():
            return None
        with open(full_path, "rb") as f:
            return f.read()

# Global Singleton Instance
storage_repo = StorageRepository()
