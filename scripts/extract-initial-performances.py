"""Reproduce the source-indexed Ciclo II performance catalog from the pinned MINEDU PDF.

Only performance paragraphs are transcribed. Examples and footnote markers are
excluded explicitly; columns, ages and counts are pinned, never inferred by AI.
Run with the bundled pdfplumber runtime. No network or database writes.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

import pdfplumber
from pypdf import PdfReader

SOURCE_SHA = "1f5e7330099c894181b82265dccab9478e094b15cc766ef680608468a82c0821"
# Physical PDF page, age, horizontal source region, expected performance count.
PAIRS = {
    "PS_IDENTIDAD": (80, [5, 5, 6]), "PS_CONVIVE": (88, [3, 4, 5]),
    "PS_RELIGION": (94, [4, 4, 4]), "PSICO_MOTRICIDAD": (106, [3, 3, 3]),
    "COM_ORAL": (120, [5, 5, 5]), "COM_LECTURA": (126, [3, 3, 3]),
    "COM_ARTE": (138, [3, 3, 3]), "MAT_CANTIDAD": (176, [3, 6, 7]),
    "MAT_FORMA": (182, [3, 5, 5]), "CYT_INDAGA": (192, [3, 5, 5]),
}


def normalize(text):
    text = re.sub(r"(\w)\s*-\s*\n\s*(\w)", r"\1\2", text)
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"\s+([.,;:])", r"\1", text)


def main():
    args = argparse.ArgumentParser()
    args.add_argument("pdf", type=Path)
    args.add_argument("output", type=Path)
    args.add_argument("--review", type=Path)
    opts = args.parse_args()
    assert hashlib.sha256(opts.pdf.read_bytes()).hexdigest() == SOURCE_SHA, "Wrong official source"
    pdf = pdfplumber.open(opts.pdf)
    regions = []
    for competency, (page, counts) in PAIRS.items():
        # Quantity, shape and inquiry use a wider five-year column.
        right = {"MAT_CANTIDAD": 231, "MAT_FORMA": 233.9, "CYT_INDAGA": 231}.get(competency, 239.1)
        regions += [(competency, 3, page, 354, 530, counts[0]),
                    (competency, 4, page + 1, 52, right - 5, counts[1]),
                    (competency, 5, page + 1, right - 1, 530, counts[2])]
    regions += [("COM_ESCRITURA", 4, 133, 52, 234, 1), ("COM_ESCRITURA", 5, 133, 238, 530, 2),
                ("CAST_L2_ORAL", 5, 148, 358, 530, 2), ("TRANS_TIC", 5, 206, 354, 530, 2),
                ("TRANS_AUTONOMO", 5, 212, 354, 530, 3)]
    performances, review = [], []
    for competency, age, page_number, x0, x1, count in regions:
        page = pdf.pages[page_number - 1]
        # Ignore raised footnote callouts (5.2pt); body is at least 8pt.
        region = page.filter(lambda obj: obj.get("object_type") != "char" or obj.get("size", 9) >= 7)
        text = region.crop((x0, 175, x1, 715)).extract_text(x_tolerance=1.5)
        text = text.split("CONDICIONES QUE FAVORECEN", 1)[0].strip()
        paragraphs = re.split(r"(?:^|\n)•\s*", text)[1:]
        assert len(paragraphs) == count, (competency, age, len(paragraphs), count, text)
        for order, paragraph in enumerate(paragraphs, 1):
            # Strip the worked example only, retaining all sentences of the performance.
            core = normalize(paragraph).split("Ejemplo:", 1)[0].strip()
            assert len(core) > 35 and core.endswith((".", ")")), (competency, age, order, core)
            record = {"id": f"PCI2016.{competency}.{age}.{order:02}", "competency_id": competency,
                      "age": age, "official_order": order, "text": core,
                      "printed_page": page_number - 2, "pdf_page": page_number,
                      "content_sha256": hashlib.sha256(core.encode()).hexdigest()}
            performances.append(record)
        review.append({"competency_id": competency, "age": age, "pdf_page": page_number,
                       "bbox": [x0, 175, x1, 715], "column_text": text})
    # Independently compare the core paragraphs against a second extractor. Strip
    # typography only for comparison, never for the stored official wording.
    independent = PdfReader(opts.pdf)
    content_key = lambda value: re.sub(r"[^a-záéíóúüñ]", "", value.lower())
    page_keys = {number: content_key(independent.pages[number - 1].extract_text())
                 for number in {row["pdf_page"] for row in performances}}
    for row in performances:
        assert content_key(row["text"]) in page_keys[row["pdf_page"]], row["id"]
    catalog = {"version": "pci-inicial-2016-performances-v1", "source": {
        "id": "PCI_INICIAL_CANONICAL", "title": "Programa Curricular de Educación Inicial",
        "publisher": "Ministerio de Educación del Perú", "year": 2016,
        "url": "https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf",
        "sha256": SOURCE_SHA}, "transcription": {
        "checked_on": "2026-10-19", "method": "Pinned source columns and bullet counts; independent pypdf paragraph comparison",
        "scope": "Performance paragraphs only; examples and footnote callouts excluded. Line-end hyphens and whitespace normalized. Original curricular wording retained.",
        "not_applicable": "No age-specific performance is invented where the source has none. Religion and Castellano L2 retain classroom applicability rules."},
        "performances": performances}
    opts.output.parent.mkdir(parents=True, exist_ok=True)
    opts.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if opts.review:
        opts.review.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"performances": len(performances), "ages": {age: sum(p["age"] == age for p in performances) for age in [3, 4, 5]}}))


if __name__ == "__main__":
    main()
