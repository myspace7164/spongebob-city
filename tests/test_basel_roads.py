"""Geometry clipping and coordinate origin checks for the offline converter."""
import importlib.util
from pathlib import Path
import subprocess
import unittest

spec = importlib.util.spec_from_file_location(
    "roads", Path(__file__).parents[1] / "scripts/convert-basel-roads.py")
roads = importlib.util.module_from_spec(spec)
spec.loader.exec_module(roads)


class ClippingTests(unittest.TestCase):
    def test_crossing_segment(self):
        self.assertEqual(roads.clip([-2, 0], [2, 0], [-1, -1, 1, 1]), (0.25, 0.75))

    def test_outside_parallel_segment(self):
        self.assertIsNone(roads.clip([-2, 2], [2, 2], [-1, -1, 1, 1]))

    def test_swiss_origin_axis_order(self):
        result = subprocess.run(["cs2cs", "-f", "%.3f", "OGC:CRS84", "EPSG:2056"],
                                input="7.438637 46.951081\n", text=True,
                                capture_output=True, check=True)
        east, north = map(float, result.stdout.split()[:2])
        self.assertAlmostEqual(east, 2600000, delta=1)
        self.assertAlmostEqual(north, 1200000, delta=1)


if __name__ == "__main__":
    unittest.main()
