import { cityConfig } from "./city.ts";
import type { PowerupKind } from "../src/interfaces.ts";
/** Fictional short gameplay boosts inspired by Basel food, river and traditions. */
export const powerupConfig = {
  pickupRadius: 1.3,
  sprintMultiplier: 1.5,
  fundingMultiplier: 2,
  transferMultiplier: 2,
  reachMultiplier: 2,
  dropSeconds: 60,
  lanternCooling: 0.02,
  items: [
    {
      id: "laeckerli",
      name: "Läckerli Rush",
      icon: "🍪",
      duration: 14,
      description: "Basel’s spiced biscuit: sprint 50% faster.",
    },
    {
      id: "confetti",
      name: "Confetti Funding",
      icon: "🎊",
      duration: 18,
      description: "Fasnacht confetti: double useful-action funding.",
    },
    {
      id: "rhine",
      name: "Rhine Flow",
      icon: "🌊",
      duration: 16,
      description: "Ride the river: absorb and spray twice as fast.",
    },
    {
      id: "basilisk",
      name: "Basilisk Guard",
      icon: "🐉",
      duration: 18,
      description: "Basel’s guardian: block Dr. Beton’s sabotage.",
    },
    {
      id: "lantern",
      name: "Fasnacht Lantern",
      icon: "🏮",
      duration: 18,
      description:
        "A cool carnival glow: extra gradual cooling for 18 seconds.",
    },
    {
      id: "bell",
      name: "Münster Bell",
      icon: "🔔",
      duration: 16,
      description: "Cathedral chimes: reach plots twice as far away.",
    },
    {
      id: "pore",
      name: "Pore Power",
      icon: "🧽",
      duration: cityConfig.powerDuration,
      description: "Super sponge: hold 1,400 L of water for 12 seconds.",
    },
    {
      id: "patrick",
      name: "Patrick Smash",
      icon: "⭐",
      duration: 12,
      description:
        "Patrick clears nearby asphalt every 2 seconds for 12 seconds.",
    },
    {
      id: "maximum",
      name: "Maximum Sponge",
      icon: "💪",
      duration: cityConfig.maximumDuration,
      description:
        "Giant sponge: 4,000 L capacity and area absorption for 8 seconds.",
    },
    {
      id: "bubbles",
      name: "Sandy Bubbles",
      icon: "🫧",
      duration: 18,
      description: "Hold B: water distant plants with bubbles for 18 seconds.",
    },
  ] satisfies {
    id: PowerupKind;
    name: string;
    icon: string;
    duration: number;
    description: string;
  }[],
};
