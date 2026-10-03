import type { GroundMeta, GroundTile } from "./ground-style";

/** One decoded land-cover tile: category (and distance) bytes per texel. */
export interface GroundTileData {
  tile: GroundTile;
  channels: number;
  /** Unfiltered rows, each prefixed by its PNG filter byte (always 0 here). */
  raw: Uint8Array;
}

/**
 * Decode a converter PNG (8-bit grey or RGB, filter 0 on every row). `inflate`
 * undoes zlib: DecompressionStream in the browser, node:zlib in tests.
 */
export async function decodeGroundPng(
  tile: GroundTile,
  png: Uint8Array,
  inflate: (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array,
): Promise<GroundTileData> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16),
    height = view.getUint32(20);
  if (width !== tile.columns || height !== tile.rows)
    throw new Error(`Ground tile ${tile.file} has an unexpected size`);
  const channels = png[25] === 2 ? 3 : 1;
  const parts: Uint8Array[] = [];
  for (let o = 8; o < png.length;) {
    const length = view.getUint32(o);
    const kind = String.fromCharCode(...png.subarray(o + 4, o + 8));
    if (kind === "IDAT") parts.push(png.subarray(o + 8, o + 8 + length));
    o += 12 + length;
  }
  const joined = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    joined.set(p, offset);
    offset += p.length;
  }
  return { tile, channels, raw: await inflate(joined) };
}

/** Browser zlib inflate via DecompressionStream. */
export async function inflateInBrowser(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Category name at a map-local point, or "other" outside the decoded tiles. */
export function categoryAt(
  meta: GroundMeta,
  tiles: readonly GroundTileData[],
  x: number,
  z: number,
): string {
  for (const { tile, channels, raw } of tiles) {
    const c = Math.floor((x - tile.x) / meta.spacing),
      r = Math.floor((z - tile.z) / meta.spacing);
    if (c >= 0 && c < tile.columns && r >= 0 && r < tile.rows)
      return meta.categories[
        raw[r * (tile.columns * channels + 1) + 1 + c * channels]
      ];
  }
  return "other";
}
