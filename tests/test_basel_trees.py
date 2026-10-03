"""Tree kind and height rules of the tree-inventory converter."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location(
    "trees", ROOT / "scripts/convert-basel-trees.py")
trees = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trees)


class TreeTests(unittest.TestCase):
    def test_conifers_by_genus(self):
        self.assertEqual(trees.kind("Pinus nigra"), 1)
        self.assertEqual(trees.kind("Taxus baccata"), 1)
        self.assertEqual(trees.kind("Tilia cordata"), 0)
        self.assertEqual(trees.kind(None), 0)

    def test_height_from_age_is_clamped(self):
        self.assertEqual(trees.height(1), trees.MIN_HEIGHT)
        self.assertEqual(trees.height(200), trees.MAX_HEIGHT)
        self.assertAlmostEqual(trees.height(30), 12.0)
        self.assertEqual(trees.height(None), trees.height(trees.DEFAULT_AGE))

    def test_generated_trees_lie_inside_the_map(self):
        rows = json.loads((ROOT / "public/maps/basel-trees.json").read_text())["trees"]
        left, back, right, front = json.loads(
            (ROOT / "public/maps/basel-roads.json").read_text())["bounds"]
        self.assertGreater(len(rows), 1000)
        for x, z, conifer, height in rows:
            self.assertTrue(left <= x <= right and back <= z <= front)
            self.assertIn(conifer, (0, 1))
            self.assertTrue(trees.MIN_HEIGHT <= height <= trees.MAX_HEIGHT)


if __name__ == "__main__":
    unittest.main()
