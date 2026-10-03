import { mkdirSync, writeFileSync } from "node:fs";
const origin = [2611675.802, 1267176.766];
const candidates = [
  {
    id: "st-alban-vorstadt",
    name: "St. Alban-Vorstadt",
    x: 555.975,
    z: 163.952,
  },
  { id: "johanniter", name: "Johanniterstrasse", x: -842.03, z: -1025.836 },
  { id: "st-alban", name: "St. Alban-Kirchrain", x: 538.406, z: 39.345 },
  { id: "riehenring", name: "Riehenring", x: 428.15, z: -898.98 },
  {
    id: "matthaeus",
    name: "Klybeckstrasse · Matthäus",
    x: -165.629,
    z: -949.276,
  },
  { id: "st-johann", name: "St. Johanns-Ring", x: -1185.689, z: -1056.09 },
  { id: "aeschen", name: "Aeschenplatz", x: 122.555, z: 387.873 },
  { id: "clara", name: "Clarastrasse", x: 50.995, z: -741.887 },
];
mkdirSync("public/maps/risk", { recursive: true });
async function download(url, path) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`${r.status} ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (!b.subarray(1, 4).equals(Buffer.from("PNG")))
    throw Error(b.toString().slice(0, 300));
  writeFileSync(path, b);
}
const layers = [
  ["heat", "https://wms.geo.bs.ch/", "KL_HumanbioklimaSituation"],
  [
    "flood",
    "https://wms.geo.admin.ch/",
    "ch.bafu.gefaehrdungskarte-oberflaechenabfluss",
  ],
];
const evidence = [];
for (const candidate of candidates) {
  const e = origin[0] + candidate.x,
    n = origin[1] - candidate.z,
    bbox = [e - 400, n - 400, e + 400, n + 400];
  for (const [kind, base, layer] of layers) {
    const u = new URL(base);
    u.search = new URLSearchParams({
      SERVICE: "WMS",
      REQUEST: "GetMap",
      VERSION: "1.3.0",
      LAYERS: layer,
      STYLES: "",
      CRS: "EPSG:2056",
      BBOX: bbox.join(","),
      WIDTH: "160",
      HEIGHT: "160",
      FORMAT: "image/png",
      TRANSPARENT: "TRUE",
    });
    await download(u.href, `public/maps/risk/${candidate.id}-${kind}.png`);
    evidence.push({ site: candidate.id, kind, bbox, url: u.href });
  }
  console.log(candidate.id);
}
for (const [kind, base, layer] of layers) {
  const u = new URL(base);
  u.search = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetLegendGraphic",
    VERSION: "1.3.0",
    LAYER: layer,
    STYLE: "default",
    FORMAT: "image/png",
  });
  await download(
    kind === "flood"
      ? "https://api3.geo.admin.ch/static/images/legends/ch.bafu.gefaehrdungskarte-oberflaechenabfluss_en.png"
      : u.href,
    `public/maps/risk/${kind}-legend.png`,
  );
}
writeFileSync(
  "public/maps/risk/requests.json",
  JSON.stringify(
    {
      sampledAt: new Date().toISOString(),
      candidates,
      evidence,
      scaleNote:
        "800 m / 160 px = 5 m/px; approx 1:18,900 at 96 dpi. Area comparison only, not plot-level risk.",
    },
    null,
    2,
  ),
);
