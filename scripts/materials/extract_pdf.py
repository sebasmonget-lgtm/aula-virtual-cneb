"""Private, deterministic page extraction for the material-library ingester.

Writes text and layout metadata only. It never exports PDF pages or images.
"""

import argparse
import json
from pathlib import Path

from pypdf import PdfReader


def extract(input_path: Path):
    reader = PdfReader(str(input_path), strict=True)
    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported")
    result = []
    for index, page in enumerate(reader.pages):
        height = float(page.mediabox.height)
        fragments = []
        image_boxes = []
        xobjects = page.get("/Resources", {}).get("/XObject", {})
        xobjects = xobjects.get_object() if hasattr(xobjects, "get_object") else xobjects
        image_names = {
            name for name, ref in xobjects.items()
            if ref.get_object().get("/Subtype") == "/Image"
        }

        def visit_text(value, cm, tm, _font, _size):
            if value.strip():
                fragments.append((value.strip(), float(cm[5]) + float(tm[5])))

        def visit_operand(op, args, cm, _tm):
            if op == b"Do" and args and args[0] in image_names:
                image_boxes.append([round(float(cm[4]), 1), round(float(cm[5]), 1),
                                    round(float(cm[4] + cm[0]), 1), round(float(cm[5] + cm[3]), 1)])

        text = (page.extract_text(visitor_text=visit_text, visitor_operand_before=visit_operand) or "").replace("\x00", " ").strip()
        result.append({
            "page": index + 1,
            "text": text,
            "text_length": len(text),
            "image_count": len(image_boxes),
            "layout": {
                "width": round(float(page.mediabox.width), 2),
                "height": round(height, 2),
                "word_count": len(text.split()),
                "top_words": " ".join(value for value, y in fragments if y > height * 0.82).split()[:24],
                "bottom_words": " ".join(value for value, y in fragments if y < height * 0.18).split()[-24:],
                "image_boxes": image_boxes[:30],
            },
        })
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    pages = extract(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"pages": len(pages), "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
