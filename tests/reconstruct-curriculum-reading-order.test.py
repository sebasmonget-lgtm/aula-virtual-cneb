import importlib.util
from pathlib import Path
import unittest

script = Path(__file__).parents[1] / "scripts" / "reconstruct-curriculum-reading-order.py"
spec = importlib.util.spec_from_file_location("reading_order", script)
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)

class ReadingOrderTests(unittest.TestCase):
    def test_classification(self):
        self.assertEqual(module.classify(["Indaga", "métodos"], ["Indaga", "métodos"]), "extracted_consistent")
        self.assertEqual(module.classify(["Indaga", "métodos"], ["métodos", "Indaga"]), "extracted_consistent_layout_difference")
        self.assertEqual(module.classify(["Indaga"], ["Indaga", "métodos"]), "needs_visual_review")
        self.assertEqual(module.classify(["ni�o"], ["ni�o"]), "extraction_failed")
    def test_header_footer_and_duplicates(self):
        words = [{"text":"187","top":0,"x0":0,"x1":2},{"text":"Indaga","top":30,"x0":30,"x1":50},{"text":"Indaga","top":30,"x0":10,"x1":25}]
        self.assertEqual(module.canonical_tokens(words), ["Indaga", "Indaga"])
    def test_geometric_fragmentation_only(self):
        joined = [{"text":"cn","top":10,"x0":0,"x1":10,"bottom":20}]
        fragments = [{"text":"c","top":10,"x0":0,"x1":5,"bottom":20},{"text":"n","top":10,"x0":5.2,"x1":10,"bottom":20}]
        self.assertEqual(module.canonical_tokens(joined), module.canonical_tokens(fragments))
        spaced = [{"text":"c","top":10,"x0":0,"x1":5,"bottom":20},{"text":"n","top":10,"x0":9,"x1":14,"bottom":20}]
        self.assertEqual(module.classify(module.canonical_tokens(joined), module.canonical_tokens(spaced)), "needs_visual_review")
    def test_accent_difference_requires_review(self):
        self.assertEqual(module.classify(["educación"], ["educacion"]), "needs_visual_review")

if __name__ == "__main__": unittest.main()
