import { mapConfig } from "../../config/map";
import type { RoadNetwork } from "../interfaces";
import { imageToMap, mapToImage, nearestStreet } from "../game/level-builder";

/** A level area picked on the map: start point, street direction, size and name. */
export interface AreaChoice {
  start: [number, number];
  forward: [number, number];
  width: number;
  length: number;
  name: string;
}
/** An existing level area to outline, as map-local corner points. */
export interface AreaOutline {
  label: string;
  corners: [number, number][];
  current: boolean;
}

let roads: Promise<RoadNetwork> | undefined;

/** Map-local corners of an area: `length` ahead of the start, 8 m behind, centred width. */
export function areaCorners(c: AreaChoice): [number, number][] {
  const n = Math.hypot(...c.forward) || 1;
  const [fx, fz] = [c.forward[0] / n, c.forward[1] / n];
  const [rx, rz] = [-fz, fx]; // right of the street direction
  const at = (along: number, across: number): [number, number] => [
    c.start[0] + fx * along + rx * across,
    c.start[1] + fz * along + rz * across,
  ];
  const h = c.width / 2;
  return [at(-8, -h), at(c.length, -h), at(c.length, h), at(-8, h)];
}

/**
 * Full-screen Basel aerial map to choose a level's area: press at the start,
 * drag along the street; wheel zooms, right-drag pans. Calls `onChoose` on "Go there".
 */
export function openAreaMap(options: {
  initial: AreaChoice;
  areas: AreaOutline[];
  onChoose: (choice: AreaChoice) => void;
}) {
  roads ??= fetch(mapConfig.roadsUrl).then((r) => r.json());
  const choice: AreaChoice = { ...options.initial };
  let nameEdited = false;
  const overlay = document.createElement("div");
  overlay.id = "area-map";
  overlay.innerHTML = `
    <canvas></canvas>
    <aside>
      <h2>Choose the level's area</h2>
      <p class="small">Press where the level starts and drag along the street. Wheel: zoom · right-drag: move the map.</p>
      <label>Name <input id="am-name" maxlength="40" /></label>
      <label>Width <input id="am-width" type="range" min="20" max="60" step="1" /> <span id="am-width-value"></span></label>
      <p id="am-length" class="small"></p>
      <p id="am-hover" class="small"></p>
      <div class="lb-actions">
        <button type="button" id="am-go">Go there</button>
        <button type="button" id="am-cancel">Cancel</button>
      </div>
    </aside>`;
  document.body.append(overlay);
  const canvas = overlay.querySelector("canvas")!;
  const ctx = canvas.getContext("2d")!;
  const $ = <T extends HTMLElement>(id: string) =>
    overlay.querySelector<T>(`#${id}`)!;
  const name = $<HTMLInputElement>("am-name");
  const width = $<HTMLInputElement>("am-width");
  name.value = choice.name;
  width.value = String(choice.width);
  name.addEventListener("input", () => (nameEdited = true));
  width.addEventListener("input", () => {
    choice.width = Number(width.value);
    draw();
  });

  const image = new Image();
  image.src = mapConfig.imageryUrl;
  let bounds: [number, number, number, number] | undefined;
  void roads.then((network) => {
    bounds = network.bounds;
    draw();
  });
  // View: map-local metres → canvas pixels.
  let scale = 1,
    offsetX = 0,
    offsetY = 0;
  const fit = () => {
    canvas.width = overlay.clientWidth;
    canvas.height = overlay.clientHeight;
    if (!bounds) return;
    const [left, back, right, front] = bounds;
    scale =
      Math.min(canvas.width / (right - left), canvas.height / (front - back)) *
      2;
    // Start centred on the current area.
    offsetX = canvas.width / 2 - (choice.start[0] - left) * scale;
    offsetY = canvas.height / 2 - (choice.start[1] - back) * scale;
  };
  const toCanvas = ([x, z]: [number, number]): [number, number] => [
    offsetX + (x - bounds![0]) * scale,
    offsetY + (z - bounds![1]) * scale,
  ];
  const toMap = (px: number, py: number): [number, number] => [
    bounds![0] + (px - offsetX) / scale,
    bounds![1] + (py - offsetY) / scale,
  ];

  function polygon(corners: [number, number][], stroke: string, fill: string) {
    ctx.beginPath();
    corners
      .map(toCanvas)
      .forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  function draw() {
    if (!bounds) return;
    ctx.fillStyle = "#1b2430";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (image.complete && image.naturalWidth) {
      const [x0, y0] = toCanvas(imageToMap(bounds, 0, 0));
      const [x1, y1] = toCanvas(imageToMap(bounds, 1, 1));
      ctx.drawImage(image, x0, y0, x1 - x0, y1 - y0);
    }
    ctx.font = "600 15px system-ui, sans-serif";
    for (const area of options.areas) {
      if (area.current) continue;
      polygon(area.corners, "#ffffff", "rgba(255,255,255,0.18)");
      const [x, y] = toCanvas(area.corners[0]);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(area.label, x + 4, y - 6);
    }
    const corners = areaCorners(choice);
    polygon(corners, "#ffd400", "rgba(255,212,0,0.28)");
    // Start marker and street-direction arrow.
    const [sx, sy] = toCanvas(choice.start);
    const n = Math.hypot(...choice.forward) || 1;
    const [ax, ay] = toCanvas([
      choice.start[0] + (choice.forward[0] / n) * Math.min(choice.length, 40),
      choice.start[1] + (choice.forward[1] / n) * Math.min(choice.length, 40),
    ]);
    ctx.strokeStyle = "#ff4fa0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.fillStyle = "#ff4fa0";
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.fill();
    $("am-width-value").textContent = `${choice.width} m`;
    $("am-length").textContent =
      `Length ${Math.round(choice.length)} m ahead of the start.`;
  }
  image.addEventListener("load", draw);
  const resize = () => {
    fit();
    draw();
  };
  window.addEventListener("resize", resize);
  requestAnimationFrame(resize);

  let dragging: "pick" | "pan" | null = null;
  let last: [number, number] = [0, 0];
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("mousedown", (e) => {
    if (!bounds) return;
    last = [e.offsetX, e.offsetY];
    if (e.button === 2) {
      dragging = "pan";
      return;
    }
    dragging = "pick";
    choice.start = toMap(e.offsetX, e.offsetY);
    draw();
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!bounds) return;
    const here = toMap(e.offsetX, e.offsetY);
    void roads!.then((network) => {
      $("am-hover").textContent =
        `Street here: ${nearestStreet(network, ...here) ?? "—"}`;
    });
    if (dragging === "pan") {
      offsetX += e.offsetX - last[0];
      offsetY += e.offsetY - last[1];
      last = [e.offsetX, e.offsetY];
      draw();
    } else if (dragging === "pick") {
      const d: [number, number] = [
        here[0] - choice.start[0],
        here[1] - choice.start[1],
      ];
      if (Math.hypot(...d) > 3) {
        choice.forward = d;
        choice.length = Math.max(20, Math.min(300, Math.hypot(...d)));
      }
      draw();
    }
  });
  window.addEventListener("mouseup", () => {
    if (dragging === "pick" && !nameEdited) {
      // Suggest the street nearest to the middle of the chosen area.
      const n = Math.hypot(...choice.forward) || 1;
      const middle: [number, number] = [
        choice.start[0] + (choice.forward[0] / n) * (choice.length / 2),
        choice.start[1] + (choice.forward[1] / n) * (choice.length / 2),
      ];
      void roads!.then((network) => {
        name.value =
          nearestStreet(network, ...middle, 150) ??
          nearestStreet(network, ...choice.start, 150) ??
          name.value;
      });
    }
    dragging = null;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
      offsetX = e.offsetX - (e.offsetX - offsetX) * factor;
      offsetY = e.offsetY - (e.offsetY - offsetY) * factor;
      scale *= factor;
      draw();
    },
    { passive: false },
  );
  const close = () => {
    window.removeEventListener("resize", resize);
    overlay.remove();
  };
  $("am-cancel").addEventListener("click", close);
  $("am-go").addEventListener("click", () => {
    choice.name = name.value;
    close();
    options.onChoose({ ...choice });
  });
  return {
    close,
    mapToImage: (x: number, z: number) => mapToImage(bounds!, x, z),
  };
}
