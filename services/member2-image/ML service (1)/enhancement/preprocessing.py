import cv2
import numpy as np
from PIL import Image

def to_grayscale(image: np.ndarray) -> np.ndarray:
    if len(image.shape) == 3:
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return image

def denoise(image: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoising(image, None, 10, 7, 21)

def enhance_contrast(image: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(image)

def adaptive_threshold(image: np.ndarray) -> np.ndarray:
    # Use a larger block size (21 instead of 11) to handle large lighting gradients
    # often found in old physical land records and scans
    return cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                 cv2.THRESH_BINARY, 21, 5)

def sharpen(image: np.ndarray) -> np.ndarray:
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    return cv2.filter2D(image, -1, kernel)

def deskew(image: np.ndarray) -> np.ndarray:
    edges = cv2.Canny(image, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
    
    if lines is not None:
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if -45 < angle < 45:
                angles.append(angle)
        
        if angles:
            median_angle = np.median(angles)
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            return rotated
    return image

def remove_small_borders(image: np.ndarray) -> np.ndarray:
    # Basic crop to remove extreme edges (e.g. 1%)
    h, w = image.shape[:2]
    crop_h, crop_w = int(h * 0.01), int(w * 0.01)
    return image[crop_h:h-crop_h, crop_w:w-crop_w]

def preprocess_for_ocr(image: np.ndarray) -> np.ndarray:
    """Standard pipeline for getting OCR-ready image from an enhanced color image."""
    gray = to_grayscale(image)
    deskewed = deskew(gray)
    denoised = denoise(deskewed)
    enhanced = enhance_contrast(denoised)
    # Usually returning enhanced grayscale is better for PaddleOCR than full binary threshold,
    # as PaddleOCR handles internal binarization well, but contrast enhancement helps.
    return enhanced
