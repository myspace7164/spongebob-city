"""Per-building style data written by the building converter."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "basel_map", Path(__file__).parents[1] / "scripts/convert-basel-map.py")
basel_map = importlib.util.module_from_spec(spec)
spec.loader.exec_module(basel_map)

# Two houses sharing an edge (vertices 2 and 3), and a bridge, far from the mission.
OBJ = """v 1000 1000 270
v 1004 1000 270
v 1004 1004 270
v 1000 1004 276
v 1008 1000 271
v 1008 1004 271
v 1100 1100 265
v 1104 1100 265
v 1104 1104 265
o mesh-0
usemtl 1.Mat_000
f 1 2 3
f 1 3 4
o mesh-1
usemtl 2.Mat_000
f 2 5 6
f 2 6 3
o mesh-2
usemtl Bru_9.Mat_000
f 7 8 9
"""


def read_glb(path):
    raw = path.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    document = json.loads(raw[20:20 + size])
    binary = raw[20 + size + 8:]

    def values(accessor_index):
        accessor = document["accessors"][accessor_index]
        view = document["bufferViews"][accessor["bufferView"]]
        width = {"SCALAR": 1, "VEC3": 3}[accessor["type"]]
        code = "I" if accessor["componentType"] == 5125 else "f"
        count = accessor["count"] * width
        return struct.unpack_from(f"<{count}{code}", binary, view["byteOffset"])
    return document, values


class BuildingStyleDataTests(unittest.TestCase):
    def setUp(self):
        folder = Path(tempfile.mkdtemp())
        (folder / "city.obj").write_text(OBJ)
        basel_map.convert(folder / "city.obj", folder / "city.glb")
        self.document, self.values = read_glb(folder / "city.glb")

    def test_bridges_are_flagged(self):
        folder = Path(tempfile.mkdtemp())
        (folder / "city.obj").write_text(OBJ)
        _, objects, bridges, names = basel_map.read_objects(folder / "city.obj")
        self.assertEqual(names, ["mesh-0", "mesh-1", "mesh-2"])
        self.assertEqual(len(objects), 3)
        self.assertEqual(bridges, [False, False, True])

    def test_each_building_has_its_own_vertices_and_style(self):
        styles, positions = [], []
        for mesh in self.document["meshes"]:
            attributes = mesh["primitives"][0]["attributes"]
            self.assertIn("_BUILDING", attributes)
            data = self.values(attributes["_BUILDING"])
            styles += [data[i:i + 3] for i in range(0, len(data), 3)]
            points = self.values(attributes["POSITION"])
            positions += [points[i:i + 3] for i in range(0, len(points), 3)]
        # 4 + 4 house vertices (shared edge duplicated) + 3 bridge vertices.
        self.assertEqual(len(positions), 11)
        seeds = {round(s[0], 6) for s in styles}
        self.assertEqual(len(seeds), 3)
        self.assertTrue(all(0 <= s[0] < 1 for s in styles))
        self.assertEqual(sorted({s[2] for s in styles}), [0.0, 1.0])
        # Base = lowest valid vertex relative to the origin height (270 m).
        by_seed = {round(s[0], 6): (s[1], s[2]) for s in styles}
        seed = lambda n: round(basel_map.building_seed(n), 6)
        self.assertEqual(by_seed[seed(0)], (0.0, 0.0))
        self.assertEqual(by_seed[seed(1)], (0.0, 0.0))
        self.assertEqual(by_seed[seed(2)], (-5.0, 1.0))

    def test_floating_objects_become_bridges(self):
        # Flat terrain 10 m below the origin: houses (0 m) float 10 m above it,
        # so with terrain every object counts as a bridge; at 0 m none floats.
        folder = Path(tempfile.mkdtemp())
        (folder / "city.obj").write_text(OBJ)
        for ground, expected in [(lambda x, z: -10.0, {1.0}),
                                 (lambda x, z: 0.0, {0.0, 1.0})]:
            basel_map.convert(folder / "city.obj", folder / "city.glb", ground)
            document, values = read_glb(folder / "city.glb")
            flags = set()
            for mesh in document["meshes"]:
                data = values(mesh["primitives"][0]["attributes"]["_BUILDING"])
                flags |= set(data[2::3])
            self.assertEqual(flags, expected)
        self.assertFalse(basel_map.floats([(0, 1.0, 0)], lambda x, z: None))

    def test_landmarks_get_their_own_kind(self):
        folder = Path(tempfile.mkdtemp())
        (folder / "city.obj").write_text(OBJ)
        basel_map.LANDMARKS["mesh-1"] = 2
        try:
            basel_map.convert(folder / "city.obj", folder / "city.glb")
        finally:
            del basel_map.LANDMARKS["mesh-1"]
        document, values = read_glb(folder / "city.glb")
        kinds = set()
        for mesh in document["meshes"]:
            kinds |= set(values(mesh["primitives"][0]["attributes"]["_BUILDING"])[2::3])
        self.assertEqual(kinds, {0.0, 1.0, 2.0})

    def test_seed_is_stable(self):
        self.assertEqual(basel_map.building_seed(7), basel_map.building_seed(7))
        self.assertNotEqual(basel_map.building_seed(7), basel_map.building_seed(8))


if __name__ == "__main__":
    unittest.main()
