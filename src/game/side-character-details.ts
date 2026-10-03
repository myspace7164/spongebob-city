import * as THREE from "three";

export type SideCharacter = "patrick" | "sandy" | "squid" | "krabs";

let castGrain: THREE.CanvasTexture | undefined;

function colorToken(name: string): THREE.Color {
  return new THREE.Color(
    getComputedStyle(document.documentElement)
      .getPropertyValue(`--${name}`)
      .trim(),
  );
}

function grainTexture(): THREE.CanvasTexture {
  if (castGrain) return castGrain;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(64, 64);
  let seed = 49043;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 48271) % 2147483647;
    const grain = 218 + Math.floor((seed / 2147483647) * 38);
    image.data[i] = grain;
    image.data[i + 1] = grain;
    image.data[i + 2] = grain;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  castGrain = new THREE.CanvasTexture(canvas);
  castGrain.colorSpace = THREE.SRGBColorSpace;
  castGrain.wrapS = castGrain.wrapT = THREE.RepeatWrapping;
  castGrain.repeat.set(2, 2);
  castGrain.anisotropy = 4;
  return castGrain;
}

function detailMaterial(
  color: THREE.ColorRepresentation,
  roughness = 0.62,
  metalness = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function detailMesh(
  root: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  root.add(mesh);
  return mesh;
}

function addBox(
  root: THREE.Group,
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
): THREE.Mesh {
  return detailMesh(
    root,
    new THREE.BoxGeometry(...size),
    material,
    name,
    position,
  );
}

function addBall(
  root: THREE.Group,
  name: string,
  radius: number,
  position: [number, number, number],
  material: THREE.Material,
  scale?: [number, number, number],
): THREE.Mesh {
  const mesh = detailMesh(
    root,
    new THREE.SphereGeometry(radius, 12, 10),
    material,
    name,
    position,
  );
  if (scale) mesh.scale.set(...scale);
  return mesh;
}

function finishMaterials(root: THREE.Group): void {
  const grain = grainTexture();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const replace = (source: THREE.Material): THREE.Material => {
      const sourceColor =
        "color" in source && source.color instanceof THREE.Color
          ? source.color
          : new THREE.Color("white");
      let material: THREE.Material;
      if ("transparent" in source && source.transparent) {
        material = new THREE.MeshPhysicalMaterial({
          color: sourceColor,
          transparent: true,
          opacity: "opacity" in source ? source.opacity : 0.18,
          roughness: 0.12,
          metalness: 0.04,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          depthWrite: false,
        });
      } else {
        material = new THREE.MeshStandardMaterial({
          color: sourceColor,
          map: grain,
          bumpMap: grain,
          bumpScale: 0.012,
          roughness: 0.74,
          metalness: 0.02,
        });
      }
      source.dispose();
      return material;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(replace)
      : replace(object.material);
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

function addPatrickDetails(root: THREE.Group): void {
  const seam = detailMaterial(0x9dba45, 0.76);
  const skin = detailMaterial(0xe97f9b, 0.88);
  addBox(
    root,
    "Patrick_Shorts_Waistband",
    [0.76, 0.065, 0.045],
    [0, 0.79, 0.34],
    seam,
  );
  for (const x of [-0.25, 0.25])
    addBox(
      root,
      "Patrick_Shorts_Seam",
      [0.024, 0.24, 0.02],
      [x, 0.61, 0.337],
      seam,
    );
  addBall(
    root,
    "Patrick_Belly_Button",
    0.035,
    [0, 1.0, 0.49],
    skin,
    [1, 0.78, 0.42],
  );
  for (const side of [-1, 1])
    for (const [dx, dy] of [
      [0.24, 0.03],
      [0.29, -0.015],
      [0.2, -0.055],
    ])
      addBall(
        root,
        "Patrick_Freckle",
        0.016,
        [side * dx, 1.67 + dy, 0.347],
        skin,
      );
}

function addSandyDetails(root: THREE.Group): void {
  const visor = detailMaterial(colorToken("water"), 0.16, 0.14);
  const metal = detailMaterial(0x9eabb2, 0.32, 0.68);
  const suit = detailMaterial(0x45aab8, 0.52, 0.08);
  const trim = detailMaterial(0xe6d59a, 0.6, 0.12);
  const rim = detailMesh(
    root,
    new THREE.TorusGeometry(0.48, 0.018, 8, 32),
    visor,
    "Sandy_Helmet_Rim",
    [0, 1.7, 0.03],
  );
  const tank = detailMesh(
    root,
    new THREE.CylinderGeometry(0.13, 0.15, 0.55, 12),
    metal,
    "Sandy_Oxygen_Tank",
    [0, 1.13, -0.34],
  );
  tank.rotation.z = -0.04;
  addBox(root, "Sandy_Tank_Valve", [0.12, 0.08, 0.12], [0, 1.44, -0.34], metal);
  addBox(root, "Sandy_Chest_Panel", [0.28, 0.25, 0.055], [0, 0.98, 0.44], suit);
  addBox(root, "Sandy_Chest_Trim", [0.19, 0.035, 0.02], [0, 1.04, 0.475], trim);
  for (const x of [-0.12, 0.12])
    addBall(root, "Sandy_Chest_Bolt", 0.025, [x, 0.9, 0.475], metal);
  const hose = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 1.43, -0.25),
    new THREE.Vector3(0.32, 1.36, -0.2),
    new THREE.Vector3(0.34, 1.05, 0.04),
    new THREE.Vector3(0.22, 0.99, 0.4),
  ]);
  detailMesh(
    root,
    new THREE.TubeGeometry(hose, 18, 0.022, 6, false),
    trim,
    "Sandy_Oxygen_Hose",
    [0, 0, 0],
  );
}

function addSquidDetails(root: THREE.Group): void {
  const skin = detailMaterial(colorToken("squid"), 0.83);
  const shirt = detailMaterial(colorToken("white"), 0.82);
  const nose = detailMesh(
    root,
    new THREE.CylinderGeometry(0.035, 0.09, 0.3, 12),
    skin,
    "Thaddaeus_Nose_Bridge",
    [0, 1.58, 0.59],
  );
  nose.rotation.x = Math.PI / 2;
  addBox(
    root,
    "Thaddaeus_Shirt_Collar",
    [0.48, 0.055, 0.04],
    [0, 1.23, 0.31],
    shirt,
  );
  for (const side of [-1, 1])
    for (const y of [0.12, 0.25, 0.38, 0.49])
      addBall(
        root,
        "Thaddaeus_Tentacle_Sucker",
        0.027,
        [side * 0.18, y, 0.105],
        shirt,
      );
  addBox(
    root,
    "Thaddaeus_Shirt_Pocket",
    [0.14, 0.12, 0.025],
    [0.2, 0.96, 0.315],
    shirt,
  );
}

function addKrabsDetails(root: THREE.Group): void {
  const shell = detailMaterial(0xc74e45, 0.55);
  const belt = detailMaterial(0x272d35, 0.42, 0.26);
  const gold = detailMaterial(0xe9bd54, 0.34, 0.62);
  const eyestalk = detailMaterial(0xb8423f, 0.58);
  for (const x of [-0.3, -0.15, 0.15, 0.3])
    for (const y of [0.92, 1.12])
      addBall(
        root,
        "Krabs_Shell_Speckle",
        0.034,
        [x, y, 0.394],
        shell,
        [1, 1.25, 0.5],
      );
  addBox(root, "Krabs_Belt", [0.68, 0.075, 0.045], [0, 0.81, 0.33], belt);
  addBox(root, "Krabs_Belt_Buckle", [0.14, 0.13, 0.035], [0, 0.81, 0.36], gold);
  for (const x of [-0.18, 0.18]) {
    const stalk = detailMesh(
      root,
      new THREE.CylinderGeometry(0.045, 0.07, 0.26, 10),
      eyestalk,
      "Krabs_Eyestalk",
      [x, 1.83, 0.16],
    );
    stalk.rotation.z = x < 0 ? -0.08 : 0.08;
  }
  for (const x of [-1, 1]) {
    const pincer = detailMesh(
      root,
      new THREE.ConeGeometry(0.11, 0.27, 6),
      shell,
      "Krabs_Claw_Pincer",
      [x * 0.83, 1.3, 0.03],
    );
    pincer.rotation.z = x * 0.55;
    const thumb = detailMesh(
      root,
      new THREE.ConeGeometry(0.075, 0.2, 6),
      shell,
      "Krabs_Claw_Thumb",
      [x * 0.71, 1.17, 0.1],
    );
    thumb.rotation.z = -x * 0.72;
  }
}

/** Adds tactile surface materials and readable signature details to the existing cast. */
export function finishSideCharacter(
  root: THREE.Group,
  kind: SideCharacter,
): THREE.Group {
  finishMaterials(root);
  if (kind === "patrick") addPatrickDetails(root);
  else if (kind === "sandy") addSandyDetails(root);
  else if (kind === "squid") addSquidDetails(root);
  else addKrabsDetails(root);
  return root;
}
