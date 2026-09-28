"""Read-only structural comparison of the actual Ayni Word export."""
import json
import pathlib
import zipfile
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with zipfile.ZipFile(ROOT / "evidencias/diagnostico-confirmado.docx") as archive:
    archive.testzip()
    paragraphs = []
    for name in archive.namelist():
        if name.startswith("word/") and name.endswith(".xml") and (name == "word/document.xml" or "header" in name or "footer" in name):
            tree = ET.fromstring(archive.read(name))
            paragraphs.append({"part": name, "paragraphs": ["".join(p.itertext()) for p in tree.findall(".//w:p", NS)]})
    document = ET.fromstring(archive.read("word/document.xml"))
    result = {"zip_valid": True, "parts": paragraphs, "tables": len(document.findall(".//w:tbl", NS)), "explicit_page_breaks": len(document.findall('.//w:br[@w:type="page"]', NS)), "embedded_images": [n for n in archive.namelist() if n.startswith("word/media/")]}
snapshot = json.loads((ROOT / "evidencias/priorities-confirmed-qa-snapshot.json").read_text(encoding="utf8"))
review = snapshot["tables"]["diagnostic_group_reviews"][0]
all_text = "\n".join(p for part in paragraphs for p in part["paragraphs"])
result["confirmed_fields_exactly_present"] = {key: review["details"][key] in all_text for key in ("needs", "strengths", "planning_priorities")}
result["expected_institution_present"] = "IEI Semillas del Valle QA" in all_text
result["expected_teacher_present"] = "Lucía Palomino Quispe" in all_text
result["visual_render_status"] = "NOT_VERIFIED: bundled LibreOffice unavailable"
(ROOT / "evidencias/diagnostico-docx-structural.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf8")
print(json.dumps(result,ensure_ascii=False,indent=2))
