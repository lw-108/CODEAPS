import logging
from typing import Optional
try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False
    PdfReader = None
from io import BytesIO

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_content: bytes) -> Optional[str]:
    """
    Extracts plain text from a PDF file provided as bytes.
    Used for providing document context to the AI.
    """
    try:
        if not PYPDF_AVAILABLE:
            logger.error("PDF Parser: pypdf is not installed. Please run 'pip install pypdf'.")
            return None
        reader = PdfReader(BytesIO(pdf_content))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        if not text.strip():
            logger.warning("PDF Parser: No text content found in document.")
            return None
            
        return text.strip()
    except Exception as e:
        logger.error(f"PDF Parser Error: {str(e)}")
        return None

def is_pdf(content: bytes) -> bool:
    """Check if the provided bytes start with the PDF magic number %PDF-"""
    return content.startswith(b"%PDF-")
