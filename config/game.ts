/** Tune movement and optional Blender exports here. Distances are in meters. */
export const gameConfig = {
  walkSpeed: 5,
  runSpeed: 9,
  sprintDurationSeconds: 10,
  sprintCooldownSeconds: 3,
  /** Water lost while sprinting, in litres per second. */
  sprintSweatLitresPerSecond: 5,
  acceleration: 18,
  gravity: 24,
  jumpSpeed: 9,
  /** Feet-centered body capsule approximated by an XZ circle and vertical span. */
  playerCollisionRadius: 0.38,
  playerCollisionHeight: 1.55,
  fixedStep: 1 / 60,
  maxFrameTime: 0.1,
  mouseSensitivity: 0.0025,
  keyboardLookSpeed: 1.8,
  cameraDistance: 7,
  cameraTargetHeight: 1.2,
  maxPixelRatio: 1.5,
  /** Camera draw distance; the whole map is loaded, so this sets how far you see. */
  viewDistance: 700,
  groundSize: 240,
  gridSpacing: 2,
  character: { url: "/models/spongebob.glb", scale: 1, rotationY: 0 },
  level: { url: "/models/basel-city.glb", scale: 1, rotationY: 0 },
  /** Sky, sun and rain looks; purely visual, the simulation lives in config/city.ts. */
  weatherVisuals: {
    /** Fog fades the map edge; it pulls in during rain so storms feel heavy. */
    fog: { dry: { near: 250, far: 600 }, rain: { near: 50, far: 200 } },
    /** Seconds rain takes to fade in or out. */
    rainFadeSeconds: 1.5,
    sun: {
      distance: 400,
      /** Direction of the visible disc; low enough to see behind the player. */
      direction: { x: 0.45, y: 0.2, z: -0.87 },
      discRadius: 14,
      glowSize: 110,
      /** Light strength at zero heat and at full heat. */
      intensity: { cool: 2.3, hot: 3.6 },
      /** How far the sky tints toward --heat-sky at full heat (0 to 1). */
      skyHeatTint: 0.75,
    },
    rain: {
      maxDrops: 1600,
      reducedMotionDrops: 500,
      /** Square area around the player that rain covers, in metres. */
      area: 64,
      height: 18,
      fallSpeed: 22,
      streakLength: 1.4,
      /** Sideways drift per metre of fall. */
      wind: 0.18,
      opacity: 0.75,
      splashes: 40,
      splashSeconds: 0.45,
    },
  },
};
