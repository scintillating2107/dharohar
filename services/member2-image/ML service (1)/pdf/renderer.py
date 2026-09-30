import os
import logging
from typing import List

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

logger = logging.getLogger("dharohar_ml_service")

class PDFRenderer:
    def __init__(self):
        self.dpi = int(os.getenv("PDF_RENDER_DPI", "300"))
        
    def render(self, input_path: str, output_dir: str) -> List[str]:
        if not input_path.lower().endswith('.pdf'):
            return [input_path]
            
        if fitz is None:
            logger.error("PyMuPDF (fitz) is not installed. Cannot render PDF.")
            return [input_path]
            
        logger.info(f"Rendering PDF {input_path} at {self.dpi} DPI")
        rendered_pages = []
        
        try:
            doc = fitz.open(input_path)
            base_name = os.path.splitext(os.path.basename(input_path))[0]
            
            # Zoom factor for target DPI (default is 72)
            zoom = self.dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(matrix=mat)
                
                output_path = os.path.join(output_dir, f"{base_name}_page_{page_num+1:03d}.png")
                pix.save(output_path)
                rendered_pages.append(output_path)
                
            doc.close()
        except Exception as e:
            logger.error(f"PDF rendering failed: {e}")
            
        return rendered_pages
