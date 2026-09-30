import os
import torch
import numpy as np
from PIL import Image
import logging

try:
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
except ImportError:
    RRDBNet = None
    RealESRGANer = None

logger = logging.getLogger("dharohar_ml_service")

class RealESRGANEngine:
    def __init__(self):
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model_path = os.getenv("REALESRGAN_MODEL_PATH", "models/RealESRGAN_x4plus.pth")
        
    def load_model(self):
        if self.model is not None:
            return

        if RealESRGANer is None:
            logger.warning("RealESRGAN not installed. Mocking enhancement.")
            return
            
        logger.info(f"Loading RealESRGAN model from {self.model_path} on {self.device}")
        
        try:
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            self.model = RealESRGANer(
                scale=4,
                model_path=self.model_path,
                model=model,
                tile=400,
                tile_pad=10,
                pre_pad=0,
                half=self.device == 'cuda',
                device=self.device
            )
        except Exception as e:
            logger.error(f"Failed to load RealESRGAN: {e}")
            
    def enhance(self, image_np: np.ndarray) -> np.ndarray:
        if self.model is None:
            # Fallback if model not loaded or not installed
            return image_np
            
        try:
            # realesrgan takes BGR numpy array
            output, _ = self.model.enhance(image_np, outscale=4)
            return output
        except Exception as e:
            logger.error(f"Enhancement error: {e}")
            return image_np
