import { expect, test } from "@playwright/test";
import { cityLevels } from "../../config/levels.ts";

test("build zones blend with terrain, preview placements and disappear under finished plots", async ({
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
  const result = await page.evaluate(async (levels) => {
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x434c50, 2.2));
    const state = createCampaign();
    const player = createPlayer();
    const view = createCityView(scene, state);
    const ground = (x: number, z: number) => x * 0.001 + z * 0.0015;
    view.useGround(ground);
    const canvas = document.querySelector("#game") as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(960, 640);
    const camera = new THREE.PerspectiveCamera(42, 1.5, 0.1, 240);
    state.selected = "basin";
    state.budget = 10000;
    const reports: {
      level: string;
      baseTints: string[];
      conformingHeightRange: number;
      unsealedSandVisible: boolean;
      selectedZoneVisible: boolean;
      validPreview: boolean;
      invalidPreview: boolean;
      builtZoneHidden: boolean;
    }[] = [];
    for (let index = 0; index < levels.length; index++) {
      const level = levels[index];
      state.campaign!.level = index;
      state.plots = level.layout.map((spot, id) => ({
        id,
        x: spot.x,
        z: spot.z,
        kind: "soil" as const,
        site: spot.site,
        elevation: ground(spot.x, spot.z),
        surface: 0,
        moisture: 0,
        stored: 0,
      }));
      player.position.x = state.plots[0].x;
      player.position.z = state.plots[0].z;
      view.update(state, player, null, 7);
      const surfaces: any[] = [];
      scene.traverse((object: any) => {
        if (object.name === "build-zone-ground-blend") surfaces.push(object);
      });
      const surface = surfaces[0];
      const soilColor = new THREE.Color(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--soil")
          .trim(),
      ).getHexString();
      const unsealedSandVisible = surfaces.every(
        (zone) =>
          zone.visible &&
          zone.material.opacity === 1 &&
          zone.material.color.getHexString() === soilColor,
      );
      view.update(state, player, 0, 7);
      const selectedZoneVisible = surface.visible;
      const position = surface.geometry.getAttribute("position");
      const ys = Array.from(
        { length: position.count },
        (_: unknown, i: number) => position.getY(i),
      );
      const preview = scene.getObjectByName("build-structure-preview");
      const findPreviewMesh = () => {
        let mesh: any;
        preview.traverse((child: any) => {
          if (!mesh && child.isMesh) mesh = child;
        });
        return mesh;
      };
      const previewMesh = findPreviewMesh();
      const validPreview =
        preview.visible &&
        previewMesh.material.color.getHexString() ===
          new THREE.Color(
            getComputedStyle(document.documentElement)
              .getPropertyValue("--open-edge")
              .trim(),
          ).getHexString();
      state.plots[0].kind = "asphalt";
      view.update(state, player, 0, 7);
      const invalidMesh = findPreviewMesh();
      const invalidPreview =
        preview.visible &&
        invalidMesh.material.color.getHexString() ===
          new THREE.Color(
            getComputedStyle(document.documentElement)
              .getPropertyValue("--coral")
              .trim(),
          ).getHexString();
      state.plots[0].kind = "soil";
      view.update(state, player, 0, 7);
      const baseTints = surfaces.map((zone) =>
        zone.material.color.getHexString(),
      );
      camera.position.set(
        state.plots[0].x + 8,
        ground(state.plots[0].x, state.plots[0].z) + 8,
        state.plots[0].z + 10,
      );
      camera.lookAt(
        state.plots[0].x,
        ground(state.plots[0].x, state.plots[0].z),
        state.plots[0].z,
      );
      renderer.render(scene, camera);
      if (index === 0)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      state.plots[0].kind = "pond";
      view.update(state, player, 0, 7);
      reports.push({
        level: level.id,
        baseTints,
        conformingHeightRange: Math.max(...ys) - Math.min(...ys),
        unsealedSandVisible,
        selectedZoneVisible,
        validPreview,
        invalidPreview,
        builtZoneHidden: !surface.visible,
      });
    }
    return reports;
  }, cityLevels);
  expect(result).toHaveLength(cityLevels.length);
  expect(result.every((level) => level.validPreview)).toBe(true);
  expect(result.every((level) => level.invalidPreview)).toBe(true);
  expect(result.every((level) => level.unsealedSandVisible)).toBe(true);
  expect(result.every((level) => level.selectedZoneVisible)).toBe(true);
  expect(result.every((level) => level.builtZoneHidden)).toBe(true);
  expect(result.every((level) => level.conformingHeightRange < 0.1)).toBe(true);
  expect(
    new Set(result.flatMap((level) => level.baseTints)).size,
  ).toBeGreaterThan(1);
  await page.screenshot({ path: "/tmp/build-zone-blend.png" });
});
