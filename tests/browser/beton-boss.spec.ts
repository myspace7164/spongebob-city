import { expect, test } from "@playwright/test";
import type * as THREE from "three";

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
  const result = await page.evaluate(async () => {
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
      charging,
      firing,
      originsCorrect,
      followsMovement,
      output: output?.name,
      driver: driver?.name,
      vehicleKind: vehicle.userData.assetKind,
    };
  });
  expect(result.anchored).toBe(true);
  expect(result.meshes).toBeGreaterThan(35);
  expect(result.independentRoots).toBe(true);
  expect(result.charging).toBe(true);
  expect(result.firing).toBe(true);
  expect(result.originsCorrect).toBe(true);
  expect(result.followsMovement).toBe(true);
  expect(result.output).toBe("FX_ConcreteOutput");
  expect(result.driver).toBe("DrBeton_DriverPoint");
  expect(result.vehicleKind).toBe("procedural-three-dimensional-boss-vehicle");
  await page.screenshot({ path: "/tmp/dr-beton-boss.png" });
});
