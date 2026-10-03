import { inflateSync } from "node:zlib";
export function pngPixels(buffer) {
  let offset = 8,
    width,
    height,
    type,
    depth,
    palette,
    alpha;
  const data = [];
  while (offset < buffer.length) {
    const size = buffer.readUInt32BE(offset),
      name = buffer.toString("ascii", offset + 4, offset + 8),
      b = buffer.subarray(offset + 8, offset + 8 + size);
    offset += 12 + size;
    if (name === "IHDR") {
      width = b.readUInt32BE(0);
      height = b.readUInt32BE(4);
      depth = b[8];
      type = b[9];
      if (b[12]) throw Error("Interlaced PNG not supported");
    }
    if (name === "PLTE") palette = b;
    if (name === "tRNS") alpha = b;
    if (name === "IDAT") data.push(b);
  }
  if (depth !== 8) throw Error(`Expected 8-bit PNG, received ${depth}`);
  const channels = { 2: 3, 3: 1, 6: 4 }[type];
  if (!channels) throw Error(`PNG color type ${type}`);
  const raw = inflateSync(Buffer.concat(data)),
    stride = width * channels,
    out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[y * stride + x - channels] : 0,
        up = y ? out[(y - 1) * stride + x] : 0,
        corner = y && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const v = left + up - corner,
          a = Math.abs(v - left),
          b = Math.abs(v - up),
          c = Math.abs(v - corner);
        predictor = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      out[y * stride + x] = (raw[p++] + predictor) & 255;
    }
  }
  const pixels = [];
  for (let i = 0; i < width * height; i++) {
    const k = i * channels;
    pixels.push(
      type === 3
        ? [
            ...palette.subarray(out[k] * 3, out[k] * 3 + 3),
            alpha?.[out[k]] ?? 255,
          ]
        : [out[k], out[k + 1], out[k + 2], type === 6 ? out[k + 3] : 255],
    );
  }
  return { width, height, pixels };
}
