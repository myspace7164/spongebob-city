import type { CitySound } from "../src/interfaces.ts";

/** @aureaphi's uploaded clips, named by their gameplay context. */
export const citySounds: Record<CitySound, { file: string; volume: number }> = {
  absorb: { file: "absorb.wav", volume: 0.55 },
  spray: { file: "spray.wav", volume: 0.5 },
  tree: { file: "plant-tree.wav", volume: 0.7 },
  build: { file: "build.wav", volume: 0.6 },
  pond: { file: "pond.wav", volume: 0.55 },
  rain: { file: "rain.wav", volume: 0.08 },
  asphalt: { file: "unseal-asphalt.wav", volume: 0.65 },
  tank: { file: "water-storage.wav", volume: 0.55 },
};

/** Supplied stage tracks follow the four neighbourhoods; stage five is reserved. */
export const levelSounds: Record<string, { file: string; volume: number }> = {
  riehenring: { file: "18_stage_1_calm.wav", volume: 0.22 },
  erlenmatt: { file: "19_stage_2_active.wav", volume: 0.22 },
  "st-johann": { file: "20_stage_3_pressure.wav", volume: 0.22 },
  voltanord: { file: "21_stage_4_panic.wav", volume: 0.22 },
};
