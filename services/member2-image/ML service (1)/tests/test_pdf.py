import pytest
from pdf.renderer import PDFRenderer

def test_pdf_renderer_init():
    renderer = PDFRenderer()
    assert renderer.dpi >= 72
