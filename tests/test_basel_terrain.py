"""Terrain grid shape and spot heights checked against swisstopo's height service."""
from array import array
import importlib.util
import io
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location(
    "terrain", ROOT / "scripts/convert-basel-terrain.py")
terrain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(terrain)
meta = json.loads((ROOT / "public/maps/basel-terrain.json").read_text())
heights = array("h", (ROOT / "public/maps/basel-terrain.bin").read_bytes())


def height(x, z):
    c = round((x - meta["bounds"][0]) / meta["spacing"])
    r = round((z - meta["bounds"][1]) / meta["spacing"])
    return heights[r * meta["columns"] + c] / 100


class TerrainTests(unittest.TestCase):
    def test_grid_covers_road_bounds(self):
        self.assertEqual(len(heights), meta["columns"] * meta["rows"])
        left, back, right, front = meta["bounds"]
        self.assertGreaterEqual(left + (meta["columns"] - 1) * meta["spacing"], right)
        self.assertGreaterEqual(back + (meta["rows"] - 1) * meta["spacing"], front)

    def test_basel_range(self):
        # Basel's Rhine bank to the hills of this extent: roughly 240-290 m.
        self.assertGreater(min(heights) / 100 + meta["origin"][2], 235)
        self.assertLess(max(heights) / 100 + meta["origin"][2], 300)

    def test_spot_heights_match_height_service(self):
        # api3.geo.admin.ch/rest/services/height, 2026-10-03.
        for x, z, expected in [(0, 0, 1.5), (428.15, -898.98, -12.4),
                               (80, -60, -8.9), (-60, -250, -24.1)]:
            self.assertAlmostEqual(height(x, z), expected, delta=0.6)

    def test_tile_keys_and_lattice(self):
        self.assertEqual(terrain.tile_names([2610424, 1266117, 2610999, 1266999]),
                         {(2610, 1266)})
        grid = terrain.SourceGrid([], [2610000, 1266000, 2610999, 1266999])
        grid.add(io.StringIO("X Y Z\n2610001 1266001 250\n2610003 1266001 252\n"
                             "2610001 1266003 254\n2610003 1266003 256\n"))
        self.assertAlmostEqual(grid.height(2610002, 1266002), 253)


if __name__ == "__main__":
    unittest.main()
