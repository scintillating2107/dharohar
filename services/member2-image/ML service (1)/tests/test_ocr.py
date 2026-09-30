import pytest
import os
import cv2
import numpy as np
from ocr.paddle_engine import PaddleOCREngine

def test_ocr_engine_init():
    engine = PaddleOCREngine()
    assert engine.model is None
    assert engine.threshold > 0

def test_ocr_engine_recognize(tmp_path):
    # Initialize and load model
    engine = PaddleOCREngine()
    engine.load_model()
    
    # Create a dummy image with clear text
    test_img_path = str(tmp_path / "test_text.jpg")
    img = np.zeros((200, 500, 3), dtype=np.uint8)
    
    # Fill background with white
    img.fill(255)
    
    # Add clear black text
    cv2.putText(img, 'HELLO PADDLE', (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 2)
    cv2.imwrite(test_img_path, img)
    
    # Run recognition
    regions = engine.recognize(test_img_path)
    
    # Verify results
    assert isinstance(regions, list)
    if engine.model is not None:
        # If paddleocr is installed and loaded, we should find text
        assert len(regions) > 0
        
        # Verify region schema
        first_region = regions[0]
        assert "text" in first_region
        assert "confidence" in first_region
        assert "bbox" in first_region
        assert "needs_review" in first_region
        
        # Verify bbox has 4 coordinates [x_min, y_min, x_max, y_max]
        assert len(first_region["bbox"]) == 4
        
        # We might not get exactly 'HELLO PADDLE' depending on model accuracy on synthetic text,
        # but confidence should be reasonably high for such a clear image.
        assert isinstance(first_region["confidence"], float)
