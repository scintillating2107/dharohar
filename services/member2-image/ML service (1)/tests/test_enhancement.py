import pytest
import numpy as np
from enhancement.preprocessing import to_grayscale, denoise, enhance_contrast, sharpen

def test_to_grayscale():
    image = np.ones((100, 100, 3), dtype=np.uint8) * 255
    gray = to_grayscale(image)
    assert len(gray.shape) == 2
    assert gray.shape == (100, 100)

def test_denoise():
    image = np.ones((100, 100), dtype=np.uint8) * 128
    denoised = denoise(image)
    assert denoised.shape == (100, 100)

def test_enhance_contrast():
    image = np.ones((100, 100), dtype=np.uint8) * 128
    enhanced = enhance_contrast(image)
    assert enhanced.shape == (100, 100)
