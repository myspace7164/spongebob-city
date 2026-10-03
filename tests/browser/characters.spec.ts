import { test, expect } from "@playwright/test";
test("cartoon bubbles follow roaming cast and nearby voices stop on pause and mute", async ({
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
      "/node_modules/three/build/three.module.js",
      "/src/game/city-view.ts",
      "/src/game/campaign.ts",
      "/src/game/player.ts",
      "/src/game/audio.ts",
      "/src/game/cast.ts",
    ];
    const [
      THREE,
      { createCityView },
      { createCampaign },
      { createPlayer },
      { CityAudio },
      { castPosition },
    ] = await Promise.all(paths.map((path) => import(path)));
    const scene = new THREE.Scene(),
      state = createCampaign(),
      player = createPlayer(),
      view = createCityView(scene, state);
    view.update(state, player, null, 7);
    const patrick = scene.getObjectByName("cast-patrick");
    const before = patrick.position.clone();
    state.elapsed = 4;
    view.update(state, player, null, 7);
    const bubble = patrick.getObjectByName("speech-patrick");
    const moved = before.distanceTo(patrick.position);
    const follows = bubble.parent === patrick && bubble.userData.speechBubble;
    const audio = new CityAudio();
    state.elapsed = 0.2;
    const position = { ...castPosition(state, 0), y: 0 };
    audio.updateCharacters(true, state, position, 0);
    const speaking = audio.characterVoices.has("patrick");
    audio.updateCharacters(
      true,
      state,
      { ...position, x: position.x + 100 },
      0,
    );
    const distantSilent = !audio.characterVoices.has("patrick");
    audio.updateCharacters(true, state, position, 0);
    audio.update(false, false);
    const pausedSilent = audio.characterVoices.size === 0;
    audio.toggleMuted();
    audio.updateCharacters(true, state, position, 0);
    return {
      moved,
      follows,
      speaking,
      distantSilent,
      pausedSilent,
      mutedSilent: audio.characterVoices.size === 0,
    };
  });
  expect(result.moved).toBeGreaterThan(0.3);
  expect(result.follows).toBe(true);
  expect(result.speaking).toBe(true);
  expect(result.distantSilent).toBe(true);
  expect(result.pausedSilent).toBe(true);
  expect(result.mutedSilent).toBe(true);
});
