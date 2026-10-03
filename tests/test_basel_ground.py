"""Land-cover rasterising, category mapping and PNG output of the ground converter."""
import importlib.util
import json
from pathlib import Path
import struct
import unittest
import zlib

ROOT = Path(__file__).parents[1]
spec = importlib.util.spec_from_file_location(
    "ground", ROOT / "scripts/convert-basel-ground.py")
ground = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ground)


def read_png(data):
    width, height = struct.unpack(">II", data[16:24])
    chunks, offset = b"", 8
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        if data[offset + 4:offset + 8] == b"IDAT":
            chunks += data[offset + 8:offset + 8 + length]
        offset += 12 + length
    raw = zlib.decompress(chunks)
    return width, height, b"".join(raw[r * (width + 1) + 1:(r + 1) * (width + 1)]
                                   for r in range(height))


class GroundTests(unittest.TestCase):
    def test_categories(self):
        self.assertEqual(ground.category("befestigt.Strasse_Weg"), 1)
        self.assertEqual(ground.category("befestigt.Trottoir"), 2)
        self.assertEqual(ground.category("befestigt.Bahn.Tramareal"), 8)
        self.assertEqual(ground.category("befestigt.Wasserbecken"), 7)
        self.assertEqual(ground.category("befestigt.uebrige_befestigte.Fabrikareal"), 4)
        self.assertEqual(ground.category("humusiert.Gartenanlage.Friedhof"), 5)
        self.assertEqual(ground.category("Gewaesser.fliessendes"), 7)
        self.assertEqual(ground.category("Gebaeude.Tank"), 9)
        self.assertEqual(ground.category(None), 0)

    def test_square_with_hole(self):
        grid = bytearray(10 * 10)
        outer = [(1, 1), (9, 1), (9, 9), (1, 9)]
        hole = [(4, 4), (6, 4), (6, 6), (4, 6)]
        ground.rasterise(grid, 10, 10, [outer, hole], 5)
        filled = {(x, y) for y in range(10) for x in range(10) if grid[y * 10 + x]}
        self.assertEqual(len(filled), 64 - 4)
        self.assertNotIn((4, 4), filled)
        self.assertIn((1, 1), filled)
        self.assertNotIn((0, 0), filled)
        self.assertTrue(all(grid[y * 10 + x] == 5 for x, y in filled))

    def test_png_round_trip(self):
        pixels = bytes(range(12))
        width, height, data = read_png(ground.png(4, 3, pixels))
        self.assertEqual((width, height, data), (4, 3, pixels))

    def test_tiles_cover_bounds_within_texture_limits(self):
        bounds = [-1251.8, -1059.09, 1251.8, 1059.09]
        parts = ground.tiles(bounds)
        self.assertEqual(len(parts), 4)
        self.assertTrue(all(c <= 4096 and r <= 4096 for _, _, c, r in parts))
        area = sum(c * r for _, _, c, r in parts) * ground.SPACING ** 2
        self.assertGreaterEqual(area, (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]))
        # Splits on 100 m terrain tiles.
        self.assertEqual(parts[1][0] - bounds[0], 1300)

    def test_generated_tiles_match_metadata(self):
        meta = json.loads((ROOT / "public/maps/basel-ground.json").read_text())
        self.assertEqual(meta["categories"], ground.CATEGORIES)
        for tile in meta["tiles"]:
            width, height, data = read_png((ROOT / "public/maps" / tile["file"]).read_bytes())
            self.assertEqual((width, height), (tile["columns"], tile["rows"]))
            self.assertLess(max(data), len(ground.CATEGORIES))


if __name__ == "__main__":
    unittest.main()
