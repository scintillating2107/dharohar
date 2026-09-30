"""
Adapters for Member 1 (Dharohar Next.js) JSON contracts.
See docs/API_CONTRACTS.md and src/types/index.ts in the main app.
"""

import glob
import os
import shutil
from typing import Any, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field

from pdf.renderer import PDFRenderer


class DharoharProcessRequest(BaseModel):
    document_id: str
    page_count: Optional[int] = None
    file_reference: Optional[str] = None


class DharoharOCRRequest(BaseModel):
    document_id: str
    images: Optional[list[str]] = None


def _upload_root() -> str:
    env = os.getenv("DHAROHAR_UPLOAD_ROOT", "").strip()
    if env:
        return os.path.abspath(env)
    # Default: dharohar/data/uploads (three levels up from this package's service root)
    service_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.abspath(os.path.join(service_root, "..", "..", "..", "data", "uploads"))


def verify_integration_key(header_value: Optional[str]) -> None:
    expected = os.getenv("INTEGRATION_SERVICE_KEY", "dharohar-local-dev-key")
    if not header_value or header_value != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Integration-Key")


def _document_dir(document_id: str) -> str:
    return os.path.join(_upload_root(), document_id)


def _find_original_pdf(doc_dir: str) -> Optional[str]:
    for name in ("original.pdf",):
        path = os.path.join(doc_dir, name)
        if os.path.isfile(path):
            return path
    return None


def _list_page_images(doc_dir: str) -> list[tuple[int, str]]:
    pages: list[tuple[int, str]] = []
    pattern = os.path.join(doc_dir, "page-*.png")
    for path in sorted(glob.glob(pattern)):
        base = os.path.basename(path)
        try:
            num = int(base.replace("page-", "").replace(".png", ""))
        except ValueError:
            continue
        pages.append((num, path))
    return sorted(pages, key=lambda x: x[0])


def _ensure_page_images(document_id: str, page_count: Optional[int]) -> list[tuple[int, str]]:
    doc_dir = _document_dir(document_id)
    if not os.path.isdir(doc_dir):
        raise HTTPException(status_code=404, detail=f"Document folder not found: {document_id}")

    pages = _list_page_images(doc_dir)
    if not pages:
        pdf_path = _find_original_pdf(doc_dir)
        if not pdf_path:
            raise HTTPException(
                status_code=404,
                detail="No page-*.png or original.pdf in document folder",
            )
        renderer = PDFRenderer()
        rendered = renderer.render(pdf_path, doc_dir)
        for idx, src in enumerate(rendered, start=1):
            dest = os.path.join(doc_dir, f"page-{idx}.png")
            shutil.copy2(src, dest)
        pages = _list_page_images(doc_dir)

    if page_count is not None and page_count > 0:
        pages = [p for p in pages if p[0] <= page_count]

    if not pages:
        raise HTTPException(status_code=404, detail="No page images to process")

    return pages


def _quality_to_score(quality: dict) -> int:
    sharpness = float(quality.get("sharpness", 80))
    contrast = float(quality.get("contrast", 30))
    score = min(98, max(40, int(sharpness / 3 + contrast)))
    label = quality.get("quality", "medium")
    if label == "good":
        score = min(98, score + 8)
    elif label == "poor":
        score = max(35, score - 15)
    return score


def dharohar_process_images(
    body: DharoharProcessRequest,
    enhancement_pipeline: Any,
) -> dict:
    pages_meta = _ensure_page_images(body.document_id, body.page_count)
    doc_dir = _document_dir(body.document_id)
    job_dir = os.path.join(doc_dir, ".ml-enhance")
    os.makedirs(job_dir, exist_ok=True)

    out_pages = []
    for page_num, page_path in pages_meta:
        result = enhancement_pipeline.process(page_path, job_dir, page_num=page_num)
        quality = result.get("quality", {})

        enhanced_path = result.get("files", {}).get("enhanced")
        if enhanced_path and os.path.isfile(enhanced_path):
            shutil.copy2(enhanced_path, page_path)

        out_pages.append(
            {
                "page": page_num,
                "processed_image_url": f"/api/documents/{body.document_id}/file?processed=true&page={page_num}",
                "quality_score": _quality_to_score(quality),
                "blur_detected": quality.get("quality") == "poor"
                or float(quality.get("sharpness", 100)) < 50,
                "skew_angle": abs(float(quality.get("estimated_skew", 0))),
                "rotation_corrected": abs(float(quality.get("estimated_skew", 0))) > 0.3,
            }
        )

    return {"document_id": body.document_id, "pages": out_pages}


def dharohar_run_ocr(
    body: DharoharOCRRequest,
    ocr_pipeline: Any,
) -> dict:
    pages_meta = _ensure_page_images(body.document_id, None)
    ocr_pages = []

    for page_num, page_path in pages_meta:
        ocr_page = ocr_pipeline.process(page_path, body.document_id, page_number=page_num)
        regions = []
        for r in ocr_page.regions:
            regions.append(
                {
                    "text": r.text,
                    "confidence": r.confidence,
                    "bbox": list(r.bbox),
                }
            )
        ocr_pages.append(
            {
                "page": page_num,
                "language": "hi",
                "text": ocr_page.full_text,
                "regions": regions,
            }
        )

    return {"document_id": body.document_id, "pages": ocr_pages}
