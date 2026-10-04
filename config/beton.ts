/** Cartoon antagonist timing and movement, in world metres/seconds. */
export const betonConfig = {
  roamSpeed: 1.8,
  attackSpeed: 3.2,
  arrivalDistance: 0.6,
  sealingSeconds: 1.2,
  laserChargeSeconds: 0.42,
  laserFireSeconds: 0.54,
  laserRecoverySeconds: 0.36,
  laserRange: 17,
  waypointSpread: 1.4,
  vehicleBoundaryMargin: 1.8,
  playerWaterInterruptReach: 4.5,
  waterInterruptSeconds: 3,
  levelPressure: {
    firstMoveMultiplier: 0.8,
    finalMoveMultiplier: 1.25,
    firstPauseMultiplier: 1.25,
    finalPauseMultiplier: 0.8,
  },
  /** Appearance only: the same villain grows visibly heavier at each stage. */
  appearance: {
    finalScale: 1.58,
    maxConcreteDarkening: 0.26,
    finalBumpScale: 0.075,
    finalBrowAngle: 0.9,
    finalBrowHeight: 1.26,
    eyeNarrowing: 0.28,
    finalEyeEmissive: 1.8,
    finalCrackEmissive: 1.8,
    finalFlameScale: 1.25,
  },
};
