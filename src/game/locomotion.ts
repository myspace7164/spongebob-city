import { emotePose } from "./emotes.ts";
import type { PlayerState } from "../interfaces.ts";
import * as THREE from "three";
import { equipmentConfig as c } from "../../config/equipment.ts";
import { themeColor } from "./characters.ts";

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

    // The exported shirt sleeves are separate GLB meshes. Keep them on the
    // same shoulder pivot as the matching arm triangles so the seam cannot
    // open when the arm swings. Spatial side is authoritative here: in this
    // model anatomical right is -X and left is +X.
    const sleeves: THREE.Mesh[] = [];
    model.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        materialsOf(object).some((material) =>
          material.name.startsWith("Sleeve "),
        )
      ) {
        const x = new THREE.Box3()
          .setFromObject(object)
          .getCenter(new THREE.Vector3()).x;
        // Two small sleeve-colored panels sit over the torso; only the two
        // meshes beside the shoulder anchors are the moving arm sleeves.
        if (Math.abs(x) > c.importedShoulderX * 0.45) sleeves.push(object);
      }
    });
    for (const sleeve of sleeves) {
      const bounds = new THREE.Box3().setFromObject(sleeve);
      const isRight = bounds.getCenter(new THREE.Vector3()).x < 0;
      (isRight ? rightArm : leftArm).attach(sleeve);
      sleeve.userData.attachedToLimb = isRight ? "right-arm" : "left-arm";
    }
    // Shift each complete pivot subtree, including the arm triangles, sleeve,
    // and later hand attachment, toward the torso. Moving only the sleeve
    // would open the sleeve/arm seam; moving the pivot keeps their local
    // relationship intact through Idle and Walk swings.
    rightArm.position.x += c.importedShoulderInset;
    leftArm.position.x -= c.importedShoulderInset;

    // Socks and their colored cuff rings are separate material meshes from
    // the leg/body mesh. Split each two-sided mesh by its triangle position,
    // then nest the pieces under the matching leg pivot just like the shoes.
    const legAccessories: THREE.Mesh[] = [];
    model.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        materialsOf(object).some((material) =>
          /^(sock|red ring|blue ring) export$/i.test(material.name),
        )
      )
        legAccessories.push(object);
    });
    for (const accessory of legAccessories) {
      const label = materialsOf(accessory)[0]?.name ?? "sock";
      for (const isRight of [true, false]) {
        const leg = isRight ? rightLeg : leftLeg;
        const hip = isRight
          ? new THREE.Vector3(-c.importedHipX, c.importedHipY, -0.13)
          : new THREE.Vector3(c.importedHipX, c.importedHipY, -0.13);
        const sockPart = limb(
          model,
          accessory,
          `${isRight ? "right" : "left"}-${label}`
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-"),
          hip,
          (point) => (isRight ? point.x < 0 : point.x >= 0),
        );
        leg.attach(sockPart);
        sockPart.userData.attachedToLimb = isRight ? "right-leg" : "left-leg";
      }
      accessory.visible = false;
    }

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
  const rightShoulderRestX = rightArm.position.x;
  const leftShoulderRestX = leftArm.position.x;
  const rightHand = new THREE.Group();
  rightHand.name = "right-hand-equipment";
  const hand = imported ? c.importedHand : c.fallbackHand;
  rightHand.position.set(hand[0], hand[1], hand[2]);
  rightArm.add(rightHand);
  const restPositionY = model.position.y,
    restScale = model.scale.clone(),
    restRotation = model.rotation.clone();
  const update = (
    time: number,
    speed: number,
    grounded: boolean,
    emote?: PlayerState["emote"],
    reducedMotion = false,
  ) => {
    model.position.y = restPositionY;
    model.scale.copy(restScale);
    model.rotation.copy(restRotation);
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
    if (imported) {
      const body = model.getObjectByName(
        "Body_Cube_morph_export",
      ) as THREE.Mesh;
      const waterFullIndex = body.morphTargetDictionary?.WaterFull;
      const waterFull =
        waterFullIndex === undefined
          ? 0
          : (body.morphTargetInfluences?.[waterFullIndex] ?? 0);
      const insetX = c.importedShoulderInset;
      const morphClearance = waterFull * 0.12;
      // WaterFull widens the torso. Let both sleeve/arm pivots track only a
      // small part of that expansion so the cuffs remain visible at the seam.
      rightArm.position.x = rightShoulderRestX - morphClearance;
      leftArm.position.x =
        leftShoulderRestX + c.importedLeftShoulderOutset + morphClearance;
    }
    rightLeg.rotation.set(-swing, 0, 0);
    leftLeg.rotation.set(swing, 0, 0);
    model.userData.gait = moving ? (sprint ? "sprint" : "walk") : "idle";
    if (emote) {
      const pose = emotePose(emote.id, reducedMotion ? 0.7 : emote.elapsed);
      for (const [joint, angles] of [
        [leftArm, pose.left],
        [rightArm, pose.right],
      ] as const) {
        joint.rotation.x += angles[0];
        joint.rotation.y += angles[1];
        joint.rotation.z += angles[2];
      }
      leftLeg.rotation.x += pose.leftLeg;
      rightLeg.rotation.x += pose.rightLeg;
      model.position.y += pose.bob;
      model.scale.y *= pose.squash;
      model.rotation.x += pose.lean;
      model.rotation.y += pose.yaw;
      model.rotation.z += pose.roll;
      model.userData.gait = `emote:${emote.id}`;
    }
  };
  update(0, 0, true);
  return { rightHand, update };
}

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}
