import os
import time
import uuid
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.responses import JSONResponse

from integration.dharohar import (
    DharoharProcessRequest,
    DharoharOCRRequest,
    dharohar_process_images,
    dharohar_run_ocr,
    verify_integration_key,
)

from enhancement.realesrgan_engine import RealESRGANEngine
from ocr.paddle_engine import PaddleOCREngine
from enhancement.pipeline import DocumentEnhancementPipeline
from ocr.pipeline import OCRPipeline
from pdf.renderer import PDFRenderer
from schemas.ocr import OCRDocument
from utils.files import setup_directories, save_upload_file, get_job_dir
from utils.logging import setup_logging

# Setup directories
setup_directories()
logger = setup_logging()

app = FastAPI(
    title="Dharohar ML Service",
    description="ML Service for Land Record Enhancement and OCR",
    version="1.0.0",
)

enhancement_engine = RealESRGANEngine()
ocr_engine = PaddleOCREngine()

enhancement_pipeline = DocumentEnhancementPipeline(enhancement_engine)
ocr_pipeline = OCRPipeline(ocr_engine)
pdf_renderer = PDFRenderer()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting ML Service...")
    enhancement_engine.load_model()
    ocr_engine.load_model()
    logger.info("Models loaded.")

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "dharohar-ml-service",
        "device": "cuda" if enhancement_engine.device == "cuda" else "cpu",
        "enhancement_model": "RealESRGAN_x4plus",
        "ocr_model": "devanagari_PP-OCRv5_mobile_rec"
    }

@app.post("/enhance")
async def enhance_image(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)
    
    ext = os.path.splitext(file.filename)[1]
    if len(ext) > 10 or not ext:
        ext = ".png"
    input_path = os.path.join(job_dir, f"input{ext}")
    save_upload_file(file, input_path)
    
    try:
        t0 = time.time()
        result = enhancement_pipeline.process(input_path, job_dir)
        t_ms = int((time.time() - t0) * 1000)
        
        result["timing"] = {"enhancement_ms": t_ms}
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Enhancement failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Enhancement failed")

@app.post("/ocr", response_model=OCRDocument)
async def process_ocr(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)
    
    ext = os.path.splitext(file.filename)[1]
    if len(ext) > 10 or not ext:
        ext = ".png"
    input_path = os.path.join(job_dir, f"input{ext}")
    save_upload_file(file, input_path)
    
    try:
        t0 = time.time()
        result = ocr_pipeline.process(input_path, job_id, page_number=1)
        t_ms = int((time.time() - t0) * 1000)
        
        doc = OCRDocument(
            document_id=job_id,
            pages=[result],
            full_text=result.full_text,
            average_confidence=result.average_confidence
        )
        return doc
    except Exception as e:
        logger.error(f"OCR failed: {str(e)}")
        raise HTTPException(status_code=500, detail="OCR failed")

@app.post("/process")
async def dharohar_integration_process(
    body: DharoharProcessRequest,
    x_integration_key: str | None = Header(default=None, alias="X-Integration-Key"),
):
    """Member 1 contract: JSON body, enhanced pages written back to data/uploads."""
    verify_integration_key(x_integration_key)
    try:
        return dharohar_process_images(body, enhancement_pipeline)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dharohar image process failed: {e}")
        raise HTTPException(status_code=500, detail="Image processing failed")


@app.post("/extract")
async def dharohar_integration_ocr(
    body: DharoharOCRRequest,
    x_integration_key: str | None = Header(default=None, alias="X-Integration-Key"),
):
    """Member 1 / Member 3 contract: OCR on pages in data/uploads."""
    verify_integration_key(x_integration_key)
    try:
        return dharohar_run_ocr(body, ocr_pipeline)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dharohar OCR failed: {e}")
        raise HTTPException(status_code=500, detail="OCR failed")


@app.post("/process/upload")
async def process_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)
    
    ext = os.path.splitext(file.filename)[1]
    if len(ext) > 10 or not ext:
        ext = ".png"
    input_path = os.path.join(job_dir, f"input{ext}")
    save_upload_file(file, input_path)
    
    try:
        t_start = time.time()
        
        t0 = time.time()
        pages = pdf_renderer.render(input_path, job_dir)
        t_render = int((time.time() - t0) * 1000)
        
        ocr_pages = []
        t_enhance_total = 0
        t_ocr_total = 0
        t_preprocess_total = 0
        
        for idx, page_path in enumerate(pages):
            logger.info(f"Processing page {idx + 1}")
            
            t0 = time.time()
            enhance_result = enhancement_pipeline.process(page_path, job_dir, page_num=idx+1)
            t_enhance_total += int((time.time() - t0) * 1000)
            t_preprocess_total += enhance_result.get("timing", {}).get("preprocessing_ms", 0)
            
            ocr_ready_path = enhance_result.get("files", {}).get("ocr_ready")
            if not ocr_ready_path:
                ocr_ready_path = page_path
                
            t0 = time.time()
            ocr_page = ocr_pipeline.process(ocr_ready_path, job_id, page_number=idx+1)
            t_ocr_total += int((time.time() - t0) * 1000)
            
            ocr_pages.append(ocr_page)
            
        full_text = "\n".join([p.full_text for p in ocr_pages])
        avg_conf = sum([p.average_confidence for p in ocr_pages]) / max(len(ocr_pages), 1)
        
        doc = OCRDocument(
            document_id=job_id,
            pages=ocr_pages,
            full_text=full_text,
            average_confidence=avg_conf
        )
        
        t_total = int((time.time() - t_start) * 1000)
        
        return {
            "document": doc.model_dump(),
            "timing": {
                "pdf_render_ms": t_render,
                "enhancement_ms": t_enhance_total,
                "preprocessing_ms": t_preprocess_total,
                "ocr_ms": t_ocr_total,
                "total_ms": t_total
            }
        }
    except Exception as e:
        logger.error(f"Processing pipeline failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Processing failed")
