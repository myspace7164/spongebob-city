import { test, expect } from "@playwright/test";

test("real map remains visible and level previews return to the original game", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 750 });
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?builder");
  await expect(page.locator("#game")).toHaveAttribute("data-level", "loaded", {
    timeout: 60000,
  });
  await expect(page.locator("#game")).toHaveAttribute(
    "data-terrain",
    "loaded",
    { timeout: 60000 },
  );
  const initialMap = await page.locator("#level-status").textContent();
  await page.locator(".level-builder-open").click();
  await expect(page.locator("#lb-normal-view")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(initialMap).toContain(await page.locator("#lb-name").inputValue());
  await page.screenshot({ path: "/tmp/level-builder-normal-view.png" });
  await page.locator("#lb-overview").click();
  await expect(page.locator("#lb-overview")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#lb-spots button").nth(2).click();
  await page.locator("#lb-delete").click();
  await expect(page.locator("#lb-spots button")).toHaveCount(15);
  await page.locator("#lb-undo").click();
  await expect(page.locator("#lb-spots button")).toHaveCount(16);
  await page.locator("#lb-level").selectOption("1");
  const previewName = await page.locator("#lb-name").inputValue();
  await expect(page.locator("#level-status")).toContainText(previewName);
  await expect(page.locator("#lb-normal-view")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#lb-exit").click();
  await expect(page.locator("#level-builder")).toBeHidden();
  await expect(page.locator("#level-status")).toHaveText(initialMap!);
  expect(errors).toEqual([]);
});

test("builder markers align with the campaign map and default to the game camera", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.route("**/__level-builder/history**", (route) =>
    route.fulfill({ json: { versions: [] } }),
  );
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const source = await (await fetch("/src/game/world.ts")).text();
    const threePath = source.match(/from\s+"([^"]*three[^"]+)"/)![1];
    const builderPath = "/src/ui/level-builder.ts";
    const campaignPath = "/src/game/campaign.ts";
    const terrainPath = "/src/game/terrain.ts";
    const [
      THREE,
      { createLevelBuilder },
      { createCampaign, campaignLevel, currentLevel },
      { levelScenery },
    ] = await Promise.all([
      import(threePath),
      import(builderPath),
      import(campaignPath),
      import(terrainPath),
    ]);
    const state = createCampaign(() => 0.999);
    const level = currentLevel(state);
    const scenery = new THREE.Group();
    const scene = new THREE.Scene();
    scene.add(scenery);
    const pose = levelScenery(level, null);
    scenery.position.set(pose.x, pose.y, pose.z);
    scenery.rotation.y = pose.rotationY;
    const camera = new THREE.PerspectiveCamera(55, 1.5, 0.1, 150);
    const canvas = document.querySelector("#game") as HTMLCanvasElement;
    const builder = createLevelBuilder({
      scenery,
      camera,
      canvas,
      levelIndex: () => 0,
      level: (index: number) => campaignLevel(state, index),
      selectLevel: () => {},
      normalView: () => ({ x: 0, z: 0, yaw: 0, pitch: 0.28 }),
      terrain: () => null,
      groundAt: pose.groundAt,
      testPlay: () => {},
      backToGame: () => {},
      showGameScene: () => {},
    });
    builder.toggle();
    builder.updateCamera(0);
    scene.updateMatrixWorld(true);
    const marker = scenery.getObjectByName("builder-spot-3");
    const world = marker.getWorldPosition(new THREE.Vector3());
    const projected = world.clone().project(camera);
    const target = new THREE.Vector3(0, 1.2, 0);
    const normalDistance = camera.position.distanceTo(target);
    document.querySelector<HTMLButtonElement>("#lb-overview")!.click();
    builder.updateCamera(0);
    const overviewDistance = camera.position.distanceTo(
      new THREE.Vector3(0, 0, 0),
    );
    document.querySelector<HTMLButtonElement>("#lb-normal-view")!.click();
    builder.updateCamera(0);
    return {
      name: document.querySelector<HTMLInputElement>("#lb-name")!.value,
      expectedName: level.location,
      marker: [world.x, world.z],
      expectedMarker: [level.layout[2].x, level.layout[2].z],
      projected: [projected.x, projected.y, projected.z],
      normalDistance,
      overviewDistance,
      returnedDistance: camera.position.distanceTo(target),
    };
  });
  expect(result.name).toBe(result.expectedName);
  expect(result.marker[0]).toBeCloseTo(result.expectedMarker[0], 5);
  expect(result.marker[1]).toBeCloseTo(result.expectedMarker[1], 5);
  for (const coordinate of result.projected)
    expect(Math.abs(coordinate)).toBeLessThan(1);
  expect(result.normalDistance).toBeCloseTo(7);
  expect(result.overviewDistance).toBeGreaterThan(30);
  expect(result.returnedDistance).toBeCloseTo(7);
});

test("level builder stays local and refuses to open in an online room", async ({
  page,
}) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );

  await page.goto("/");
  await expect(page.locator(".level-builder-open")).toHaveCount(0);

  await page.goto("/?builder");
  const openBuilder = page.locator(".level-builder-open");
  await expect(openBuilder).toBeVisible();
  await openBuilder.click();
  await expect(page.locator("#level-builder")).toBeVisible();
  await expect(page.locator("#lb-spots button").first()).toBeVisible();
  await page.locator("#lb-spots button").first().click();
  await expect(page.locator("#lb-status")).toContainText("selected");

  await page.reload();
  await page.locator("#online-toggle").click();
  const username = `Builder_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  await page.locator("#username").fill(username);
  await page.locator("#account-form button").click();
  await expect(page.locator("#account-name")).toContainText(username);
  await page.locator("#create-room").click();
  await expect(page.locator("#team-status")).toContainText("1/4");
  await page.locator("#story-start").click();
  await expect(page.locator("#crosshair")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openBuilder).toBeVisible();
  await openBuilder.click();
  await expect(page.locator("#message")).toContainText(
    "not available in an online room",
  );
  await expect(page.locator("#level-builder")).toBeHidden();
});

test("drafts stay local until Apply and saved versions can be restored", async ({
  page,
}) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );
  let applied: { levelId: string; level: { location: string } } | undefined;
  let restored: { levelId: string; versionId: string } | undefined;
  await page.route("**/__level-builder/history**", (route) =>
    route.fulfill({
      json: {
        versions: [
          {
            id: "prior-version",
            savedAt: "2026-10-04T10:00:00.000Z",
            location: "Previous level",
          },
        ],
      },
    }),
  );
  await page.route("**/__level-builder/apply", async (route) => {
    const request = route.request().postDataJSON();
    applied = request;
    await route.fulfill({ json: { saved: request.levelId } });
  });
  await page.route("**/__level-builder/restore", async (route) => {
    const request = route.request().postDataJSON();
    restored = request;
    await route.fulfill({ json: { saved: request.levelId } });
  });
  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto("/?builder");
  await page.locator(".level-builder-open").click();
  const panel = page.locator("#level-builder");
  await expect(panel).toBeVisible();
  const name = panel.locator("#lb-name");
  await name.fill("Saved draft");
  await panel.locator("#lb-save-draft").click();
  await expect(panel.locator("#lb-status")).toContainText("Draft saved");
  await name.fill("Unsaved edit");
  await panel.locator("#lb-load-draft").click();
  await expect(name).toHaveValue("Saved draft");
  expect(applied).toBeUndefined();

  await name.fill("Applied draft");
  await panel.locator("#lb-apply").click();
  await expect.poll(() => applied?.level.location).toBe("Applied draft");
  await expect(panel.locator("#lb-history")).toHaveValue("prior-version");
  await panel.locator("#lb-restore").click();
  await expect.poll(() => restored?.versionId).toBe("prior-version");
});

test("Test play does not write a saved level", async ({ page }) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );
  let writes = 0;
  await page.route("**/__level-builder/**", async (route) => {
    if (route.request().method() === "POST") writes++;
    await route.fulfill({ json: { versions: [] } });
  });
  await page.goto("/?builder");
  await page.locator(".level-builder-open").click();
  const panel = page.locator("#level-builder");
  await expect(panel).toBeVisible();
  await panel.locator("#lb-test").click();
  await expect(panel).toBeHidden();
  expect(writes).toBe(0);
});
