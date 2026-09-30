import cv2
import numpy as np

def assess_quality(image_np: np.ndarray) -> dict:
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_np

    height, width = gray.shape

    # Brightness
    brightness = np.mean(gray)

    # Contrast
    contrast = np.std(gray)

    # Sharpness (variance of Laplacian)
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Estimated Skew
    # Use HoughLines to find dominant lines
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi/180, 200)
    
    estimated_skew = 0.0
    if lines is not None:
        angles = []
        for line in lines:
            rho, theta = line[0]
            angle = (theta * 180 / np.pi) - 90
            if -45 < angle < 45:
                angles.append(angle)
        if angles:
            estimated_skew = np.median(angles)

    # Quality category heuristic
    if sharpness < 50 or contrast < 20:
        quality = "poor"
    elif sharpness > 150 and contrast > 40:
        quality = "good"
    else:
        quality = "medium"

    return {
        "width": width,
        "height": height,
        "brightness": float(brightness),
        "contrast": float(contrast),
        "sharpness": float(sharpness),
        "estimated_skew": float(estimated_skew),
        "quality": quality
    }
