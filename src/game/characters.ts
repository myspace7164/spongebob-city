import * as THREE from "three";

export function themeColor(name: string): THREE.Color {
  return new THREE.Color(
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim(),
  );
}

/** Small procedural props share the theme palette and need no external assets. */
export function box(
  group: THREE.Group,
  size: number[],
  at: number[],
  color: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshLambertMaterial({ color: themeColor(color) }),
  );
  mesh.position.set(at[0], at[1], at[2]);
  group.add(mesh);
  return mesh;
}
export function ball(
  group: THREE.Group,
  radius: number,
  at: number[],
  color: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 8),
    new THREE.MeshLambertMaterial({ color: themeColor(color) }),
  );
  mesh.position.set(at[0], at[1], at[2]);
  group.add(mesh);
  return mesh;
}

export function makeCharacter(
  kind: "sponge" | "patrick" | "sandy" | "squid" | "krabs" | "beton",
): THREE.Group {
  const g = new THREE.Group();
  if (kind === "sponge") {
    box(g, [1.1, 1.05, 0.5], [0, 1.45, 0], "sponge");
    box(g, [1.1, 0.18, 0.52], [0, 0.85, 0], "white");
    box(g, [1.1, 0.3, 0.52], [0, 0.61, 0], "wood");
    box(g, [0.12, 0.23, 0.04], [0, 0.79, 0.28], "coral");
    for (const x of [-0.27, 0.27]) {
      ball(g, 0.24, [x, 1.65, 0.27], "white");
      ball(g, 0.105, [x, 1.65, 0.46], "water");
      ball(g, 0.05, [x, 1.65, 0.54], "ink");
      box(g, [0.12, 0.35, 0.12], [x, 0.32, 0], "sponge").name =
        `${x < 0 ? "right" : "left"}-leg-mesh`;
      box(g, [0.29, 0.16, 0.35], [x, 0.08, 0.06], "ink").name =
        `${x < 0 ? "right" : "left"}-shoe`;
      box(g, [0.12, 0.55, 0.12], [x * 2.35, 1.02, 0], "sponge").name =
        `${x < 0 ? "right" : "left"}-arm-mesh`;
      ball(g, 0.09, [x * 1.6, 1.2, 0.265], "pore");
    }
    box(g, [0.42, 0.05, 0.04], [0, 1.19, 0.29], "ink");
    box(g, [0.14, 0.15, 0.06], [-0.1, 1.1, 0.28], "tooth");
    box(g, [0.14, 0.15, 0.06], [0.1, 1.1, 0.28], "tooth");
    ball(g, 0.1, [0, 1.42, 0.32], "sponge");
    for (const [x, y] of [
      [-0.42, 1.86],
      [0.4, 1.05],
      [-0.36, 1.42],
    ])
      ball(g, 0.065, [x, y, 0.25], "pore");
    return g;
  }
  const color = {
    patrick: "pink",
    sandy: "white",
    squid: "squid",
    krabs: "coral",
    beton: "concrete",
  }[kind];
  const body = ball(g, 0.5, [0, 0.95, 0], color);
  body.scale.y = 1.25;
  ball(
    g,
    kind === "squid" ? 0.5 : 0.36,
    [0, 1.67, 0],
    kind === "sandy" ? "wood" : color,
  );
  for (const x of [-0.18, 0.18]) {
    box(g, [0.17, 0.4, 0.17], [x, 0.3, 0], color);
    ball(g, 0.11, [x, 1.73, 0.34], "white");
    ball(g, 0.045, [x, 1.73, 0.43], "ink");
    const arm = box(g, [0.19, 0.6, 0.2], [x * 3.4, 1.02, 0], color);
    arm.rotation.z = x > 0 ? 0.6 : -0.6;
  }
  if (kind === "patrick") box(g, [0.78, 0.32, 0.65], [0, 0.62, 0], "grass");
  if (kind === "squid") {
    ball(g, 0.14, [0, 1.58, 0.49], "squid");
    box(g, [0.7, 0.45, 0.6], [0, 1, 0], "wood");
  }
  if (kind === "krabs") {
    for (const x of [-0.7, 0.7]) ball(g, 0.25, [x, 1.3, 0], "coral");
    box(g, [0.7, 0.4, 0.6], [0, 0.62, 0], "water");
  }
  if (kind === "beton") {
    body.material = new THREE.MeshLambertMaterial({
      color: themeColor("villain-coat"),
    });
    box(g, [0.85, 0.2, 0.7], [0, 2.02, 0], "villain-coat");
    box(g, [0.48, 0.13, 0.04], [0, 1.46, 0.39], "ink");
    for (const x of [-0.18, 0.18]) {
      const brow = box(g, [0.3, 0.085, 0.07], [x, 1.89, 0.4], "villain-coat");
      brow.rotation.z = x < 0 ? -0.35 : 0.35;
      const eye = ball(g, 0.078, [x, 1.73, 0.445], "villain-eye");
      eye.name = "evil-eye";
      const tooth = box(g, [0.06, 0.08, 0.045], [x * 0.7, 1.46, 0.43], "white");
      tooth.rotation.z = x < 0 ? -0.2 : 0.2;
    }
    const cape = box(g, [0.88, 0.9, 0.08], [0, 0.95, -0.45], "villain-coat");
    cape.rotation.x = -0.15;
    for (const x of [-0.26, 0.26]) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.3, 4),
        new THREE.MeshLambertMaterial({ color: themeColor("villain-coat") }),
      );
      spike.position.set(x, 2.22, 0);
      g.add(spike);
    }
  }
  if (kind === "sandy") {
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.54, 16, 12),
      new THREE.MeshLambertMaterial({
        color: themeColor("water"),
        transparent: true,
        opacity: 0.16,
      }),
    );
    helmet.position.y = 1.7;
    g.add(helmet);
    ball(g, 0.13, [0.3, 2.16, 0], "pink");
  }
  return g;
}

export function label(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `#${themeColor("ink").getHexString()}`;
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = `#${themeColor("white").getHexString()}`;
  ctx.font = `600 29px ${getComputedStyle(document.documentElement).getPropertyValue("--font")}`;
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 59);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      depthTest: false,
    }),
  );
  sprite.scale.set(4.5, 0.84, 1);
  return sprite;
}
