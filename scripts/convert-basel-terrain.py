"""Resample swissALTI3D 2 m tiles to the game's 4 m terrain grid (stdlib only).

Heights are relative to the building GLB origin, so buildings, roads and the
aerial photo share one vertical datum. Downloaded tiles stay in .cache/terrain/.
"""
import argparse
from array import array
import io
import json
import math
from pathlib import Path
import struct
import urllib.request
import zipfile

STAC = ("https://data.geo.admin.ch/api/stac/v0.9/collections/"
        "ch.swisstopo.swissalti3d/items?bbox=7.55,47.53,7.66,47.59&limit=100")
SPACING = 4
SOURCE_STEP = 2


def tile_names(bounds):
    """1 km tile keys (east km, north km) covering an LV95 extent."""
    return {(e, n)
            for e in range(math.floor(bounds[0] / 1000), math.ceil(bounds[2] / 1000))
            for n in range(math.floor(bounds[1] / 1000), math.ceil(bounds[3] / 1000))}


def download(bounds, cache):
    """Latest 2 m XYZ asset per needed tile; skips files already cached."""
    needed, latest, url = tile_names(bounds), {}, STAC
    while url:
        page = json.load(urllib.request.urlopen(url, timeout=60))
        for item in page["features"]:
            year, key = item["id"].split("_")[1:3]
            e, n = map(int, key.split("-"))
            for asset in item["assets"].values():
                if (e, n) in needed and asset["href"].endswith("_2_2056_5728.xyz.zip"):
                    if (e, n) not in latest or year > latest[(e, n)][0]:
                        latest[(e, n)] = (year, asset["href"])
        url = next((link["href"] for link in page.get("links", [])
                    if link["rel"] == "next"), None)
    missing = needed - latest.keys()
    if missing:
        raise RuntimeError(f"swissALTI3D tiles not found: {sorted(missing)}")
    cache.mkdir(parents=True, exist_ok=True)
    paths = []
    for _, href in sorted(latest.values()):
        path = cache / href.rsplit("/", 1)[1]
        if not path.exists():
            urllib.request.urlretrieve(href, path)
        paths.append(path)
    return paths


class SourceGrid:
    """All tiles on one shared 2 m lattice; NaN where no tile covers it."""

    def __init__(self, paths, bounds):
        self.e0 = math.floor(bounds[0] / 1000) * 1000
        self.n0 = math.floor(bounds[1] / 1000) * 1000
        self.size = (math.ceil(bounds[2] / 1000) * 1000 - self.e0) // SOURCE_STEP
        self.rows = (math.ceil(bounds[3] / 1000) * 1000 - self.n0) // SOURCE_STEP
        self.offset = None
        self.values = array("f", [math.nan]) * (self.size * self.rows)
        for path in paths:
            with zipfile.ZipFile(path) as archive:
                text = archive.read(archive.namelist()[0]).decode()
            self.add(io.StringIO(text))

    def add(self, lines):
        for line in lines:
            fields = line.split()
            if len(fields) < 3 or not fields[0][0].isdigit():
                continue  # header row
            e, n, h = map(float, fields[:3])
            if self.offset is None:  # cell-centre or corner lattice
                self.offset = e % SOURCE_STEP
            i = round((e - self.e0 - self.offset) / SOURCE_STEP)
            j = round((n - self.n0 - self.offset) / SOURCE_STEP)
            if 0 <= i < self.size and 0 <= j < self.rows:
                self.values[j * self.size + i] = h

    def height(self, e, n):
        """Bilinear height at an LV95 point."""
        fx = (e - self.e0 - self.offset) / SOURCE_STEP
        fy = (n - self.n0 - self.offset) / SOURCE_STEP
        i, j = math.floor(fx), math.floor(fy)
        tx, ty = fx - i, fy - j
        corners = []
        for dj in (0, 1):
            for di in (0, 1):
                ii = min(max(i + di, 0), self.size - 1)
                jj = min(max(j + dj, 0), self.rows - 1)
                corners.append(self.values[jj * self.size + ii])
        a, b, c, d = corners
        return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty


def resample(source, origin, local_bounds):
    """Game grid rows run north to south (z grows southwards), in centimetres."""
    left, back, right, front = local_bounds
    columns = math.ceil((right - left) / SPACING) + 1
    rows = math.ceil((front - back) / SPACING) + 1
    heights = array("h")
    for r in range(rows):
        z = back + r * SPACING
        for c in range(columns):
            x = left + c * SPACING
            h = source.height(origin[0] + x, origin[1] - z)
            if math.isnan(h):
                raise ValueError(f"No terrain at local {x:.1f}, {z:.1f}")
            heights.append(round((h - origin[2]) * 100))
    return columns, rows, heights


def convert(model, roads, cache, output):
    raw = model.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    origin = json.loads(raw[20:20 + size])["extras"]["origin"]
    local = json.loads(roads.read_text())["bounds"]
    bounds = [origin[0] + local[0], origin[1] - local[3],
              origin[0] + local[2], origin[1] - local[1]]
    paths = download(bounds, cache)
    columns, rows, heights = resample(SourceGrid(paths, bounds), origin, local)
    output.with_suffix(".bin").write_bytes(heights.tobytes())
    meta = {"origin": origin, "bounds": local, "spacing": SPACING,
            "columns": columns, "rows": rows, "units": "cm",
            "source": "swissALTI3D 2 m, " + ", ".join(p.name for p in paths),
            "license": "https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices",
            "copyright": "© swisstopo"}
    output.with_suffix(".json").write_text(json.dumps(meta, indent=1) + "\n")
    print(f"{columns} × {rows} cells, {min(heights) / 100:.1f} to {max(heights) / 100:.1f} m")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, default=Path("public/models/basel-city.glb"))
    parser.add_argument("--roads", type=Path, default=Path("public/maps/basel-roads.json"))
    parser.add_argument("--cache", type=Path, default=Path(".cache/terrain"))
    parser.add_argument("--output", type=Path, default=Path("public/maps/basel-terrain"))
    args = parser.parse_args()
    convert(args.model, args.roads, args.cache, args.output)
