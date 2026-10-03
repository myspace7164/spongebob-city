import * as THREE from "three";
import { equipmentConfig as c } from "../../config/equipment";
import { themeColor } from "./characters";

/** Split triangles into a pivot while preserving every morph/vertex attribute. */
function limb(
  model: THREE.Group,
  mesh: THREE.Mesh,
  name: string,
  pivot: THREE.Vector3,
  include: (point: THREE.Vector3) => boolean,
): THREE.Group {
  const joint = new THREE.Group();
  joint.name = name;
  joint.position.copy(pivot);
  model.add(joint);
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const matrix = new THREE.Matrix4()
    .copy(model.matrixWorld)
    .invert()
    .multiply(mesh.matrixWorld);
  const keep: number[] = [],
    selected: number[] = [];
  const center = new THREE.Vector3(),
    point = new THREE.Vector3();
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const triangle = [0, 1, 2].map((j) => (index ? index.getX(i + j) : i + j));
    center.set(0, 0, 0);
    triangle.forEach((id) =>
      center.add(point.fromBufferAttribute(position, id).applyMatrix4(matrix)),
    );
    (include(center.multiplyScalar(1 / 3)) ? selected : keep).push(...triangle);
  }
  if (!selected.length)
    throw new Error(`Character is missing ${name} geometry`);
  const part = mesh.clone();
  part.name = `${name}-mesh`;
  part.geometry = geometry.clone();
  part.geometry.setIndex(selected);
  part.geometry.clearGroups();
  matrix.decompose(part.position, part.quaternion, part.scale);
  part.position.sub(pivot);
  joint.add(part);
  geometry.setIndex(keep);
  geometry.clearGroups();
  return joint;
}

/** Runtime pivots animate the static GLB without losing Dry/WaterFull morphs. */
export function createLocomotion(model: THREE.Group, imported: boolean) {
  model.updateMatrixWorld(true);
  let leftArm: THREE.Group,
    rightArm: THREE.Group,
    leftLeg: THREE.Group,
    rightLeg: THREE.Group;
  if (imported) {
    const arm = model.getObjectByName("Cube_morph_export") as THREE.Mesh;
    const body = model.getObjectByName("Body_Cube_morph_export") as THREE.Mesh;
    if (!arm?.isMesh || !body?.isMesh)
      throw new Error(
        "Imported character limb names changed; check config/equipment.ts",
      );
    rightArm = limb(
      model,
      arm,
      "right-arm",
      new THREE.Vector3(
        -c.importedShoulderX,
        c.importedShoulderY,
        c.importedShoulderZ,
      ),
      (p) => p.x < 0,
    );
    leftArm = limb(
      model,
      arm,
      "left-arm",
      new THREE.Vector3(
        c.importedShoulderX,
        c.importedShoulderY,
        c.importedShoulderZ,
      ),
      (p) => p.x >= 0,
    );
    rightLeg = limb(
      model,
      body,
      "right-leg",
      new THREE.Vector3(-c.importedHipX, c.importedHipY, -0.13),
      (p) => p.y < c.importedHipY && p.x < 0,
    );
    leftLeg = limb(
      model,
      body,
      "left-leg",
      new THREE.Vector3(c.importedHipX, c.importedHipY, -0.13),
      (p) => p.y < c.importedHipY && p.x >= 0,
    );
    for (const [name, leg] of [
      ["Shoe_cube002", rightLeg],
      ["Shoe_cube003", leftLeg],
    ] as const) {
      const shoe = model.getObjectByName(name);
      if (shoe) leg.attach(shoe);
    }
    model.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        ["Cube004", "Cube006"].includes(object.name)
      ) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        object.material = materials.map((material) => {
          const white = material.clone() as THREE.MeshStandardMaterial;
          white.color.copy(themeColor("tooth"));
          return white;
        });
        if (!Array.isArray(object.material) || materials.length === 1)
          object.material = object.material[0];
        object.userData.whiteTooth = true;
      }
    });
  } else {
    const pivot = (name: string, x: number, y: number) => {
      const joint = new THREE.Group();
      joint.name = name;
      joint.position.set(x, y, 0);
      model.add(joint);
      const mesh = model.getObjectByName(`${name}-mesh`)!;
      joint.attach(mesh);
      return joint;
    };
    rightArm = pivot("right-arm", -0.6345, 1.28);
    leftArm = pivot("left-arm", 0.6345, 1.28);
    rightLeg = pivot("right-leg", -0.27, 0.5);
    leftLeg = pivot("left-leg", 0.27, 0.5);
    for (const [name, leg] of [
      ["right-shoe", rightLeg],
      ["left-shoe", leftLeg],
    ] as const)
      leg.attach(model.getObjectByName(name)!);
  }
  const rightHand = new THREE.Group();
  rightHand.name = "right-hand-equipment";
  const hand = imported ? c.importedHand : c.fallbackHand;
  rightHand.position.set(hand[0], hand[1], hand[2]);
  rightArm.add(rightHand);
  const update = (time: number, speed: number, grounded: boolean) => {
    const moving = speed > c.idleSpeed;
    const sprint = speed > 6;
    const swing =
      moving && grounded
        ? Math.sin(time * (sprint ? c.sprintFrequency : c.walkingFrequency)) *
          (sprint ? c.sprintSwing : c.walkingSwing) *
          Math.min(1, speed / 3)
        : 0;
    rightArm.rotation.set(swing, 0, imported ? c.relaxedArmAngle : 0);
    leftArm.rotation.set(-swing, 0, imported ? -c.relaxedArmAngle : 0);
    rightLeg.rotation.x = -swing;
    leftLeg.rotation.x = swing;
    model.userData.gait = moving ? (sprint ? "sprint" : "walk") : "idle";
  };
  update(0, 0, true);
  return { rightHand, update };
}
