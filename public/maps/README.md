# Basel ground layers

`basel-roads.json` contains 1,918 cropped street sections (9,562 segments),
derived from dataset 100250. Only street names, categories and geometry are
retained. WGS84 coordinates are transformed to LV95 using PROJ, then centred
on the origin recorded in the building GLB. Estimated widths are defined in
the converter; neither widths nor bridge/tunnel elevations are surveyed here.

Rebuild with Python 3 and the PROJ `cs2cs` command available:

```sh
python3 scripts/convert-basel-roads.py /path/to/100250.geojson public/models/basel-city.glb public/maps/basel-roads.json
python3 tests/test_basel_roads.py
```

`basel-aerial.jpg` is a 4096 × 3465 SWISSIMAGE WMS snapshot downloaded
2026-10-03. Its LV95 extent is 2610424,1266117.676,2612927.604,1268235.856.
Resolution is about 0.61 metres per pixel, resampled from the source imagery.
The acquisition date is not recorded by this WMS snapshot.

Re-download from the official service:

```sh
curl --fail --location 'https://wms.geo.admin.ch/?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=ch.swisstopo.swissimage&STYLES=default&CRS=EPSG:2056&BBOX=2610424,1266117.676,2612927.604,1268235.856&WIDTH=4096&HEIGHT=3465&FORMAT=image/jpeg' -o public/maps/basel-aerial.jpg
```

Both layers are visual scenery on flat ground. The fictional mission rectangle
is excluded. Two batched road meshes with translucent estimated surfaces allow
photographic markings to remain visible. Geometry and imagery have independent
fallbacks; failed imagery preserves roads on the original ground. No imagery
service is contacted during gameplay. Settings live in `config/map.ts`.

## Terrain

`basel-terrain.bin` holds 627 × 531 heights on a 4 m grid (Int16 centimetres,
rows north to south) relative to the building GLB origin height; the grid's
bounds and source tiles are in `basel-terrain.json`. It is resampled from nine
swissALTI3D 2 m tiles (2025 release), which download to `.cache/terrain/` and
are not committed. Rebuild with Python 3 only:

```sh
python3 scripts/convert-basel-terrain.py
python3 tests/test_basel_terrain.py
```

Source credits and licences are recorded in `docs/SOURCES.md` and the field guide.
