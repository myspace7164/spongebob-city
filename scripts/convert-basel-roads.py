"""Convert WGS84 street centrelines into clipped local metre coordinates.

Requires the PROJ cs2cs command. Source widths and elevations are absent;
widths are illustrative, and all surfaces remain on the game's flat ground.
"""
import argparse
import json
from pathlib import Path
import struct
import subprocess

# Approximate visual widths, not surveyed carriageway measurements.
WIDTHS = {"HLS": 12, "HLS-A": 7, "HVS": 9, "HSS": 8,
          "QSS": 6, "ES": 5, "FW": 2}
BOUNDS = [2610424, 1266117.676, 2612927.604, 1268235.856]
MISSION = [-20, -32, 20, 12]  # xmin, zmin, xmax, zmax


def clip(a, b, bounds):
    """Liang–Barsky segment interval within an axis-aligned rectangle."""
    low, high = 0.0, 1.0
    dx, dz = b[0] - a[0], b[1] - a[1]
    for p, q in zip((-dx, dx, -dz, dz),
                    (a[0] - bounds[0], bounds[2] - a[0],
                     a[1] - bounds[1], bounds[3] - a[1])):
        if p == 0:
            if q < 0:
                return None
        elif p < 0:
            low = max(low, q / p)
        else:
            high = min(high, q / p)
        if low > high:
            return None
    return low, high


def convert(source, model, output):
    raw = model.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    origin = json.loads(raw[20:20 + size])["extras"]["origin"]
    features = json.loads(source.read_text())["features"]
    coordinates = [p for f in features for p in f["geometry"]["coordinates"]]
    projected = subprocess.run(
        ["cs2cs", "-f", "%.3f", "OGC:CRS84", "EPSG:2056"],
        input="".join(f"{p[0]} {p[1]}\n" for p in coordinates),
        text=True, capture_output=True, check=True)
    points = iter([list(map(float, line.split()[:2]))
                   for line in projected.stdout.splitlines()])
    local_bounds = [BOUNDS[0] - origin[0], origin[1] - BOUNDS[3],
                    BOUNDS[2] - origin[0], origin[1] - BOUNDS[1]]
    roads = []
    for feature in features:
        props = feature["properties"]
        path = [[p[0] - origin[0], origin[1] - p[1]] for p in
                [next(points) for _ in feature["geometry"]["coordinates"]]]
        category = props.get("strassennetzhierarchie_code")
        is_path = category == "FW" or props.get("strassenkategorie") == "Wege"
        width = WIDTHS.get(category, 2 if is_path else 5)
        margin = width / 2
        bounds = [local_bounds[0] + margin, local_bounds[1] + margin,
                  local_bounds[2] - margin, local_bounds[3] - margin]
        clearance = [MISSION[0] - margin, MISSION[1] - margin,
                     MISSION[2] + margin, MISSION[3] + margin]
        segments = []
        for a, b in zip(path, path[1:]):
            outer = clip(a, b, bounds)
            if outer is None:
                continue
            inner = clip(a, b, clearance)
            intervals = [outer]
            if inner is not None:
                intervals = [(outer[0], min(outer[1], inner[0])),
                             (max(outer[0], inner[1]), outer[1])]
            for low, high in intervals:
                if high - low > 1e-8:
                    segments.append([[round(a[i] + (b[i] - a[i]) * t, 3)
                                      for i in range(2)] for t in (low, high)])
        if segments:
            roads.append({"name": props.get("strassenname"),
                          "kind": "path" if is_path else "road",
                          "width": width, "segments": segments})
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"origin": origin, "bounds": local_bounds,
                                 "roads": roads}, separators=(",", ":")))
    print(f"Converted {len(roads)} street sections; {sum(len(r['segments']) for r in roads)} segments")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("model", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    convert(args.source, args.model, args.output)
