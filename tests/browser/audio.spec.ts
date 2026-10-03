import { registerTestAccount } from "./account-fixture";
test.beforeEach(async ({ page }) => {
  await registerTestAccount(page);
});
import { enterCampaign } from "./campaign-entry";
import { expect, test } from "@playwright/test";

test("all sound assets decode and contextual audio respects success, pause and mute", async ({
  page,
}) => {
  await page.goto("/");
  await enterCampaign(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  const result = await page.evaluate(async () => {
    // Load the same controller and rules used by the mission, with real browser media.
    const audioPath = "/src/game/audio.ts";
    const cityPath = "/src/game/city.ts";
    const [{ CityAudio }, { createCity }] = await Promise.all([
      import(audioPath),
      import(cityPath),
    ]);
    const clips: HTMLAudioElement[] = [];
    const calls: string[] = [];
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(url?: string) {
        super(url);
        clips.push(this);
      }
      override play(): Promise<void> {
        calls.push(this.src.split("/").pop()!);
        return super.play();
      }
    };
    const audio = new CityAudio();
    window.Audio = NativeAudio;
    await Promise.all(
      clips.map(
        (clip) =>
          new Promise<void>((resolve, reject) => {
            if (clip.readyState >= 1) return resolve();
            clip.addEventListener("loadedmetadata", () => resolve(), {
              once: true,
            });
            clip.addEventListener("error", () => reject(new Error(clip.src)), {
              once: true,
            });
          }),
      ),
    );
    const state = createCity();
    const plot = state.plots[0];
    const position = { x: plot.x, y: 0, z: plot.z };
    audio.performAction(state, "tree", position, plot.id);
    const failedActionCalls = calls.length;
    audio.performAction(state, "karate", position, plot.id);
    audio.performAction(state, "tree", position, plot.id);
    audio.performAction(state, "absorb", position, plot.id, 30);
    audio.update(true, false);
    audio.performAction(state, "spray", position, plot.id, 20);
    audio.update(true, false);
    plot.kind = "soil";
    audio.performAction(state, "roof", position, plot.id);
    plot.kind = "soil";
    audio.performAction(state, "pond", position, plot.id);
    plot.kind = "soil";
    audio.performAction(state, "tank", position, plot.id);
    audio.update(true, true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const rainPlaying =
      clips.find((clip) => clip.src.endsWith("rain.wav"))!.paused === false;
    const rainVolume = clips.find((clip) =>
      clip.src.endsWith("rain.wav"),
    )!.volume;
    const stageCalls: string[] = [];
    const stageFiles = [
      "18_stage_1_calm.wav",
      "19_stage_2_active.wav",
      "20_stage_3_pressure.wav",
      "21_stage_4_panic.wav",
    ];
    const levels = ["riehenring", "erlenmatt", "st-johann", "voltanord"];
    for (const [i, level] of levels.entries()) {
      audio.update(true, false, level);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const playing = clips.filter(
        (clip) =>
          stageFiles.some((file) => clip.src.endsWith(file)) && !clip.paused,
      );
      if (playing.length !== 1 || !playing[0].src.endsWith(stageFiles[i]))
        throw new Error(`Wrong stage music for ${level}`);
      stageCalls.push(stageFiles[i]);
    }
    audio.update(false, false);
    const paused = clips.every((clip) => clip.paused && clip.currentTime === 0);
    audio.toggleMuted();
    const beforeMuted = calls.length;
    audio.update(true, true);
    const muted = calls.length === beforeMuted;
    audio.toggleMuted();
    audio.update(true, true);
    audio.update(true, false);
    const dry = clips.find((clip) => clip.src.endsWith("rain.wav"))!.paused;
    audio.update(false, false);
    return {
      failedActionCalls,
      calls,
      paused,
      muted,
      dry,
      rainPlaying,
      rainVolume,
      stageCalls,
      durations: clips.map((clip) => clip.duration),
    };
  });
  expect(result.failedActionCalls).toBe(0);
  expect(new Set(result.calls)).toEqual(
    new Set([
      "unseal-asphalt.wav",
      "plant-tree.wav",
      "absorb.wav",
      "spray.wav",
      "build.wav",
      "pond.wav",
      "water-storage.wav",
      "rain.wav",
      "18_stage_1_calm.wav",
      "19_stage_2_active.wav",
      "20_stage_3_pressure.wav",
      "21_stage_4_panic.wav",
    ]),
  );
  expect(result.durations.every((duration) => duration > 0)).toBe(true);
  expect(result.rainPlaying).toBe(true);
  expect(result.rainVolume).toBe(0.08);
  expect(result.stageCalls).toHaveLength(4);
  expect(result.paused).toBe(true);
  expect(result.muted).toBe(true);
  expect(result.dry).toBe(true);
  await page.keyboard.press("KeyM");
  await expect(page.locator("#sound-toggle")).toHaveText("Sound: off");
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveText("Sound: on");
});
