"""Temporary geometry-first comparator for curriculum PDF pages."""
import re

SUSPICIOUS = re.compile(r"(?:Ã|Â|â€|ï¿½|" + chr(0xFFFD) + r")")
HEADER_FOOTER = re.compile(r"^(?:\d+|Ministerio de Educación|Programa curricular de Educación Inicial)$", re.I)

def canonical_tokens(words):
    kept = [word for word in words if not HEADER_FOOTER.match(word["text"].strip())]
    kept.sort(key=lambda word: (round(word["top"] / 4), word["x0"]))
    return [word["text"] for word in kept]

def character_stream(tokens):
    """Content-fidelity stream only; never use it as reconstructed official text."""
    return "".join(tokens)

def content_fidelity(tokens_a, tokens_b):
    a, b = character_stream(tokens_a), character_stream(tokens_b)
    return {"matches": a == b, "characters_a": len(a), "characters_b": len(b)}

def content_region(words, page_height):
    """Geometric split; repeated-template detection is supplied by adjacent pages."""
    header = [w for w in words if w["top"] < page_height * .10]
    footer = [w for w in words if w.get("bottom", w["top"]) > page_height * .90]
    content = [w for w in words if w not in header and w not in footer]
    return header, content, footer

def blocks(words, vertical_gap=18):
    ordered = sorted(words, key=lambda w: (w["top"], w["x0"])); result = []
    for word in ordered:
        if not result or word["top"] - result[-1][-1]["top"] > vertical_gap: result.append([])
        result[-1].append(word)
    return [{"bbox":[min(w["x0"] for w in group),min(w["top"] for w in group),max(w.get("x1",w["x0"]) for w in group),max(w.get("bottom",w["top"]) for w in group)],"raw_words":group,"character_stream":character_stream([w["text"] for w in group])} for group in result]

def match_block_groups(a, b):
    """Content comparison independent of original block enumeration/order."""
    left, right = sorted(x["character_stream"] for x in a), sorted(x["character_stream"] for x in b)
    return {"matched": left == right, "unmatched_a": [x for x in left if x not in right], "unmatched_b": [x for x in right if x not in left]}

def classify(tokens_a, tokens_b):
    if SUSPICIOUS.search(" ".join(tokens_a + tokens_b)):
        return "extraction_failed"
    if tokens_a == tokens_b:
        return "extracted_consistent"
    if sorted(tokens_a) == sorted(tokens_b):
        return "extracted_consistent_layout_difference"
    return "needs_visual_review"
