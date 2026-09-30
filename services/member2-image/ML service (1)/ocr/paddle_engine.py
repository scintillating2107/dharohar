import os
import logging
from typing import List

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None

logger = logging.getLogger("dharohar_ml_service")

class PaddleOCREngine:
    def __init__(self):
        self.model = None
        self.threshold = float(os.getenv("OCR_LOW_CONFIDENCE_THRESHOLD", "0.70"))
        
    def load_model(self):
        if self.model is not None:
            return
            
        if PaddleOCR is None:
            logger.warning("PaddleOCR not installed. Mocking OCR.")
            return
            
        logger.info("Loading PaddleOCR model (hindi/english)")
        try:
            self.model = PaddleOCR(use_angle_cls=True, lang='hi')
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")

    def recognize(self, image_path: str) -> List[dict]:
        if self.model is None:
            return []
            
        try:
            result = self.model.ocr(image_path, cls=True)
            regions = []
            
            if result and result[0]:
                for line in result[0]:
                    box = line[0]
                    text = line[1][0]
                    confidence = float(line[1][1])
                    
                    # Compute bbox as [x_min, y_min, x_max, y_max]
                    x_coords = [point[0] for point in box]
                    y_coords = [point[1] for point in box]
                    bbox = [int(min(x_coords)), int(min(y_coords)), int(max(x_coords)), int(max(y_coords))]
                    
                    regions.append({
                        "text": text,
                        "confidence": confidence,
                        "bbox": bbox,
                        "needs_review": confidence < self.threshold
                    })
            return regions
        except Exception as e:
            logger.error(f"OCR error on {image_path}: {e}")
            return []
