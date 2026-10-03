"""Rasterise Basel's land cover (Bodenbedeckung) into ground-category PNG tiles.

Requires the PROJ cs2cs command (as for the roads). The GeoJSON export of
data.bs.ch dataset 100477 is downloaded to .cache/ground/ when missing. Each
0.4 m texel holds one category code (red) and the exact distance from its
centre to the nearest land-cover edge (green), so the game can reconstruct
straight boundaries between texels.
"""
import argparse
import json
import math
from pathlib import Path
import struct
import subprocess
import urllib.request
import zlib

SOURCE = ("https://data.bs.ch/api/explore/v2.1/catalog/datasets/100477/"
          "exports/geojson?select=bodenbedeckungsart")
SPACING = 0.4
# Distances are stored up to this many texels; farther texels read as "deep inside".
MAX_DISTANCE = 2.0
# Tile splits fall on 100 m terrain-tile boundaries so every tile stays ≤ 4096 px.
SPLIT = (1300, 1100)
CATEGORIES = ["other", "road", "sidewalk", "island", "paved", "green",
              "forest", "water", "rail", "building"]
# Most specific prefix first.
RULES = [
    ("Gebaeude", "building"),
    ("befestigt.Strasse_Weg", "road"),
    ("befestigt.Trottoir", "sidewalk"),
    ("befestigt.Verkehrsinsel", "island"),
    ("befestigt.Bahn", "rail"),
    ("befestigt.Wasserbecken", "water"),
    ("befestigt.", "paved"),
    ("humusiert.", "green"),
    ("bestockt.", "forest"),
    ("Gewaesser.", "water"),
]


def category(kind):
    """Category code for a bodenbedeckungsart value; unknown kinds are 0."""
    for prefix, name in RULES:
        if (kind or "").startswith(prefix):
            return CATEGORIES.index(name)
    return 0


def rasterise(grid, width, height, rings, code):
    """Even-odd scanline fill of rings given in texel units (x right, y down)."""
    crossings = {}
    for ring in rings:
        for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
            if y0 == y1:
                continue
            if y0 > y1:
                x0, y0, x1, y1 = x1, y1, x0, y0
            # Rows whose centre (row + 0.5) lies in [y0, y1).
            first = max(0, math.ceil(y0 - 0.5))
            last = min(height - 1, math.ceil(y1 - 0.5) - 1)
            slope = (x1 - x0) / (y1 - y0)
            for row in range(first, last + 1):
                crossings.setdefault(row, []).append(x0 + (row + 0.5 - y0) * slope)
    value = bytes([code])
    for row, xs in crossings.items():
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            start = max(0, math.ceil(a - 0.5))
            end = min(width, math.ceil(b - 0.5))
            if end > start:
                grid[row * width + start:row * width + end] = value * (end - start)


def edge_distances(distance, width, height, rings):
    """Lower `distance` (0-255 for 0-MAX_DISTANCE texels) near every ring edge.

    Edges are cut into pieces of at most 8 texels; each piece updates the
    texels within MAX_DISTANCE of it with the exact point-to-segment distance.
    """
    reach = MAX_DISTANCE
    for ring in rings:
        for (ax, ay), (bx, by) in zip(ring, ring[1:] + ring[:1]):
            total = math.hypot(bx - ax, by - ay)
            if total == 0:
                continue
            pieces = math.ceil(total / 8)
            for k in range(pieces):
                sx, sy = ax + (bx - ax) * k / pieces, ay + (by - ay) * k / pieces
                ex, ey = ax + (bx - ax) * (k + 1) / pieces, ay + (by - ay) * (k + 1) / pieces
                x0 = max(0, int(min(sx, ex) - reach))
                x1 = min(width - 1, int(max(sx, ex) + reach))
                y0 = max(0, int(min(sy, ey) - reach))
                y1 = min(height - 1, int(max(sy, ey) + reach))
                if x0 > x1 or y0 > y1:
                    continue  # outside the map
                length = total / pieces
                dx, dy = (ex - sx) / length, (ey - sy) / length
                for y in range(y0, y1 + 1):
                    py = y + 0.5 - sy
                    row = y * width
                    for x in range(x0, x1 + 1):
                        px = x + 0.5 - sx
                        along = min(max(px * dx + py * dy, 0.0), length)
                        d = math.hypot(px - along * dx, py - along * dy)
                        if d < reach:
                            # 16 levels (5 cm) keep edges straight and compress well.
                            value = int(d / reach * 15 + 0.5) * 17
                            if value < distance[row + x]:
                                distance[row + x] = value


def png(width, height, pixels, channels=1):
    """8-bit greyscale (1 channel) or RGB (3 channels) PNG, filter 0 on every row."""
    def chunk(kind, data):
        return (struct.pack(">I", len(data)) + kind + data
                + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))
    stride = width * channels
    rows = b"".join(b"\0" + pixels[r * stride:(r + 1) * stride] for r in range(height))
    colour = 0 if channels == 1 else 2
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, colour, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


def tiles(bounds):
    """2×2 tile extents (x0, z0, columns, rows) in local metres, split at SPLIT."""
    left, back, right, front = bounds
    xs = [left, left + SPLIT[0], right]
    zs = [back, back + SPLIT[1], front]
    return [(xs[i], zs[j], math.ceil((xs[i + 1] - xs[i]) / SPACING),
             math.ceil((zs[j + 1] - zs[j]) / SPACING))
            for j in range(2) for i in range(2)]


def project(points):
    result = subprocess.run(["cs2cs", "-f", "%.3f", "OGC:CRS84", "EPSG:2056"],
                            input="".join(f"{p[0]} {p[1]}\n" for p in points),
                            text=True, capture_output=True, check=True)
    return [tuple(map(float, line.split()[:2])) for line in result.stdout.splitlines()]


def convert(source, model, roads, output):
    raw = model.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    origin = json.loads(raw[20:20 + size])["extras"]["origin"]
    bounds = json.loads(roads.read_text())["bounds"]
    features = json.loads(source.read_text())["features"]
    polygons = []  # (code, [ring of (lon, lat)])
    for feature in features:
        geometry = feature.get("geometry") or {}
        parts = ([geometry["coordinates"]] if geometry.get("type") == "Polygon"
                 else geometry.get("coordinates", []) if geometry.get("type") == "MultiPolygon"
                 else [])
        code = category(feature["properties"].get("bodenbedeckungsart"))
        polygons += [(code, part) for part in parts]
    flat = [p for _, part in polygons for ring in part for p in ring]
    projected = iter(project(flat))
    full_width = math.ceil((bounds[2] - bounds[0]) / SPACING)
    full_height = math.ceil((bounds[3] - bounds[1]) / SPACING)
    grid = bytearray(full_width * full_height)
    distance = bytearray(b"\xff") * (full_width * full_height)
    kept = 0
    for code, part in polygons:
        rings = [[(lambda e, n: ((e - origin[0] - bounds[0]) / SPACING,
                                 (origin[1] - n - bounds[1]) / SPACING))(*next(projected))
                  for _ in ring] for ring in part]
        xs = [p[0] for ring in rings for p in ring]
        ys = [p[1] for ring in rings for p in ring]
        if max(xs) < 0 or min(xs) > full_width or max(ys) < 0 or min(ys) > full_height:
            continue
        kept += 1
        rasterise(grid, full_width, full_height, rings, code)
        edge_distances(distance, full_width, full_height, rings)
    meta = {"origin": origin, "bounds": bounds, "spacing": SPACING,
            "maxDistance": MAX_DISTANCE,
            "categories": CATEGORIES, "tiles": [],
            "source": "Bodenbedeckung, data.bs.ch dataset 100477",
            "license": "https://creativecommons.org/licenses/by/4.0/",
            "copyright": "Quelle: Geodaten Kanton Basel-Stadt"}
    for index, (x0, z0, columns, rows) in enumerate(tiles(bounds)):
        c0 = round((x0 - bounds[0]) / SPACING)
        r0 = round((z0 - bounds[1]) / SPACING)
        columns = min(columns, full_width - c0)
        rows = min(rows, full_height - r0)
        pixels = bytearray(columns * rows * 3)
        for r in range(rows):
            start = (r0 + r) * full_width + c0
            line = r * columns * 3
            pixels[line:line + columns * 3:3] = grid[start:start + columns]
            pixels[line + 1:line + columns * 3:3] = distance[start:start + columns]
        name = f"{output.name}-{index}.png"
        (output.parent / name).write_bytes(png(columns, rows, bytes(pixels), 3))
        meta["tiles"].append({"file": name, "x": x0, "z": z0,
                              "columns": columns, "rows": rows})
    output.with_suffix(".json").write_text(json.dumps(meta, indent=1) + "\n")
    counts = [grid.count(bytes([i])) for i in range(len(CATEGORIES))]
    print(f"{kept} polygons; {full_width} × {full_height} texels; "
          + ", ".join(f"{n} {100 * c / len(grid):.1f}%" for n, c in zip(CATEGORIES, counts)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(".cache/ground/bodenbedeckung.geojson"))
    parser.add_argument("--model", type=Path, default=Path("public/models/basel-city.glb"))
    parser.add_argument("--roads", type=Path, default=Path("public/maps/basel-roads.json"))
    parser.add_argument("--output", type=Path, default=Path("public/maps/basel-ground"))
    args = parser.parse_args()
    if not args.source.exists():
        args.source.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(SOURCE, args.source)
    convert(args.source, args.model, args.roads, args.output)
