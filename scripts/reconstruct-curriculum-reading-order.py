"""Temporary geometry-first comparator for curriculum PDF pages."""
import re

SUSPICIOUS = re.compile(r"(?:Ã|Â|â€|ï¿½|" + chr(0xFFFD) + r")")
HEADER_FOOTER = re.compile(r"^(?:\d+|Ministerio de Educación|Programa curricular de Educación Inicial)$", re.I)

def canonical_tokens(words):
    kept = [word for word in words if not HEADER_FOOTER.match(word["text"].strip())]
    kept.sort(key=lambda word: (round(word["top"] / 4), word["x0"]))
    merged = []
    for word in kept:
        if merged:
            previous = merged[-1]
            same_line = abs(word["top"] - previous["top"]) <= max(2, (word.get("bottom", word["top"] + 8) - word["top"]) * .35)
            gap = word["x0"] - previous.get("x1", previous["x0"])
            width = max(1, previous.get("x1", previous["x0"] + 8) - previous["x0"])
            if same_line and gap >= 0 and gap <= width * .18:
                previous["text"] += word["text"]; previous["x1"] = word.get("x1", word["x0"]); continue
        merged.append(dict(word))
    return [word["text"] for word in merged]

def classify(tokens_a, tokens_b):
    if SUSPICIOUS.search(" ".join(tokens_a + tokens_b)):
        return "extraction_failed"
    if tokens_a == tokens_b:
        return "extracted_consistent"
    if sorted(tokens_a) == sorted(tokens_b):
        return "extracted_consistent_layout_difference"
    return "needs_visual_review"
