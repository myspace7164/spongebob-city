import { expect, test } from "@playwright/test";

for (const imported of [true, false]) {
  test(`${imported ? "Blender" : "fallback"} character holds all tools, moves limbs and renders a roaming villain`, async ({
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
    const result = await page.evaluate(async (imported) => {
      const worldPath = "/src/game/world.ts",
        assetsPath = "/src/game/assets.ts",
        playerPath = "/src/game/player.ts",
        viewPath = "/src/game/city-view.ts",
        campaignPath = "/src/game/campaign.ts",
        cityPath = "/config/city.ts",
        sabotagePath = "/src/game/sabotage.ts";
      const source = await (await fetch(worldPath)).text();
      const threePath = source.match(/from\s+"([^"]*three[^"]+)"/)![1];
      const [
        THREE,
        { createWorld },
        { loadModel, updateSpongeWaterState },
        { createPlayer },
        { createCityView },
        { createCampaign },
        { cityTools },
        { updateSaboteur },
      ] = await Promise.all([
        import(threePath),
        import(worldPath),
        import(assetsPath),
        import(playerPath),
        import(viewPath),
        import(campaignPath),
        import(cityPath),
        import(sabotagePath),
      ]);
      const scene = new THREE.Scene(),
        world = createWorld(scene),
        player = createPlayer();
      let model = world.placeholder;
      if (imported) {
        model = await loadModel({
          url: "/models/spongebob.glb",
          scale: 1,
          rotationY: 0,
        });
        world.useCharacter(model);
        updateSpongeWaterState(model, 0, 400);
      }
      const state = createCampaign();
      state.saboteur.x = 2.6;
      state.saboteur.z = 0;
      const view = createCityView(scene, state);
      const canvas = document.querySelector("#game") as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(960, 640);
      const camera = new THREE.PerspectiveCamera(45, 960 / 640, 0.1, 150);
      camera.position.set(3.5, 3.3, 8);
      camera.lookAt(1.2, 1.3, 0);
      const render = () => {
        world.update(player, 0, state.elapsed, state.selected);
        view.update(state, player, null, 7, null, false);
        renderer.render(scene, camera);
      };
      render();
      const right = world.character.getObjectByName("right-arm"),
        hand = world.character.getObjectByName("right-hand-equipment"),
        held = world.character.getObjectByName("held-tool");
      const initial = hand.getWorldPosition(new THREE.Vector3());
      const selections = [];
      for (const tool of cityTools) {
        state.selected = tool.id;
        render();
        selections.push(
          held.children.filter((p: any) => p.visible).map((p: any) => p.name),
        );
      }
      player.velocity.z = 5;
      state.elapsed = 0.2;
      render();
      const walking = right.rotation.x,
        handMoved = hand
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(initial);
      player.velocity.z = 9;
      state.elapsed = 0.3;
      render();
      const gait = model.userData.gait;
      state.selected = "roof";
      render();
      const teeth: any[] = [];
      model.traverse((o: any) => {
        if (o.userData.whiteTooth) teeth.push(o.material.color.getHex());
      });
      const villain = scene.getObjectByName("roaming-asphaltinator");
      const villainActor = scene.getObjectByName("dr-beton");
      const before = villain.getWorldPosition(new THREE.Vector3());
      updateSaboteur(state, 1);
      render();
      const moved = villain
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(before);
      state.plots[0].kind = "soil";
      state.sabotageIn = 0;
      updateSaboteur(state, 0.1);
      render();
      const phase = villain.userData.phase;
      const eyes: any[] = [];
      villainActor.traverse((o: any) => {
        if (o.name === "evil-eye") eyes.push(o.material.emissive.getHex());
      });
      Object.assign(window, {
        equipmentPreview: { render, state, world, player, scene },
      });
      return {
        selections,
        walking,
        handMoved,
        gait,
        teeth,
        moved,
        phase,
        eyes,
        propCount: held.children.length,
      };
    }, imported);
    expect(result.selections).toEqual(
      [
        "absorb",
        "spray",
        "karate",
        "tree",
        "basin",
        "roof",
        "pond",
        "shade",
        "tank",
      ].map((id) => [`held-${id}`]),
    );
    expect(result.propCount).toBe(9);
    expect(Math.abs(result.walking)).toBeGreaterThan(0.1);
    expect(result.handMoved).toBeGreaterThan(0.1);
    expect(result.gait).toBe("sprint");
    if (imported) expect(result.teeth).toEqual([0xffffff, 0xffffff]);
    expect(result.moved).toBeGreaterThan(0.5);
    expect(result.phase).toBe("approaching");
    expect(result.eyes).toHaveLength(2);
    expect(result.eyes.every((color: number) => color > 0)).toBe(true);
    // A front-facing portrait makes the villain's eyes and grin reviewable.
    await page.evaluate(() => {
      const preview = (window as any).equipmentPreview;
      preview.state.saboteur.facing = 0;
      preview.render();
    });
    await page.screenshot({
      path: `/tmp/sponge-equipment-${imported ? "blender" : "fallback"}.png`,
    });
  });
}
