/** Attachment points measured on the current 1.9 m Blender export. */
export const equipmentConfig = {
  importedShoulderX: 0.82,
  // The exported arm/sleeve centers sit slightly outside the shirt silhouette.
  // Pull each complete animated shoulder assembly into the torso edge.
  importedShoulderInset: 0.24,
  // The red sleeve's exported local center sits 0.056 m closer to the torso
  // than its blue/right counterpart, so its full pivot needs this mirror fix.
  importedLeftShoulderOutset: 0.056,
  importedShoulderY: 0.88,
  importedShoulderZ: -0.11,
  importedHipY: 0.44,
  importedHipX: 0.15,
  importedHand: [-0.5, 0, 0.04] as const,
  fallbackHand: [0, -0.5, 0.12] as const,
  relaxedArmAngle: 1.25,
  walkingFrequency: 8,
  sprintFrequency: 12,
  walkingSwing: 0.55,
  sprintSwing: 0.85,
  idleSpeed: 0.15,
};
