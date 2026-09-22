"""Temporary geometry-first comparator for curriculum PDF pages."""
import re

SUSPICIOUS = re.compile(r"(?:Ã|Â|â€|ï¿½|" + chr(0xFFFD) + r")")
HEADER_FOOTER = re.compile(r"^(?:\d+|Ministerio de Educación|Programa curricular de Educación Inicial)$", re.I)

def canonical_tokens(words):
    kept = [word for word in words if not HEADER_FOOTER.match(word["text"].strip())]
    kept.sort(key=lambda word: (round(word["top"] / 4), word["x0"]))
    return [word["text"] for word in kept]

def classify(tokens_a, tokens_b):
    if SUSPICIOUS.search(" ".join(tokens_a + tokens_b)):
        return "extraction_failed"
    if tokens_a == tokens_b:
        return "extracted_consistent"
    if sorted(tokens_a) == sorted(tokens_b):
        return "extracted_consistent_layout_difference"
    return "needs_visual_review"
