import { Mesh, type Group } from "three";
import { cityConfig } from "../../config/city.ts";
import type { ModelConfig } from "../interfaces.ts";

/** Load a Blender glTF/GLB export without changing gameplay or collision rules. */
export async function loadModel(config: ModelConfig): Promise<Group> {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { scene } = await new GLTFLoader().loadAsync(config.url);
  scene.scale.setScalar(config.scale);
  scene.rotation.y = config.rotationY;
  return scene;
}

/** Map the finite sponge water store onto exclusive Blender shape-key states. */
export function updateSpongeWaterState(
  model: Group,
  sponge: number,
  capacity: number,
  temperature = 27,
): void {
  const { dry, waterFull } = spongeWaterMorphWeights(
    sponge,
    capacity,
    temperature,
  );
  let morphMeshes = 0;
  model.traverse((object) => {
    if (
      !(object instanceof Mesh) ||
      !object.morphTargetDictionary ||
      !object.morphTargetInfluences
    )
      return;
    const dryIndex = object.morphTargetDictionary.Dry;
    const fullIndex = object.morphTargetDictionary.WaterFull;
    if (dryIndex === undefined || fullIndex === undefined) return;
    object.morphTargetInfluences[dryIndex] = dry;
    object.morphTargetInfluences[fullIndex] = waterFull;
    morphMeshes += 1;
  });
  if (morphMeshes === 0) {
    throw new Error(
      "The Blender character is missing Dry and WaterFull morph targets.",
    );
  }
}

export function spongeWaterMorphWeights(
  sponge: number,
  capacity: number,
  temperature: number,
): { dry: number; waterFull: number } {
  const fill = Math.max(0, Math.min(1, capacity > 0 ? sponge / capacity : 0));
  const waterDry = fill <= 0.5 ? 1 - fill * 2 : 0;
  const waterFull = fill > 0.5 ? (fill - 0.5) * 2 : 0;
  const { dryThresholdCelsius, dryFullCelsius, dryStartInfluence } =
    cityConfig.heatSystem;
  const heatProgress = Math.max(
    0,
    Math.min(
      1,
      (temperature - dryThresholdCelsius) /
        (dryFullCelsius - dryThresholdCelsius),
    ),
  );
  const heatDry =
    temperature < dryThresholdCelsius
      ? 0
      : dryStartInfluence + (1 - dryStartInfluence) * heatProgress;
  return {
    dry: waterDry + (1 - waterDry) * heatDry,
    waterFull: waterFull * (1 - heatDry),
  };
}
