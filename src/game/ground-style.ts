import * as THREE from "three";
import { groundCategories, groundStyle as style } from "../../config/ground";

/** One land-cover texture tile and where it lies in map-local metres. */
export interface GroundTile {
  file: string;
  x: number;
  z: number;
  columns: number;
  rows: number;
}
export interface GroundMeta {
  spacing: number;
  categories: string[];
  tiles: GroundTile[];
}

/** The converter and the game must agree on category codes. */
export function checkGroundMeta(meta: GroundMeta): void {
  if (meta.categories.join() !== groundCategories.join())
    throw new Error("Ground categories differ from config/ground.ts");
}

/** Index of the texture tile containing a map-local point, or -1. */
export function groundTileAt(meta: GroundMeta, x: number, z: number): number {
  return meta.tiles.findIndex(
    (t) =>
      x >= t.x &&
      x < t.x + t.columns * meta.spacing &&
      z >= t.z &&
      z < t.z + t.rows * meta.spacing,
  );
}

const code = (name: (typeof groundCategories)[number]) =>
  groundCategories.indexOf(name);

/**
 * Lit terrain material that draws asphalt, curbs, paving, grass, water and
 * rail areas from a land-cover category texture (one code per 0.4 m texel).
 */
export function createGroundMaterial(
  categories: THREE.Texture,
  tile: GroundTile,
  spacing: number,
): THREE.MeshLambertMaterial {
  categories.magFilter = THREE.NearestFilter;
  categories.minFilter = THREE.NearestFilter;
  categories.generateMipmaps = false;
  categories.colorSpace = THREE.NoColorSpace;
  categories.flipY = false;
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  const colours = Object.fromEntries(
    Object.entries(style.colours).map(([name, hex]) => [
      `u_${name}`,
      { value: new THREE.Color(hex) },
    ]),
  );
  const uniforms = {
    uCategories: { value: categories },
    uTileOrigin: { value: new THREE.Vector2(tile.x, tile.z) },
    uTileSize: { value: new THREE.Vector2(tile.columns, tile.rows) },
    uSpacing: { value: spacing },
    uPaving: { value: style.paving },
    uSlabs: { value: style.slabs },
    uJitter: { value: style.jitter },
    uBrightness: { value: style.brightness },
    ...colours,
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vMap;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMap = position.xz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vMap;
uniform sampler2D uCategories;
uniform vec2 uTileOrigin, uTileSize;
uniform float uSpacing, uPaving, uSlabs, uJitter, uBrightness;
${Object.keys(style.colours)
  .map((name) => `uniform vec3 u_${name};`)
  .join("\n")}
float groundHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float groundNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(groundHash(i), groundHash(i + vec2(1, 0)), f.x),
             mix(groundHash(i + vec2(0, 1)), groundHash(i + vec2(1, 1)), f.x), f.y);
}
int texelCategory(vec2 texel) {
  ivec2 i = ivec2(clamp(texel, vec2(0.0), uTileSize - 1.0));
  return int(texelFetch(uCategories, i, 0).r * 255.0 + 0.5);
}
// Majority of the four nearest texels, weighted bilinearly: smooth, straight-ish
// boundaries instead of a 0.4 m staircase, without blending category colours.
int groundAt(vec2 map) {
  vec2 g = (map - uTileOrigin) / uSpacing - 0.5;
  vec2 b = floor(g), f = g - b;
  int c[4] = int[4](texelCategory(b), texelCategory(b + vec2(1, 0)),
                    texelCategory(b + vec2(0, 1)), texelCategory(b + vec2(1, 1)));
  float w[4] = float[4]((1.0 - f.x) * (1.0 - f.y), f.x * (1.0 - f.y),
                        (1.0 - f.x) * f.y, f.x * f.y);
  int best = c[0];
  float bestWeight = -1.0;
  for (int k = 0; k < 4; k++) {
    float s = 0.0;
    for (int j = 0; j < 4; j++) s += c[j] == c[k] ? w[j] : 0.0;
    if (s > bestWeight) { bestWeight = s; best = c[k]; }
  }
  return best;
}
// Seams between square stones; fades to plain where they shrink below a pixel.
float seams(vec2 p, float size) {
  vec2 cell = fract(p / size);
  float edge = min(min(cell.x, 1.0 - cell.x), min(cell.y, 1.0 - cell.y)) * size;
  float w = max(fwidth(p.x), fwidth(p.y));
  return mix(smoothstep(0.015, 0.035 + w, edge), 1.0, smoothstep(0.08, 0.3, w / size));
}
vec3 groundColour() {
  // Low-frequency jitter turns the 0.4 m texel staircase into organic edges.
  vec2 wobble = (vec2(groundNoise(vMap * 1.3), groundNoise(vMap * 1.3 + 17.0)) - 0.5) * uJitter;
  vec2 p = vMap + wobble;
  int c = groundAt(p);
  float speckle = mix(groundHash(floor(vMap * 6.0)), 0.5, smoothstep(0.05, 0.25, max(fwidth(vMap.x), fwidth(vMap.y))));
  if (c == ${code("road")}) {
    for (int i = 0; i < 4; i++) {
      vec2 d = vec2(i == 0 ? 1.0 : i == 1 ? -1.0 : 0.0, i == 2 ? 1.0 : i == 3 ? -1.0 : 0.0);
      int n = groundAt(p + d * 0.45);
      if (n == ${code("sidewalk")} || n == ${code("island")}) return u_curb;
    }
    return u_road * (0.9 + 0.16 * speckle);
  }
  if (c == ${code("sidewalk")})
    return u_sidewalk * (0.93 + 0.1 * groundHash(floor(vMap / uPaving))) * mix(0.82, 1.0, seams(vMap, uPaving));
  if (c == ${code("paved")} || c == ${code("building")} || c == ${code("other")}) {
    vec3 base = c == ${code("paved")} ? u_paved : c == ${code("building")} ? u_building : u_other;
    return base * (0.95 + 0.06 * groundHash(floor(vMap / uSlabs))) * mix(0.86, 1.0, seams(vMap, uSlabs));
  }
  if (c == ${code("island")}) return mix(u_island, u_green, 0.4 * groundNoise(vMap * 0.7));
  if (c == ${code("green")}) return mix(u_green, u_greenLight, groundNoise(vMap * 0.35)) * (0.94 + 0.1 * speckle);
  if (c == ${code("forest")}) return u_forest * (0.9 + 0.15 * groundNoise(vMap * 0.5));
  if (c == ${code("water")}) {
    float ripple = sin(vMap.x * 0.55 + vMap.y * 0.35 + groundNoise(vMap * 0.2) * 6.0);
    return mix(u_water, u_waterLight, smoothstep(0.75, 1.0, ripple) * 0.6);
  }
  return u_rail * (0.85 + 0.25 * speckle);
}`,
      )
      .replace(
        "#include <color_fragment>",
        // Scene lights are tuned for walls; flat ground needs its colour scaled down.
        "#include <color_fragment>\ndiffuseColor.rgb = groundColour() * uBrightness;",
      );
  };
  material.customProgramCacheKey = () => "basel-ground-style";
  return material;
}
