"""Temporary curriculum-source tooling; it is not an application dependency."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("pdf")
parser.add_argument("--pages", required=True, help="One-based PDF pages, comma separated")
parser.add_argument("--pymupdf-path", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
sys.path.insert(0, args.pymupdf_path)
import fitz  # noqa: E402
import pdfplumber  # noqa: E402

SUSPICIOUS = re.compile(r"(?:Ã|Â|â€|ï¿½|" + chr(0xFFFD) + r")")

def normalize(text):
    return re.sub(r"[ \t]+", " ", text.replace("\r\n", "\n").replace("\r", "\n")).strip()

document = fitz.open(args.pdf)
report = {"source_pdf": str(Path(args.pdf)), "pages": []}
with pdfplumber.open(args.pdf) as alternate:
    for page_number in [int(value) for value in args.pages.split(",")]:
        primary = normalize(document[page_number - 1].get_text())
        secondary = normalize(alternate.pages[page_number - 1].extract_text() or "")
        corrupt = bool(SUSPICIOUS.search(primary) or SUSPICIOUS.search(secondary))
        report["pages"].append({
            "pdf_page": page_number,
            "extractor_a": "PyMuPDF",
            "extractor_b": "pdfplumber",
            "texts_match_after_minimal_normalization": primary == secondary,
            "unicode_corruption_detected": corrupt,
            "unicode_found": sorted({character for character in primary + secondary if character in "áéíóúñÑ¿¡º°"}),
            "extraction_status": "extracted_consistent" if primary == secondary and not corrupt else "needs_visual_review",
            "extractor_a_sha256": hashlib.sha256(primary.encode("utf-8")).hexdigest(),
            "extractor_b_sha256": hashlib.sha256(secondary.encode("utf-8")).hexdigest(),
        })
Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
