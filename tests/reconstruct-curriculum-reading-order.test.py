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
        words = [{"text":"187","top":0,"x0":0},{"text":"Indaga","top":30,"x0":30},{"text":"Indaga","top":30,"x0":10}]
        self.assertEqual(module.canonical_tokens(words), ["Indaga", "Indaga"])

if __name__ == "__main__": unittest.main()
