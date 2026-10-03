import * as THREE from "three";
import { buildingStyle as style } from "../../config/buildings.ts";

const colour = (hex: string) => new THREE.Color(hex);

/** Illustrative facade families on the existing seed/base/bridge GLB metadata. */
export function createBuildingMaterial(): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({ flatShading: true });
  const total = style.facades.reduce((sum, facade) => sum + facade.weight, 0);
  let running = 0;
  let familyShare = 0;
  const uniforms = {
    uFacades: { value: style.facades.map((f) => colour(f.color)) },
    uCumulative: {
      value: style.facades.map((f) => (running += f.weight) / total),
    },
    uFamilies: {
      value: style.families.map(
        (f) => new THREE.Vector4(f.floor, f.bay, f.width, f.height),
      ),
    },
    uFamilyShares: {
      value: style.families.map((f) => (familyShare += f.share)),
    },
    uShutter: { value: colour(style.shutter) },
    uGlass: { value: colour(style.glass) },
    uFrame: { value: colour(style.frame) },
    uDoor: { value: colour(style.door) },
    uTileRoof: { value: colour(style.tileRoof) },
    uSlateRoof: { value: colour(style.slateRoof) },
    uGravelRoof: { value: colour(style.gravelRoof) },
    uBitumenRoof: { value: colour(style.bitumenRoof) },
    uGreenRoof: { value: colour(style.greenRoof) },
    uPetal: { value: colour(style.flowerPetal) },
    uBridge: { value: colour(style.bridge) },
    uBridgeDeck: { value: colour(style.bridgeDeck) },
    uBridgeUnderside: { value: colour(style.bridgeUnderside) },
    uMetalBand: { value: colour(style.metalBand) },
    uMetalGlass: { value: colour(style.metalGlass) },
    uSoffit: { value: colour(style.soffit) },
    uShutterShare: { value: style.shutterShare },
    uFlowerShare: { value: style.flowerShare },
    uGreenRoofShare: { value: style.greenRoofShare },
    uSlateRoofShare: { value: style.slateRoofShare },
    uWallLimit: { value: style.wallLimit },
    uFlatRoof: { value: style.flatRoof },
  };
  const count = style.facades.length;
  const families = style.families.length;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 _building;
varying vec3 vLocal;
varying vec3 vBuilding;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vLocal = position;
vBuilding = _building;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vLocal;
varying vec3 vBuilding;
uniform vec3 uFacades[${count}];
uniform float uCumulative[${count}];
uniform vec4 uFamilies[${families}];
uniform float uFamilyShares[${families}];
uniform vec3 uShutter, uGlass, uFrame, uDoor, uTileRoof, uSlateRoof;
uniform vec3 uGravelRoof, uBitumenRoof, uGreenRoof, uPetal, uBridge;
uniform vec3 uBridgeDeck, uBridgeUnderside, uMetalBand, uMetalGlass, uSoffit;
uniform float uShutterShare, uFlowerShare, uGreenRoofShare, uSlateRoofShare, uWallLimit, uFlatRoof;
// Polynomial hash avoids high-frequency sine noise on neighbouring fragments.
float styleHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec3 facadeColour(float seed) {
  for (int i = 0; i < ${count}; i++) if (seed < uCumulative[i]) return uFacades[i];
  return uFacades[${count - 1}];
}
float boxMask(vec2 p, vec2 halfSize, float pixel) {
  vec2 d = abs(p) - halfSize;
  return 1.0 - smoothstep(-pixel, pixel, max(d.x, d.y));
}
vec3 wallColour(vec3 n, float seed, float base) {
  float choice = styleHash(vec2(seed, 4.0));
  int family = ${families - 1};
  for (int i = 0; i < ${families}; i++) {
    if (choice < uFamilyShares[i]) { family = i; break; }
  }
  vec4 dimensions = uFamilies[family];
  float floorHeight = dimensions.x;
  float bayWidth = dimensions.y;
  vec2 halfWindow = dimensions.zw * 0.5;
  vec3 plaster = facadeColour(seed);
  if (family >= 2) plaster = mix(plaster, uGravelRoof, 0.5);
  // Dominant-axis local projection keeps windows anchored when the scenery moves
  // between missions, without amplifying tiny normal errors across large coordinates.
  float u = abs(n.x) > abs(n.z) ? vLocal.z : vLocal.x;
  u += seed * 23.0;
  float h = vLocal.y - base;
  vec2 grid = vec2(u / bayWidth, h / floorHeight);
  vec2 cell = floor(grid);
  vec2 p = (fract(grid) - vec2(0.5, 0.55)) * vec2(bayWidth, floorHeight);
  float pixel = max(0.015, max(fwidth(u), fwidth(h)) * 0.7);
  float variation = styleHash(cell + seed * 47.0);
  vec3 c = plaster;
  // A solid low plinth grounds the facade; upper storeys retain their plaster.
  c *= mix(0.77, 1.0, smoothstep(0.45 - pixel, 0.45 + pixel, h));
  bool groundFloor = h < floorHeight;
  bool doorway = groundFloor && mod(cell.x + floor(seed * 11.0), 4.0) < 1.0;
  if (doorway) {
    vec2 doorPoint = vec2(p.x, h - 1.15);
    c = mix(c, uFrame * 0.85, boxMask(doorPoint, vec2(0.66, 1.2), pixel));
    c = mix(c, uDoor, boxMask(doorPoint, vec2(0.53, 1.1), pixel));
    c = mix(c, uGlass, boxMask(doorPoint - vec2(0.0, 0.5), vec2(0.35, 0.35), pixel));
  } else {
    // Wide shopfronts on some apartment/office ground floors.
    if (groundFloor && (family == 1 || family == 2)) halfWindow = vec2(bayWidth * 0.38, 0.95);
    if (family == 0 && choice < uFamilyShares[0] * uShutterShare) {
      vec2 shutterPoint = vec2(abs(p.x) - halfWindow.x - 0.3, p.y);
      float shutter = boxMask(shutterPoint, vec2(0.22, halfWindow.y + 0.04), pixel);
      float slats = smoothstep(0.12, 0.3, fract(p.y * 7.0));
      c = mix(c, uShutter * (0.9 + 0.1 * slats), shutter);
    }
    c = mix(c, uFrame, boxMask(p, halfWindow + 0.09, pixel));
    vec3 glass = uGlass * (0.8 + variation * 0.35);
    glass = mix(glass, uFrame, 0.08 + 0.12 * smoothstep(-halfWindow.y, halfWindow.y, p.y));
    c = mix(c, glass, boxMask(p, halfWindow, pixel));
    // Divided panes and a shallow sill make windows read at street distance.
    float pane = boxMask(p, halfWindow, pixel);
    float mullion = 1.0 - smoothstep(0.025, 0.025 + pixel, abs(p.x));
    if (family == 0 || family == 3) {
      mullion = max(mullion, 1.0 - smoothstep(0.025, 0.025 + pixel, abs(p.y - halfWindow.y * 0.3)));
    }
    c = mix(c, uFrame * 0.9, pane * mullion);
    c = mix(c, uFrame * 0.8, boxMask(p + vec2(0.0, halfWindow.y + 0.13), vec2(halfWindow.x + 0.14, 0.055), pixel));
    // Small flower boxes are the cartoon accent, only on occasional upper windows.
    if (family == 0 && !groundFloor && variation < uFlowerShare) {
      vec2 flowerPoint = p + vec2(0.0, halfWindow.y + 0.06);
      c = mix(c, uShutter, boxMask(flowerPoint, vec2(halfWindow.x, 0.13), pixel));
      c = mix(c, uPetal, boxMask(flowerPoint - vec2(0.0, 0.09), vec2(halfWindow.x * 0.8, 0.06), pixel));
    }
  }
  if (family == 0) {
    float ledge = 1.0 - smoothstep(0.025, 0.025 + pixel, abs(p.y + floorHeight * 0.5));
    c = mix(c, plaster * 0.85, ledge);
  }
  float blur = smoothstep(0.18, 0.75, max(fwidth(u) / bayWidth, fwidth(h) / floorHeight));
  return mix(c, mix(plaster, uGlass, family == 2 ? 0.4 : 0.2), blur);
}
// No windows on bridges: asphalt deck, concrete sides with panel seams, darker underside.
vec3 bridgeColour(vec3 n) {
  if (n.y > uFlatRoof) return uBridgeDeck;
  if (n.y < -uWallLimit) return uBridgeUnderside;
  float seam = 1.0 - smoothstep(0.03, 0.08, fract(vLocal.y / 0.9));
  float fade = smoothstep(0.2, 0.6, fwidth(vLocal.y / 0.9));
  return uBridge * mix(1.0 - 0.12 * seam, 0.97, fade);
}
// Messe-style landmark: twisted aluminium bands above a glazed ground floor.
vec3 metalColour(vec3 n, float base) {
  if (n.y > uFlatRoof) return uGravelRoof;
  if (n.y < -uWallLimit) return uSoffit;
  float u = abs(n.x) > abs(n.z) ? vLocal.z : vLocal.x;
  float h = vLocal.y - base;
  if (h < 4.5) {
    float mullion = 1.0 - smoothstep(0.04, 0.09, abs(fract(u / 1.5) - 0.5) * 1.5);
    return mix(uMetalGlass, uMetalBand * 0.8, mullion);
  }
  float band = floor(h / 1.4);
  float twist = 0.84 + 0.16 * sin(u * 0.32 + band * 1.9);
  float gap = smoothstep(0.0, 0.08, fract(h / 1.4)) * smoothstep(1.0, 0.92, fract(h / 1.4));
  vec3 c = uMetalBand * twist * mix(0.55, 1.0, gap);
  float fade = smoothstep(0.2, 0.6, fwidth(h / 1.4));
  return mix(c, uMetalBand * 0.88, fade);
}
vec3 roofColour(vec3 n, float seed) {
  float choice = styleHash(vec2(seed, 9.0));
  if (abs(n.y) < uFlatRoof) {
    vec3 tiles = choice < uSlateRoofShare ? uSlateRoof : uTileRoof;
    tiles *= 0.88 + 0.24 * styleHash(vec2(seed, 2.0));
    vec2 grid = vec2((vLocal.x + vLocal.z) / 0.32, vLocal.y / 0.22);
    grid.x += mod(floor(grid.y), 2.0) * 0.5;
    vec2 seam = smoothstep(vec2(0.035), vec2(0.12), fract(grid));
    float detail = min(seam.x, seam.y);
    float fade = smoothstep(0.2, 0.8, max(fwidth(grid.x), fwidth(grid.y)));
    return tiles * mix(0.86 + 0.14 * detail, 0.96, fade);
  }
  vec3 roof = choice < uGreenRoofShare ? uGreenRoof
    : choice < 0.6 ? uGravelRoof : uBitumenRoof;
  float grain = styleHash(floor(vLocal.xz * 3.0));
  float fade = smoothstep(0.1, 0.5, max(fwidth(vLocal.x), fwidth(vLocal.z)));
  return roof * mix(0.94 + grain * 0.12, 1.0, fade);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  vec3 viewNormal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  vec3 n = normalize((vec4(viewNormal, 0.0) * viewMatrix).xyz);
  vec3 styled = vBuilding.z > 1.5 ? metalColour(n, vBuilding.y)
    : vBuilding.z > 0.5 ? bridgeColour(n)
    : abs(n.y) < uWallLimit ? wallColour(n, vBuilding.x, vBuilding.y)
    : roofColour(n, vBuilding.x);
  diffuseColor.rgb = styled;
}`,
      );
  };
  material.customProgramCacheKey = () => "basel-building-style-v4";
  return material;
}

/** Style only meshes carrying the converter's per-building metadata. */
export function styleBuildings(model: THREE.Object3D): void {
  const material = createBuildingMaterial();
  model.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.geometry.hasAttribute("_building")
    ) {
      object.material = material;
    }
  });
}
