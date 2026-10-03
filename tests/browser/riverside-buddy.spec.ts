import { test, expect } from "@playwright/test";

test("riverside buddy visibly drinks, rolls, smokes and cheers with rotating cartoon encouragement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const paths = [
      "/node_modules/three/build/three.module.js",
      "/src/game/riverside-buddy-view.ts",
      "/src/game/campaign.ts",
    ];
    const [THREE, { createRiversideBuddy }, { createCampaign }] =
      await Promise.all(paths.map((p) => import(p)));
    for (const node of document.body.children)
      if (node.id !== "game") (node as HTMLElement).style.display = "none";
    const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(900, 700);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#bddbef");
    scene.add(new THREE.HemisphereLight(0xffffff, 0x698163, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshLambertMaterial({ color: "#85ab71" }),
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const camera = new THREE.PerspectiveCamera(38, 900 / 700, 0.1, 50);
    camera.position.set(3.2, 2.7, 5);
    camera.lookAt(0, 1.5, 0);
    const buddy = createRiversideBuddy();
    scene.add(buddy.root);
    const state = createCampaign();
    (window as any).buddyDemo = {
      show(time: number) {
        state.elapsed = time;
        buddy.update(state, () => 0);
        buddy.root.position.set(0, 0, 0);
        buddy.root.rotation.y = 0;
        renderer.render(scene, camera);
        return {
          activity: buddy.root.userData.activity,
          cigarette: buddy.root.getObjectByName("buddy-cigarette").visible,
          smoke: buddy.root.getObjectByName("buddy-smoke").visible,
          paper: buddy.root.getObjectByName("buddy-rolling-paper").visible,
          bubble: !!buddy.root.getObjectByName("speech-buddy"),
          legs: buddy.root.getObjectByName("buddy-left-leg").rotation.x,
        };
      },
    };
  });
  const phases = [
    [0, "walk"],
    [24.5, "sip"],
    [42, "roll"],
    [48, "smoke"],
    [55, "cheer"],
  ] as const;
  const shots: Buffer[] = [];
  for (const [time, activity] of phases) {
    const pose = await page.evaluate(
      (time) => (window as any).buddyDemo.show(time),
      time,
    );
    expect(pose.activity).toBe(activity);
    expect(pose.bubble).toBe(true);
    expect(pose.paper).toBe(activity === "roll");
    expect(pose.smoke).toBe(activity === "smoke");
    expect(pose.cigarette).toBe(activity === "roll" || activity === "smoke");
    const shot = await page
      .locator("#game")
      .screenshot({ path: `/tmp/riverside-buddy-${activity}.png` });
    shots.push(shot);
  }
  for (const shot of shots.slice(1)) expect(shot.equals(shots[0])).toBe(false);
});

test("buddy voice is audible nearby, silent far away, and stops with pause or mute", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.mouse.click(10, 10);
  const result = await page.evaluate(async () => {
    const paths = [
      "/src/game/audio.ts",
      "/src/game/campaign.ts",
      "/src/game/riverside-buddy.ts",
    ];
    const [{ CityAudio }, { createCampaign }, { riversideBuddyPose }] =
      await Promise.all(paths.map((p) => import(p)));
    const state = createCampaign(),
      audio = new CityAudio(),
      pose = riversideBuddyPose(state);
    audio.updateCharacters(true, state, { ...pose, y: 0 }, 0);
    const near = audio.characterVoices.has("buddy");
    audio.updateCharacters(true, state, { x: 5000, y: 0, z: 5000 }, 0);
    const far = audio.characterVoices.size === 0;
    audio.updateCharacters(true, state, { ...pose, y: 0 }, 0);
    audio.updateCharacters(false, state, { ...pose, y: 0 }, 0);
    const paused = audio.characterVoices.size === 0;
    audio.toggleMuted();
    audio.updateCharacters(true, state, { ...pose, y: 0 }, 0);
    return { near, far, paused, muted: audio.characterVoices.size === 0 };
  });
  expect(result).toEqual({ near: true, far: true, paused: true, muted: true });
});
