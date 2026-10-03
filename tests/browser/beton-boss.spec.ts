import { expect, test } from "@playwright/test";
import type * as THREE from "three";
import { cityLevels } from "../../config/levels.ts";

test("Dr. Beton and the Asphaltinator render as linked independent 3D boss assets with laser states", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.addStyleTag({
    content: "body > :not(canvas) { display: none !important; }",
  });
  const result = await page.evaluate(async (levelCount) => {
    const worldSource = await (await fetch("/src/game/world.ts")).text();
    const threePath = worldSource.match(/from\s+"([^"]*three[^"]+)"/)![1];
    const cityViewPath = "/src/game/city-view.ts";
    const campaignPath = "/src/game/campaign.ts";
    const playerPath = "/src/game/player.ts";
    const [THREE, { createCityView }, { createCampaign }, { createPlayer }] =
      await Promise.all([
        import(threePath),
        import(cityViewPath),
        import(campaignPath),
        import(playerPath),
      ]);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x31343a, 2));
    const state = createCampaign();
    const player = createPlayer();
    Object.assign(player.position, {
      x: state.saboteur.x,
      y: 0,
      z: state.saboteur.z + 5,
    });
    state.saboteur.facing = 0;
    const view = createCityView(scene, state);
    const canvas = document.querySelector("#game") as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(960, 640);
    const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 120);
    camera.position.set(state.saboteur.x + 8, 7, state.saboteur.z + 12);
    camera.lookAt(state.saboteur.x, 2, state.saboteur.z);
    const render = () => {
      view.update(state, player, null, 7, null, false);
      renderer.render(scene, camera);
    };
    const vehicle = scene.getObjectByName(
      "roaming-asphaltinator",
    ) as THREE.Group;
    const actor = scene.getObjectByName("dr-beton") as THREE.Group;
    const output = scene.getObjectByName("FX_ConcreteOutput");
    const driver = scene.getObjectByName("DrBeton_DriverPoint");
    render();
    const levelAppearance = [];
    for (let level = 0; level < levelCount; level += 1) {
      state.campaign!.level = level;
      render();
      levelAppearance.push({
        scale: actor.scale.x,
        browAngle: Math.abs(
          (actor.userData.brows as THREE.Mesh[])[0].rotation.z,
        ),
        eyeGlow: (
          (actor.userData.eyeMeshes as THREE.Mesh[])[0]
            .material as THREE.MeshStandardMaterial
        ).emissiveIntensity,
        darkCracks: (actor.userData.darkCracks as THREE.Mesh[]).filter(
          (crack) => crack.visible,
        ).length,
        glowingCracks: (actor.userData.glowCracks as THREE.Mesh[]).filter(
          (crack) => crack.visible,
        ).length,
        flames: (actor.userData.flameGroups as THREE.Group[]).filter(
          (flame) => flame.visible,
        ).length,
      });
    }
    state.campaign!.level = 0;
    render();
    const eyeMeshes = actor.userData.eyeMeshes as THREE.Mesh[];
    const baselineEyeIntensity = (
      eyeMeshes[0].material as THREE.MeshStandardMaterial
    ).emissiveIntensity;
    state.campaign!.activeModifier = "angryBeton";
    render();
    const angryEyeIntensity = (
      eyeMeshes[0].material as THREE.MeshStandardMaterial
    ).emissiveIntensity;
    const angryCracksVisible = (
      actor.userData.glowCracks as THREE.Mesh[]
    ).every((crack) => crack.visible);
    state.campaign!.activeModifier = null;
    render();
    const restoredEyeIntensity = (
      eyeMeshes[0].material as THREE.MeshStandardMaterial
    ).emissiveIntensity;
    const angerRestored =
      Math.abs(restoredEyeIntensity - baselineEyeIntensity) < 0.001;
    const anchored =
      actor
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(driver!.getWorldPosition(new THREE.Vector3())) < 0.001;
    let meshes = 0;
    vehicle.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes++;
    });
    const independentRoots =
      actor.parent === vehicle.parent && actor.parent !== vehicle;
    state.saboteur.phase = "approaching";
    state.saboteur.targetId = state.plots[0].id;
    state.elapsed = 1;
    render();
    const charging =
      actor.userData.laserState === "charging" &&
      (actor.userData.glowCracks as THREE.Mesh[]).some(
        (crack) => crack.visible,
      );
    state.saboteur.phase = "sealing";
    state.elapsed = 2;
    render();
    state.elapsed += 0.44;
    render();
    const beams = actor.userData.laserBeams as THREE.Group[];
    const firing =
      actor.userData.laserState === "firing" &&
      beams.every((beam) => beam.visible);
    const eyeOrigins = (actor.userData.laserEyes as THREE.Object3D[]).map(
      (eye) => eye.getWorldPosition(new THREE.Vector3()),
    );
    const beamOrigins = beams.map((beam) =>
      beam.userData.raycaster.ray.origin.clone(),
    );
    const originsCorrect = eyeOrigins.every(
      (origin, i) => origin.distanceTo(beamOrigins[i]) < 0.001,
    );
    actor.position.x += 1;
    render();
    const movedEyeOrigins = (actor.userData.laserEyes as THREE.Object3D[]).map(
      (eye) => eye.getWorldPosition(new THREE.Vector3()),
    );
    const movedRayOrigins = beams.map((beam) =>
      beam.userData.raycaster.ray.origin.clone(),
    );
    const followsMovement =
      beams.every((beam) => beam.visible) &&
      movedEyeOrigins.every(
        (origin, i) => origin.distanceTo(movedRayOrigins[i]) < 0.001,
      );
    Object.assign(window, {
      betonBossPreview: {
        state,
        player,
        view,
        render,
        actor,
        vehicle,
        scene,
        camera,
      },
    });
    return {
      anchored,
      meshes,
      independentRoots,
      angerEnhances:
        angryEyeIntensity > baselineEyeIntensity && angryCracksVisible,
      angerRestored,
      charging,
      firing,
      originsCorrect,
      followsMovement,
      output: output?.name,
      driver: driver?.name,
      vehicleKind: vehicle.userData.assetKind,
      levelAppearance,
    };
  }, cityLevels.length);
  expect(result.anchored).toBe(true);
  expect(result.meshes).toBeGreaterThan(35);
  expect(result.independentRoots).toBe(true);
  expect(result.angerEnhances).toBe(true);
  expect(result.angerRestored).toBe(true);
  expect(result.charging).toBe(true);
  expect(result.firing).toBe(true);
  expect(result.originsCorrect).toBe(true);
  expect(result.followsMovement).toBe(true);
  expect(result.output).toBe("FX_ConcreteOutput");
  expect(result.driver).toBe("DrBeton_DriverPoint");
  expect(result.vehicleKind).toBe("procedural-three-dimensional-boss-vehicle");
  for (let level = 1; level < result.levelAppearance.length; level += 1) {
    expect(
      result.levelAppearance[level].scale -
        result.levelAppearance[level - 1].scale,
    ).toBeGreaterThanOrEqual(0.15);
    expect(result.levelAppearance[level].browAngle).toBeGreaterThan(
      result.levelAppearance[level - 1].browAngle,
    );
    expect(result.levelAppearance[level].eyeGlow).toBeGreaterThan(
      result.levelAppearance[level - 1].eyeGlow,
    );
    expect(result.levelAppearance[level].darkCracks).toBeGreaterThan(
      result.levelAppearance[level - 1].darkCracks,
    );
    expect(result.levelAppearance[level].glowingCracks).toBeGreaterThan(
      result.levelAppearance[level - 1].glowingCracks,
    );
    expect(result.levelAppearance[level].flames).toBeGreaterThanOrEqual(
      result.levelAppearance[level - 1].flames,
    );
  }
  expect(result.levelAppearance.at(-1)!.flames).toBeGreaterThan(
    result.levelAppearance[0].flames,
  );
  await page.screenshot({ path: "/tmp/dr-beton-boss.png" });
});
