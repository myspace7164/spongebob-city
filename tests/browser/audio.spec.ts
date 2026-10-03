import { expect, test } from "@playwright/test";

test("all sound assets decode and contextual audio respects success, pause and mute", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#play").click();
  await page.keyboard.press("Escape");
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
    ]),
  );
  expect(result.durations.every((duration) => duration > 0)).toBe(true);
  expect(result.rainPlaying).toBe(true);
  expect(result.paused).toBe(true);
  expect(result.muted).toBe(true);
  expect(result.dry).toBe(true);
  await page.keyboard.press("KeyM");
  await expect(page.locator("#sound-toggle")).toHaveText("Sound: off");
  await page.locator("#sound-toggle").click();
  await expect(page.locator("#sound-toggle")).toHaveText("Sound: on");
});
