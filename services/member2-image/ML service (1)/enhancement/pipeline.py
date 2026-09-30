import os
import cv2
import time
from PIL import Image
import numpy as np

from schemas.enhancement import EnhancementResult, QualityMetrics
from enhancement.quality import assess_quality
from enhancement.preprocessing import preprocess_for_ocr

class DocumentEnhancementPipeline:
    def __init__(self, engine):
        self.engine = engine
        
    def process(self, image_path: str, output_dir: str, page_num: int = 1) -> dict:
        t_start = time.time()
        
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
            
        orig_h, orig_w = img.shape[:2]
        
        # 1. Quality Assessment
        t0 = time.time()
        quality_data = assess_quality(img)
        t_quality = int((time.time() - t0) * 1000)
        
        # 2. Enhancement
        t0 = time.time()
        enhanced_img = self.engine.enhance(img)
        t_enhance = int((time.time() - t0) * 1000)
        
        enh_h, enh_w = enhanced_img.shape[:2]
        
        # Save enhanced color image
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        enhanced_path = os.path.join(output_dir, f"{base_name}_enhanced.png")
        cv2.imwrite(enhanced_path, enhanced_img)
        
        # 3. Preprocessing for OCR
        t0 = time.time()
        ocr_ready_img = preprocess_for_ocr(enhanced_img)
        t_preprocess = int((time.time() - t0) * 1000)
        
        ocr_ready_path = os.path.join(output_dir, f"{base_name}_ocr.png")
        cv2.imwrite(ocr_ready_path, ocr_ready_img)
        
        quality_metrics = QualityMetrics(**quality_data)
        
        return {
            "success": True,
            "page_number": page_num,
            "original_width": orig_w,
            "original_height": orig_h,
            "enhanced_width": enh_w,
            "enhanced_height": enh_h,
            "scale": 4,
            "quality": quality_metrics.dict(),
            "files": {
                "enhanced": enhanced_path,
                "ocr_ready": ocr_ready_path
            },
            "timing": {
                "quality_ms": t_quality,
                "enhancement_ms": t_enhance,
                "preprocessing_ms": t_preprocess
            }
        }
