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
  groundSize: 240,
  gridSpacing: 2,
  character: { url: "/models/spongebob.glb", scale: 1, rotationY: 0 },
  level: { url: "/models/basel-city.glb", scale: 1, rotationY: 0 },
};
