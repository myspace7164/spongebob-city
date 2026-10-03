"""Convert Basel's tree inventory (Baumkataster) to compact local tree rows.

Requires the PROJ cs2cs command. The GeoJSON export of data.bs.ch dataset
100052 is downloaded to .cache/trees/ when missing. Output rows are
[x, z, kind, height]: local metres, 0 broadleaf / 1 conifer, height estimated
from tree age (the inventory has no measured heights).
"""
import argparse
import json
from pathlib import Path
import struct
import subprocess
import urllib.request

SOURCE = ("https://data.bs.ch/api/explore/v2.1/catalog/datasets/100052/"
          "exports/geojson?select=baumart_lateinisch,ba_baumalter")
CONIFERS = {"Abies", "Cedrus", "Chamaecyparis", "Cryptomeria", "Cupressus",
            "Juniperus", "Larix", "Metasequoia", "Picea", "Pinus", "Pseudotsuga",
            "Sequoia", "Sequoiadendron", "Taxodium", "Taxus", "Thuja", "Tsuga"}
DEFAULT_AGE = 25
MIN_HEIGHT, MAX_HEIGHT = 4.0, 18.0


def kind(latin):
    """1 for conifers (by genus), else 0."""
    genus = (latin or "").split(" ")[0]
    return 1 if genus in CONIFERS else 0


def height(age):
    """Rough height from age in years, clamped to typical city trees."""
    years = age if isinstance(age, (int, float)) and age > 0 else DEFAULT_AGE
    return max(MIN_HEIGHT, min(MAX_HEIGHT, 3.0 + 0.3 * years))


def convert(source, model, roads, output):
    raw = model.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    origin = json.loads(raw[20:20 + size])["extras"]["origin"]
    left, back, right, front = json.loads(roads.read_text())["bounds"]
    features = [f for f in json.loads(source.read_text())["features"]
                if (f.get("geometry") or {}).get("type") == "Point"]
    projected = subprocess.run(
        ["cs2cs", "-f", "%.3f", "OGC:CRS84", "EPSG:2056"],
        input="".join("{} {}\n".format(*f["geometry"]["coordinates"][:2]) for f in features),
        text=True, capture_output=True, check=True).stdout.splitlines()
    rows = []
    for feature, line in zip(features, projected):
        east, north = map(float, line.split()[:2])
        x, z = east - origin[0], origin[1] - north
        if left <= x <= right and back <= z <= front:
            p = feature["properties"]
            rows.append([round(x, 1), round(z, 1), kind(p.get("baumart_lateinisch")),
                         round(height(p.get("ba_baumalter")), 1)])
    output.write_text(json.dumps({
        "source": "Baumkataster: Baumbestand, data.bs.ch dataset 100052",
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "copyright": "Quelle: Geodaten Kanton Basel-Stadt (Stadtgärtnerei)",
        "columns": ["x", "z", "conifer", "height"], "trees": rows},
        separators=(",", ":")) + "\n")
    print(f"{len(rows)} of {len(features)} trees inside the map; "
          f"{sum(r[2] for r in rows)} conifers")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(".cache/trees/baumkataster.geojson"))
    parser.add_argument("--model", type=Path, default=Path("public/models/basel-city.glb"))
    parser.add_argument("--roads", type=Path, default=Path("public/maps/basel-roads.json"))
    parser.add_argument("--output", type=Path, default=Path("public/maps/basel-trees.json"))
    args = parser.parse_args()
    if not args.source.exists():
        args.source.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(SOURCE, args.source)
    convert(args.source, args.model, args.roads, args.output)
