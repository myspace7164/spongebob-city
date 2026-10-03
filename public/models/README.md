Place Blender `.glb` exports here. Files are served as `/models/<filename>.glb`.
See the project README for export settings and configuration.

`basel-city.glb` is derived from the supplied `3D_Stadtmodell.obj`. Its full
remaining building geometry is split into 100 m tiles, with one grey material
matching the source MTL. Coordinates are converted from source east/north/height
to local east/up/south in metres before storing float32 positions.
The origin is the dataset's horizontal bounding-box centre, with the median
nearby building-base elevation as ground. This is not a surveyed Barfüsserplatz
alignment. Ten buildings touching the fictional mission clearance rectangle
were omitted; original terrain, textures and building collisions are absent.

Regenerate using Python 3 (standard library only):

```sh
python3 scripts/convert-basel-map.py /path/to/3D_Stadtmodell.obj public/models/basel-city.glb
```

The converter targets this supplied model, whose materials are all the same grey.
The source OBJ stays outside the repository. See `docs/SOURCES.md` for provenance,
licence and attribution. The converted GLB embeds the attribution and licence URL.
