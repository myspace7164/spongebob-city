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
    let played: any;
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
      testPlay: (_id: string, draft: any) => {
        played = draft;
      },
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
    // Click the visible mesh, then rotate, delete and undo without moving it.
    const rect = canvas.getBoundingClientRect();
    const click = () => {
      scene.updateMatrixWorld(true);
      const tile = scenery.getObjectByName("builder-spot-3");
      const screen = tile.getWorldPosition(new THREE.Vector3()).project(camera);
      const event = {
        clientX: rect.left + ((screen.x + 1) * rect.width) / 2,
        clientY: rect.top + ((1 - screen.y) * rect.height) / 2,
        button: 0,
        bubbles: true,
      };
      canvas.dispatchEvent(new MouseEvent("mousedown", event));
      window.dispatchEvent(new MouseEvent("mouseup", event));
    };
    click();
    const press = (id: string) =>
      document.querySelector<HTMLButtonElement>(id)!.click();
    const angle = document.querySelector<HTMLInputElement>("#lb-angle")!;
    if (
      !document.querySelector("#lb-rotation-label")!.textContent!.includes("#3")
    )
      throw new Error("Mesh click did not select field 3");
    press("#lb-rotate-left");
    const steppedAngle = Number(angle.value);
    press("#lb-undo");
    click();
    const undoneAngle = Number(angle.value);
    angle.value = "45";
    angle.dispatchEvent(new Event("change", { bubbles: true }));
    const rotated = scenery.getObjectByName("builder-spot-3");
    const rotatedWorld = rotated.getWorldPosition(new THREE.Vector3());
    const worldAngle = rotated.rotation.y + scenery.rotation.y;
    press("#lb-save-draft");
    press("#lb-delete");
    const deletedCount = document.querySelectorAll("#lb-spots button").length;
    press("#lb-undo");
    click();
    const restoredAngle = Number(angle.value);
    press("#lb-rotate-right");
    press("#lb-load-draft");
    click();
    const loadedAngle = Number(angle.value);
    // Carry the selected angle into a replacement field's placement preview.
    press("#lb-new-spot");
    click();
    press("#lb-delete");
    const screen = world.clone().project(camera);
    const event = {
      clientX: rect.left + ((screen.x + 1) * rect.width) / 2,
      clientY: rect.top + ((1 - screen.y) * rect.height) / 2,
      button: 0,
      bubbles: true,
    };
    canvas.dispatchEvent(new MouseEvent("mousemove", event));
    canvas.dispatchEvent(new MouseEvent("mousedown", event));
    window.dispatchEvent(new MouseEvent("mouseup", event));
    const placedAngle = Number(angle.value);
    const countAfterPlacement =
      document.querySelectorAll("#lb-spots button").length;
    // Use a well-spaced draft to verify Test play's map-to-play angle conversion.
    press("#lb-save-draft");
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("spongebob-city:level-builder:draft:"),
    )!;
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved.state.spots.forEach((spot: any, i: number) => {
      spot.x = (i % 4) * 15;
      spot.z = Math.floor(i / 4) * 15;
    });
    localStorage.setItem(key, JSON.stringify(saved));
    press("#lb-load-draft");
    press("#lb-test");
    return {
      placedAngle,
      countAfterPlacement,
      playedAngle: played?.spots[15].rotationY,

      steppedAngle,
      undoneAngle,
      worldAngle,
      deletedCount,
      restoredAngle,
      loadedAngle,
      movedDistance: rotatedWorld.distanceTo(world),
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
  expect(result.placedAngle).toBeCloseTo(45, 2);
  expect(result.countAfterPlacement).toBe(16);
  expect(result.playedAngle).toBeCloseTo(Math.PI / 4, 3);
  expect(result.steppedAngle).toBeCloseTo(5, 2);
  expect(result.undoneAngle).toBeCloseTo(0, 2);
  expect(result.worldAngle).toBeCloseTo(Math.PI / 4, 3);
  expect(result.movedDistance).toBeCloseTo(0, 5);
  expect(result.deletedCount).toBe(15);
  expect(result.restoredAngle).toBeCloseTo(45, 2);
  expect(result.loadedAngle).toBeCloseTo(45, 2);
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
  await page.locator("#online-toggle").click();
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

test("drafts stay local until saved to the library, then the lineup picks it", async ({
  page,
}) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );
  type Saved = {
    id: string;
    author: string;
    notes: string;
    builtFor: string;
    location: string;
    savedAt: string;
  };
  let saved: Saved | undefined;
  let restored: { id: string; versionId: string } | undefined;
  let lineup = {
    stages: {} as Record<string, string>,
    endlessOff: [] as string[],
  };
  await page.route("**/__level-builder/history**", (route) =>
    route.fulfill({
      json: {
        versions: [
          {
            id: "prior-version",
            savedAt: "2026-10-04T10:00:00.000Z",
            location: "Previous level",
            author: "buddy",
          },
        ],
      },
    }),
  );
  await page.route("**/__level-builder/library", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { levels: saved ? [saved] : [], lineup } });
    saved = {
      ...route.request().postDataJSON().level,
      savedAt: "2026-10-04T11:00:00.000Z",
    };
    await route.fulfill({ json: { level: saved } });
  });
  await page.route("**/__level-builder/restore", async (route) => {
    restored = route.request().postDataJSON();
    await route.fulfill({ json: { level: saved } });
  });
  await page.route("**/__level-builder/lineup", async (route) => {
    lineup = route.request().postDataJSON().lineup;
    await route.fulfill({ json: { lineup } });
  });
  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto("/?builder");
  await page.locator(".level-builder-open").click();
  const panel = page.locator("#level-builder");
  await expect(panel).toBeVisible();
  await expect(panel.locator("#lb-editing")).toContainText(
    "New level for Stage 1",
  );
  const name = panel.locator("#lb-name");
  await name.fill("Saved draft");
  await panel.locator("#lb-save-draft").click();
  await expect(panel.locator("#lb-status")).toContainText("Draft saved");
  await name.fill("Unsaved edit");
  await panel.locator("#lb-load-draft").click();
  await expect(name).toHaveValue("Saved draft");
  expect(saved).toBeUndefined();

  // Saving needs a GitHub username; author and notes travel with the level.
  await name.fill("Library level");
  await panel.locator("#lb-author").fill("");
  await panel.locator("#lb-save-library").click();
  await expect(panel.locator("#lb-status")).toContainText("GitHub username");
  expect(saved).toBeUndefined();
  await panel.locator("#lb-author").fill("Giginio");
  await panel.locator("#lb-notes").fill("Two swales by the tram stop.");
  await panel.locator("#lb-save-library").click();
  await expect.poll(() => saved?.location).toBe("Library level");
  expect(saved!.author).toBe("Giginio");
  expect(saved!.notes).toBe("Two swales by the tram stop.");
  expect(saved!.builtFor).toBeTruthy();
  await expect(panel.locator("#lb-editing")).toContainText("@Giginio");
  await expect(panel.locator("#lb-history")).toHaveValue("prior-version");
  await panel.locator("#lb-restore").click();
  await expect.poll(() => restored?.versionId).toBe("prior-version");

  // The lineup assigns it to stage 1 and switches a built-in street off for endless.
  await page.keyboard.press("l");
  const screen = page.locator("#lb-lineup");
  await expect(screen).toBeVisible();
  await screen.locator("select[data-stage]").first().selectOption(saved!.id);
  await expect.poll(() => lineup.stages[saved!.builtFor]).toBe(saved!.id);
  const before = await screen.locator("#lb-endless-count").textContent();
  await screen.locator("input[data-endless^='basel:']").first().uncheck();
  await expect.poll(() => lineup.endlessOff.length).toBe(1);
  await expect(screen.locator("#lb-endless-count")).not.toHaveText(before!);
  await expect(screen.locator("#lb-level-list")).toContainText("Two swales");
  await page.screenshot({ path: test.info().outputPath("lineup.png") });
  await screen.locator("#lb-lineup-close").click();
  await expect(screen).toBeHidden();
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

test("world objects can be selected, moved, turned, reset and test-played", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 750 });
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );
  await page.route("**/__level-builder/**", (route) =>
    route.fulfill({ json: { versions: [] } }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?builder");
  await page.locator(".level-builder-open").click();
  const panel = page.locator("#level-builder");
  await expect(panel).toBeVisible();
  await page.keyboard.press("o");
  await expect(panel.locator("#lb-tool-objects")).toBeVisible();
  const objects = panel.locator("#lb-landmarks button");
  await expect(objects).toHaveCount(4);
  await expect(objects.first()).toContainText("default");

  const savedLandmarks = async () => {
    await panel.locator("#lb-save-draft").click();
    return page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.startsWith("spongebob-city:level-builder:draft:"),
      )!;
      return JSON.parse(localStorage.getItem(key)!).state.landmarks;
    });
  };

  // Selecting flies the view to the object, so it sits at the canvas centre.
  await objects.nth(2).click();
  await expect(panel.locator("#lb-landmark")).toContainText("First power-up");
  await page.waitForTimeout(200);
  const box = (await page.locator("canvas").first().boundingBox())!;
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 20, { steps: 6 });
  await page.mouse.up();
  const afterDrag = await savedLandmarks();
  expect(afterDrag.powerup?.at).toHaveLength(2);
  await expect(objects.nth(2)).not.toContainText("default");

  await objects.first().click();
  await panel.locator("#lb-landmark [data-turn='1']").click();
  const turned = await savedLandmarks();
  expect(typeof turned.leaderboard.rotationY).toBe("number");
  await panel.locator("#lb-landmark-reset").click();
  expect((await savedLandmarks()).leaderboard).toBeUndefined();
  await panel.locator("#lb-undo").click();
  expect((await savedLandmarks()).leaderboard).toBeDefined();

  await panel.locator("#lb-test").click();
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});
