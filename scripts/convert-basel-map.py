"""Convert the supplied triangle OBJ to a tiled, Y-up GLB using only Python's stdlib.

The fictional mission stays clear; complete buildings intersecting its rectangle
are omitted. Spatial tiles keep distant buildings eligible for frustum culling.
"""

import argparse
from array import array
import json
import math
from pathlib import Path
import struct

TILE_SIZE = 100
MISSION_CLEARANCE = (-20, 20, -32, 12)  # X/Z bounds including NPCs and camera.


def building_seed(index):
    """Stable 0-1 value per building, so colours survive regeneration."""
    return (index * 2654435761 % 2**32) / 2**32


def read_objects(source):
    """Vertices, per-object triangles, and whether each object is a bridge."""
    vertices, objects, bridges, faces, bridge = [], [], [], [], False
    with source.open() as stream:
        for line in stream:
            fields = line.split()
            if not fields:
                continue
            if fields[0] == "v":
                vertices.append(tuple(map(float, fields[1:4])))
            elif fields[0] == "usemtl":
                # The Basel model names bridge materials "Bru_<id>".
                bridge = bridge or fields[1].startswith("Bru_")
            elif fields[0] == "o":
                if faces:
                    objects.append(faces)
                    bridges.append(bridge)
                    faces = []
                bridge = False
            elif fields[0] == "f":
                indices = [int(field.split("/")[0]) for field in fields[1:]]
                indices = [i - 1 if i > 0 else len(vertices) + i for i in indices]
                for i in range(1, len(indices) - 1):
                    faces.append((indices[0], indices[i], indices[i + 1]))
    if faces:
        objects.append(faces)
        bridges.append(bridge)
    return vertices, objects, bridges


def convert(source, output):
    vertices, objects, bridges = read_objects(source)
    if not vertices or not objects:
        raise ValueError("The OBJ contains no building geometry")
    east = (min(v[0] for v in vertices) + max(v[0] for v in vertices)) / 2
    north = (min(v[1] for v in vertices) + max(v[1] for v in vertices)) / 2
    # Use nearby building base elevations, rather than invalid zero-height outliers.
    bases = []
    for faces in objects:
        points = [vertices[i] for i in {i for face in faces for i in face}]
        if any(math.hypot(v[0] - east, v[1] - north) < TILE_SIZE for v in points):
            bases.append(min(v[2] for v in points if v[2] > 0))
    if not bases:
        raise ValueError("No nearby building bases found")
    height = sorted(bases)[len(bases) // 2]
    local = [(e - east, h - height, north - n) for e, n, h in vertices]
    tiles, omitted, buildings = {}, 0, {}
    for number, faces in enumerate(objects):
        indices = {i for face in faces for i in face}
        points = [local[i] for i in indices]
        # Floors count from the lowest valid vertex; zero-height outliers are skipped.
        valid = [local[i][1] for i in indices if vertices[i][2] > 0]
        base = min(valid) if valid else min(p[1] for p in points)
        buildings[number] = (building_seed(number), base, 1.0 if bridges[number] else 0.0)
        min_x, max_x = min(v[0] for v in points), max(v[0] for v in points)
        min_z, max_z = min(v[2] for v in points), max(v[2] for v in points)
        left, right, back, front = MISSION_CLEARANCE
        if min_x <= right and max_x >= left and min_z <= front and max_z >= back:
            omitted += 1
            continue
        key = (math.floor((min_x + max_x) / 2 / TILE_SIZE),
               math.floor((min_z + max_z) / 2 / TILE_SIZE))
        tiles.setdefault(key, []).extend((number, face) for face in faces)

    binary = bytearray()
    views, accessors, meshes, nodes = [], [], [], []

    def attribute(values, component, kind, target, bounds=None):
        if values.itemsize != 4:
            raise ValueError("GLB conversion requires 32-bit arrays")
        import sys
        if sys.byteorder != "little":
            values.byteswap()
        offset = len(binary)
        binary.extend(values.tobytes())
        views.append({"buffer": 0, "byteOffset": offset,
                      "byteLength": len(binary) - offset, "target": target})
        accessor = {"bufferView": len(views) - 1, "componentType": component,
                    "count": len(values) // (3 if kind == "VEC3" else 1), "type": kind}
        if bounds:
            accessor.update(min=bounds[0], max=bounds[1])
        accessors.append(accessor)
        return len(accessors) - 1

    for key, faces in sorted(tiles.items()):
        # Each building keeps its own vertices so it can carry its own style data.
        used = sorted({(number, i) for number, face in faces for i in face})
        remap = {vertex: i for i, vertex in enumerate(used)}
        points = [local[i] for _, i in used]
        bounds = ([min(p[i] for p in points) for i in range(3)],
                  [max(p[i] for p in points) for i in range(3)])
        positions = attribute(array("f", (c for p in points for c in p)),
                              5126, "VEC3", 34962, bounds)
        style = attribute(array("f", (c for number, _ in used for c in buildings[number])),
                          5126, "VEC3", 34962)
        triangles = attribute(array("I", (remap[(n, i)] for n, f in faces for i in f)),
                              5125, "SCALAR", 34963)
        meshes.append({"primitives": [{"attributes": {"POSITION": positions,
                                                      "_BUILDING": style},
                                       "indices": triangles, "material": 0}]})
        nodes.append({"name": f"Basel tile {key[0]},{key[1]}", "mesh": len(meshes) - 1})
    if not nodes:
        raise ValueError("No buildings remain outside the mission area")
    document = {
        "asset": {"version": "2.0", "generator": "Sponge City Basel converter",
                  "copyright": "Quelle: Geodaten Kanton Basel-Stadt (CC BY 4.0)"},
        "scene": 0, "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes, "meshes": meshes, "bufferViews": views, "accessors": accessors,
        "buffers": [{"byteLength": len(binary)}],
        "materials": [{"name": "Original grey building material",
                       "pbrMetallicRoughness": {"baseColorFactor": [0.75, 0.75, 0.75, 1],
                                                "metallicFactor": 0, "roughnessFactor": 1}}],
        "extras": {"source": source.name, "origin": [east, north, height],
                   "sourceUrl": "https://shop.geo.bs.ch/geodaten-katalog/",
                   "license": "https://creativecommons.org/licenses/by/4.0/",
                   "modifications": "Tiled GLB, local Y-up coordinates, mission-area buildings omitted, "
                                    "_BUILDING attribute (style seed, base height, bridge flag)",
                   "omittedBuildings": omitted, "missionClearanceXZ": MISSION_CLEARANCE},
    }
    encoded = json.dumps(document, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    binary += b"\0" * (-len(binary) % 4)
    total = 12 + 8 + len(encoded) + 8 + len(binary)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(struct.pack("<III", 0x46546C67, 2, total)
                       + struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
                       + struct.pack("<II", len(binary), 0x004E4942) + binary)
    print(f"Wrote {output}: {total / 1024 / 1024:.1f} MiB, {len(nodes)} tiles, "
          f"{sum(len(f) for f in tiles.values())} triangles; {omitted} buildings omitted.")
    print(f"Source origin: {east}, {north}, {height}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    convert(args.source, args.output)
