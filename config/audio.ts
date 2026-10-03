import type { CitySound } from "../src/interfaces";

/** @aureaphi's uploaded clips, named by their gameplay context. */
export const citySounds: Record<CitySound, { file: string; volume: number }> = {
  absorb: { file: "absorb.wav", volume: 0.55 },
  spray: { file: "spray.wav", volume: 0.5 },
  tree: { file: "plant-tree.wav", volume: 0.7 },
  build: { file: "build.wav", volume: 0.6 },
  pond: { file: "pond.wav", volume: 0.55 },
  rain: { file: "rain.wav", volume: 0.25 },
  asphalt: { file: "unseal-asphalt.wav", volume: 0.65 },
  tank: { file: "water-storage.wav", volume: 0.55 },
};
