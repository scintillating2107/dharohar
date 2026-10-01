import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.repository.storage import storage_repo
from app.models.enums import RecordStatus

router = APIRouter(prefix="/documents", tags=["Documents Repository"])

@router.get("/{id}", response_model=DocumentResponse)
def get_document_metadata(id: str, db: Session = Depends(get_db)):
    """Retrieve metadata, page list, and OCR results for a stored document."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{id}' not found."
        )
    return doc

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    uploaded_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Upload PDF or Image document into structured storage repository."""
    content = await file.read()
    file_name = file.filename or "uploaded_document"
    file_size = len(content)
    mime_type = file.content_type or "application/pdf"
    
    ext = os.path.splitext(file_name)[1].lower()
    category = "original_pdfs" if ext == ".pdf" else "original_images"
    file_type = ext.replace(".", "").upper() or "PDF"
    
    # Save file into repository
    relative_path = storage_repo.save_file(category, file_name, content)
    
    doc = Document(
        file_name=file_name,
        original_file_path=relative_path,
        file_type=file_type,
        file_size_bytes=file_size,
        mime_type=mime_type,
        status=RecordStatus.UPLOADED,
        uploaded_by=uploaded_by
    )
    
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return doc

@router.get("/{id}/download")
def download_document_file(
    id: str,
    file_kind: str = Query("original", description="Target file kind: original, ocr_json, extracted_json"),
    db: Session = Depends(get_db)
):
    """Stream or download stored original PDF, images, or JSON outputs."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{id}' not found."
        )

    target_path = doc.original_file_path
    abs_path = storage_repo.get_absolute_path(target_path)

    if not abs_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File content for document '{id}' does not exist on disk."
        )

    return FileResponse(
        path=str(abs_path),
        media_type=doc.mime_type,
        filename=doc.file_name
    )
