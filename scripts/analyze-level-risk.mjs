import { readFileSync, writeFileSync } from "node:fs";
import { pngPixels } from "./png-risk-pixels.mjs";
const requests = JSON.parse(
  readFileSync("public/maps/risk/requests.json", "utf8"),
);
const swatches = [
  [255, 189, 255],
  [223, 115, 255],
  [132, 0, 168],
];
const ranked = requests.candidates
  .map((site) => {
    const flood = pngPixels(
      readFileSync(`public/maps/risk/${site.id}-flood.png`),
    ).pixels;
    let floodWeighted = 0,
      floodCoverage = 0,
      landArea = 0;
    for (const [r, g, b, a] of flood) {
      if (a > 100 && b > 200 && r < 100 && g > 120) continue;
      landArea++;
      if (a < 100) continue;
      let best = Infinity,
        index = -1;
      swatches.forEach((c, i) => {
        const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
        if (d < best) {
          best = d;
          index = i;
        }
      });
      if (best < 3000) {
        floodCoverage += a / 255;
        floodWeighted += ((index + 1) * a) / 255;
      }
    }
    const heat = pngPixels(
      readFileSync(`public/maps/risk/${site.id}-heat.png`),
    ).pixels;
    let warm = 0,
      heatArea = 0;
    for (const [r, g, b, a] of heat) {
      if (a < 100) continue;
      heatArea++;
      if (r > 200 && g > 60 && b < 150) warm++;
    }
    return {
      ...site,
      floodCoverage: +(floodCoverage / landArea).toFixed(4),
      floodScore: +(floodWeighted / landArea).toFixed(4),
      warmColorShare: +(warm / heatArea).toFixed(4),
    };
  })
  .sort(
    (a, b) =>
      a.floodScore - b.floodScore || a.warmColorShare - b.warmColorShare,
  );
const minF = Math.min(...ranked.map((s) => s.floodScore)),
  maxF = Math.max(...ranked.map((s) => s.floodScore)),
  minH = Math.min(...ranked.map((s) => s.warmColorShare)),
  maxH = Math.max(...ranked.map((s) => s.warmColorShare));
for (const site of ranked)
  site.priority = +(
    (0.6 * (site.floodScore - minF)) / (maxF - minF) +
    (0.4 * (site.warmColorShare - minH)) / (maxH - minH)
  ).toFixed(4);
ranked.sort((a, b) => a.priority - b.priority);
writeFileSync(
  "public/maps/risk/ranking.json",
  JSON.stringify(
    {
      method:
        "800 m area samples; weighted coverage of the three overland-flow legend classes, excluding mapped water; 60% normalized flood-class coverage score plus 40% normalized heat warm-color coverage. Not temperatures or parcel-level predictions.",
      ranked,
    },
    null,
    2,
  ),
);
console.log(ranked);
