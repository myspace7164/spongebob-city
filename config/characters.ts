/** Shared cast routes, original voice tuning and collision dimensions. */
export const cast = [
  {
    id: "patrick",
    text: "Patrick: Find a power-up!",
    x: -11,
    z: -3,
    pitch: 125,
    speed: 0.23,
  },
  {
    id: "sandy",
    text: "Sandy: Upgrade here! [E]",
    x: -12,
    z: -12,
    pitch: 310,
    speed: 0.19,
  },
  {
    id: "squid",
    text: "Squidward: More shade!",
    x: 12,
    z: -5,
    pitch: 185,
    speed: 0.21,
  },
  {
    id: "krabs",
    text: "Mr. Krabs: Fund the city!",
    x: -11,
    z: 2,
    pitch: 95,
    speed: 0.17,
  },
] as const;
export const characterConfig = {
  wanderRadius: 1.4,
  collisionRadius: 0.65,
  voiceDistance: 13,
  voiceVolume: 0.045,
};
