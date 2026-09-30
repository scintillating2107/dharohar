import cv2
from schemas.ocr import OCRPage, OCRRegion

class OCRPipeline:
    def __init__(self, engine):
        self.engine = engine
        
    def process(self, image_path: str, job_id: str, page_number: int = 1) -> OCRPage:
        # Get dimensions
        img = cv2.imread(image_path)
        if img is not None:
            h, w = img.shape[:2]
        else:
            h, w = 0, 0
            
        regions_data = self.engine.recognize(image_path)
        
        regions = []
        total_confidence = 0.0
        full_text_lines = []
        
        for r in regions_data:
            region = OCRRegion(**r)
            regions.append(region)
            total_confidence += region.confidence
            full_text_lines.append(region.text)
            
        avg_conf = total_confidence / max(len(regions), 1)
        
        return OCRPage(
            page_number=page_number,
            width=w,
            height=h,
            full_text="\n".join(full_text_lines),
            regions=regions,
            average_confidence=avg_conf
        )
