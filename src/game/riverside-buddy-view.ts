import * as THREE from "three";
import { themeColor, box, ball, label } from "./characters.ts";
import { riversideBuddyPose } from "./riverside-buddy.ts";
import type { CityState } from "../interfaces.ts";

/** Outfit-inspired procedural cartoon: no photograph or external likeness texture. */
export function createRiversideBuddy() {
  const root = new THREE.Group();
  root.name = "riverside-buddy";
  const body = new THREE.Group();
  root.add(body);
  const cylinder = (
    parent: THREE.Group,
    radius: number,
    length: number,
    position: number[],
    color: string,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 10),
      new THREE.MeshLambertMaterial({ color: themeColor(color) }),
    );
    mesh.position.set(position[0], position[1], position[2]);
    parent.add(mesh);
    return mesh;
  };
  const torso = box(body, [0.8, 0.72, 0.48], [0, 1.25, 0], "buddy-hoodie");
  torso.name = "tan-hoodie";
  const hood = ball(body, 0.29, [0, 1.6, -0.08], "buddy-hoodie");
  hood.scale.set(1.15, 0.9, 0.8);
  box(body, [0.35, 0.25, 0.025], [0, 1.33, 0.252], "buddy-shoe");
  box(body, [0.44, 0.15, 0.035], [0, 1.02, 0.253], "buddy-hoodie-shadow");
  for (const x of [-0.09, 0.09])
    cylinder(body, 0.012, 0.25, [x, 1.49, 0.28], "white");
  cylinder(body, 0.09, 0.14, [0, 1.65, 0.03], "skin");
  const head = ball(body, 0.265, [0, 1.91, 0.04], "skin");
  head.scale.set(0.9, 1.15, 0.92);
  const hair = ball(body, 0.26, [0, 2.095, 0], "buddy-hair");
  hair.scale.set(0.95, 0.52, 0.94);
  for (let i = 0; i < 5; i++)
    ball(
      body,
      0.09,
      [(i - 2) * 0.085, 2.15 + Math.sin(i) * 0.02, 0.12],
      "buddy-hair",
    );
  for (const x of [-0.092, 0.092]) {
    const eye = ball(body, 0.038, [x, 1.94, 0.26], "white");
    eye.scale.y = 0.8;
    ball(body, 0.019, [x, 1.94, 0.289], "buddy-shoe");
    const brow = box(
      body,
      [0.09, 0.022, 0.018],
      [x, 2.006, 0.257],
      "buddy-hair",
    );
    brow.rotation.z = x * -0.7;
  }
  ball(body, 0.04, [0, 1.87, 0.299], "skin");
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.076, 0.012, 5, 12, Math.PI),
    new THREE.MeshLambertMaterial({ color: themeColor("buddy-hair") }),
  );
  smile.rotation.z = Math.PI;
  smile.position.set(0, 1.83, 0.27);
  body.add(smile);
  const legs = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.24, 0.89, 0);
    body.add(pivot);
    cylinder(pivot, 0.225, 0.7, [0, -0.33, 0], "buddy-jeans");
    box(pivot, [0.46, 0.24, 0.72], [0, -0.75, 0.16], "buddy-shoe");
    box(pivot, [0.48, 0.075, 0.73], [0, -0.86, 0.16], "buddy-sole");
    for (let j = 0; j < 3; j++)
      box(
        pivot,
        [0.19, 0.015, 0.025],
        [0, -0.617, 0.19 + j * 0.065],
        "buddy-sole",
      );
    pivot.name = side < 0 ? "buddy-left-leg" : "buddy-right-leg";
    return pivot;
  });
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.48, 1.57, 0);
    body.add(shoulder);
    cylinder(shoulder, 0.125, 0.36, [0, -0.17, 0], "buddy-hoodie");
    const elbow = new THREE.Group();
    elbow.position.y = -0.35;
    shoulder.add(elbow);
    cylinder(elbow, 0.11, 0.29, [0, -0.14, 0], "buddy-hoodie");
    const hand = new THREE.Group();
    hand.position.y = -0.32;
    elbow.add(hand);
    ball(hand, 0.1, [0, 0, 0], "skin");
    return { shoulder, elbow, hand };
  });
  const can = new THREE.Group();
  can.name = "buddy-beer";
  arms[1].hand.add(can);
  cylinder(can, 0.085, 0.25, [0, 0.085, 0.03], "buddy-can");
  cylinder(can, 0.087, 0.025, [0, 0.22, 0.03], "buddy-sole");
  box(can, [0.105, 0.1, 0.018], [0, 0.08, 0.113], "white");
  const cigarette = new THREE.Group();
  cigarette.name = "buddy-cigarette";
  arms[0].hand.add(cigarette);
  const paper = cylinder(cigarette, 0.016, 0.2, [0, 0, 0.09], "white");
  paper.rotation.x = Math.PI / 2;
  const tip = cylinder(cigarette, 0.017, 0.025, [0, 0, 0.2], "coral");
  tip.rotation.x = Math.PI / 2;
  const rollingPaper = box(
    arms[1].hand,
    [0.18, 0.009, 0.13],
    [0, 0, 0.1],
    "white",
  );
  rollingPaper.name = "buddy-rolling-paper";
  const smoke = new THREE.Group();
  smoke.name = "buddy-smoke";
  root.add(smoke);
  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: themeColor("white"),
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 5),
      smokeMaterial.clone(),
    );
    smoke.add(puff);
  }
  let bubble = label("Small steps. Big difference!", true);
  bubble.name = "speech-buddy";
  bubble.position.y = 2.9;
  root.add(bubble);
  let message = "";
  return {
    root,
    update(s: CityState, groundAt: (x: number, z: number) => number) {
      const pose = riversideBuddyPose(s);
      root.position.set(pose.x, groundAt(pose.x, pose.z), pose.z);
      root.rotation.y = pose.facing;
      root.userData.activity = pose.activity;
      const walking = pose.activity === "walk";
      const gait = walking ? Math.sin(pose.walkingTime * 5) : 0;
      body.position.y = walking ? Math.abs(gait) * 0.035 : 0;
      legs.forEach((leg, i) => (leg.rotation.x = gait * (i ? -0.34 : 0.34)));
      arms.forEach(({ shoulder, elbow, hand }, i) => {
        hand.rotation.set(0, 0, 0);
        shoulder.rotation.set(gait * (i ? 0.22 : -0.22), 0, i ? 0.08 : -0.08);
        elbow.rotation.set(-0.08, 0, 0);
      });
      can.visible = pose.activity !== "roll";
      can.rotation.set(0, 0, 0);
      cigarette.visible = pose.activity === "roll" || pose.activity === "smoke";
      rollingPaper.visible = pose.activity === "roll";
      smoke.visible = pose.activity === "smoke";
      const gesture = Math.sin(
        Math.PI * Math.min(1, Math.max(0, pose.progress)),
      );
      if (pose.activity === "sip") {
        arms[1].shoulder.rotation.x = -0.9 * gesture;
        arms[1].elbow.rotation.x = -1.7 * gesture;
        arms[1].shoulder.rotation.y = -0.9 * gesture;
        arms[1].hand.rotation.x = 2.6 * gesture;
        can.rotation.x = -0.35 * gesture;
        body.rotation.x = -0.025 * gesture;
      } else if (pose.activity === "roll") {
        arms.forEach(({ shoulder, elbow }, i) => {
          shoulder.rotation.set(-0.8, i ? -0.8 : 0.8, i ? -0.7 : 0.7);
          elbow.rotation.set(-0.6, 0, Math.sin(s.elapsed * 8) * 0.08);
        });
      } else if (pose.activity === "smoke") {
        const puff = 0.7 + 0.3 * Math.sin(s.elapsed * 1.3);
        arms[0].shoulder.rotation.x = -0.9 * puff;
        arms[0].elbow.rotation.x = -1.65 * puff;
        arms[0].shoulder.rotation.y = 0.85 * puff;
        arms[0].hand.rotation.x = 2.55 * puff;
        smoke.children.forEach((object, i) => {
          const t = (s.elapsed * 0.45 + i / 5) % 1;
          object.position.set(
            -0.12 + Math.sin(s.elapsed + i) * 0.05,
            1.85 + t * 0.65,
            0.35 + t * 0.1,
          );
          object.scale.setScalar(0.5 + t * 2);
          (
            object as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
          ).material.opacity = (1 - t) * 0.2;
        });
      } else if (pose.activity === "cheer") {
        arms.forEach(({ shoulder, elbow }, i) => {
          shoulder.rotation.z =
            (i ? 1 : -1) * (2.5 + Math.sin(s.elapsed * 5) * 0.15);
          elbow.rotation.x = -0.3;
        });
        body.position.y = Math.abs(Math.sin(s.elapsed * 5)) * 0.15;
      }
      if (pose.activity !== "sip") body.rotation.x = 0;
      if (message !== pose.message) {
        root.remove(bubble);
        bubble.material.map?.dispose();
        bubble.material.dispose();
        bubble = label(pose.message, true);
        bubble.name = "speech-buddy";
        bubble.position.y = 2.9;
        root.add(bubble);
        message = pose.message;
      }
    },
  };
}
