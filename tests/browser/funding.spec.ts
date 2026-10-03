import { registerTestAccount } from "./account-fixture";
test.beforeEach(async ({ page }) => {
  await registerTestAccount(page);
});
import { expect, test } from "@playwright/test";

test("wallet celebrates real grants, respects mute/reduced motion and fits desktop screens", async ({
  page,
}) => {
  // Exercise the real rules/UI/audio without a software-rendered 3D scene
  // consuming the short celebration's lifetime between browser assertions.
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.mouse.click(10, 10);
  const reward = await page.evaluate(async () => {
    const uiPath = "/src/ui/city.ts",
      audioPath = "/src/game/audio.ts",
      cityPath = "/src/game/city.ts";
    const [{ CityUI }, { CityAudio }, { createCity }] = await Promise.all([
      import(uiPath),
      import(audioPath),
      import(cityPath),
    ]);
    const notes: number[] = [];
    const voices: OscillatorNode[] = [];
    const native = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const voice = native.call(this);
      voices.push(voice);
      voice.addEventListener("ended", () => notes.push(voice.frequency.value));
      return voice;
    };
    const audio = new CityAudio();
    const state = createCity();
    document.querySelector("#hotbar")!.replaceChildren();
    document.querySelector("#inventory-list")!.replaceChildren();
    const ui = new CityUI(
      () => {},
      () => audio.playFunding(),
    );
    ui.render(state, 0, true);
    const plot = state.plots[0],
      position = { ...plot, y: 0 };
    audio.performAction(state, "karate", position, 0);
    audio.performAction(state, "tree", position, 0);
    ui.render(state, 0, true);
    Object.assign(window, {
      fundingFixture: { state, ui, audio, notes, voices },
    });
    return {
      coins: state.budget,
      earned: state.funding.earned,
      animations: document.querySelector("#coin-wallet")!.getAnimations()
        .length,
      burst: document.querySelector("#coin-burst")!.childElementCount,
      receipt: document.querySelector("#funding-receipt")!.textContent,
      voices: voices.length,
    };
  });
  expect(reward.earned).toBe(120);
  expect(reward.coins).toBe(2180);
  expect(reward.receipt).toContain("+120 COINS");
  expect(reward.animations).toBe(1);
  expect(reward.burst).toBe(3);
  expect(reward.voices).toBe(3);
  await expect(page.locator("#budget")).toContainText(/2['’]180/);
  await expect(page.locator("#funding-receipt")).toBeHidden();
  const notes = await page.evaluate(() => (window as any).fundingFixture.notes);
  expect(notes).toHaveLength(3);
  [659.25, 987.77, 1318.51].forEach((note, i) =>
    expect(notes[i]).toBeCloseTo(note, 2),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const muted = await page.evaluate(async () => {
    const f = (window as any).fundingFixture;
    f.audio.toggleMuted();
    const before = f.voices.length;
    f.audio.performAction(
      f.state,
      "absorb",
      { ...f.state.plots[0], y: 0 },
      0,
      50,
    );
    f.ui.render(f.state, 0, true);
    return {
      notes: f.voices.length - before,
      animations: document.querySelector("#coin-wallet")!.getAnimations()
        .length,
      burst: document.querySelector("#coin-burst")!.childElementCount,
    };
  });
  expect(muted).toEqual({ notes: 0, animations: 0, burst: 0 });
  await expect(page.locator("#funding-receipt")).toContainText("+10 COINS");
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 640 },
    { width: 1024, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    const wallet = (await page.locator("#coin-wallet").boundingBox())!;
    const mission = (await page.locator("#mission").boundingBox())!;
    const meters = (await page.locator("#city-hud").boundingBox())!;
    expect(wallet.x).toBeGreaterThan(0);
    expect(wallet.x + wallet.width).toBeLessThanOrEqual(viewport.width);
    expect(wallet.y + wallet.height).toBeLessThan(mission.y);
    expect(
      wallet.x >= meters.x + meters.width ||
        wallet.y + wallet.height <= meters.y,
    ).toBe(true);
    const size = await page
      .locator("#budget")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(28);
  }
  await page.screenshot({ path: "/tmp/sponge-funding-wallet.png" });
});
