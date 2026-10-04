import { Color, Mesh, MeshStandardMaterial, type Group } from "three";
import { cityConfig } from "../../config/city.ts";
import { gameConfig } from "../../config/game.ts";
import type { ModelConfig } from "../interfaces.ts";

export const spongeEyeBlue = 0x639bff;
const dryEyeColor = new Color(0x27364c);
interface SpongeMorphMesh {
  mesh: Mesh;
  dryIndex: number;
  waterFullIndex: number;
}
interface SpongeVisualWeights {
  dry: number;
  waterFull: number;
}
const spongeMorphMeshes = new WeakMap<Group, SpongeMorphMesh[]>();
const spongeEyeMaterials = new WeakMap<
  Group,
  { material: MeshStandardMaterial; healthyColor: Color }[]
>();
const spongeVisualWeights = new WeakMap<Group, SpongeVisualWeights>();

/** Slightly lighten only the imported SpongeBob iris material. */
export function applySpongeEyeTint(model: Group): number {
  let tinted = 0;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      if (
        material.name.toLowerCase() !== "iris export" ||
        !(material instanceof MeshStandardMaterial)
      )
        continue;
      material.color.setHex(spongeEyeBlue);
      tinted++;
    }
  });
  return tinted;
}

/** Load a Blender glTF/GLB export without changing gameplay or collision rules. */
export async function loadModel(config: ModelConfig): Promise<Group> {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { scene } = await new GLTFLoader().loadAsync(config.url);
  applySpongeEyeTint(scene);
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
  deltaSeconds?: number,
): void {
  const target = spongeWaterMorphWeights(sponge, capacity, temperature);
  let morphMeshes = spongeMorphMeshes.get(model);
  if (!morphMeshes) {
    morphMeshes = [];
    const eyeMaterials: {
      material: MeshStandardMaterial;
      healthyColor: Color;
    }[] = [];
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.morphTargetDictionary && object.morphTargetInfluences) {
        const dryIndex = object.morphTargetDictionary.Dry;
        const waterFullIndex = object.morphTargetDictionary.WaterFull;
        if (dryIndex !== undefined && waterFullIndex !== undefined)
          morphMeshes!.push({ mesh: object, dryIndex, waterFullIndex });
      }
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (let index = 0; index < materials.length; index++) {
        const material = materials[index];
        if (
          material.name.toLowerCase() !== "iris export" ||
          !(material instanceof MeshStandardMaterial)
        )
          continue;
        const eyeMaterial = material.clone();
        if (Array.isArray(object.material))
          object.material[index] = eyeMaterial;
        else object.material = eyeMaterial;
        eyeMaterials.push({
          material: eyeMaterial,
          healthyColor: eyeMaterial.color.clone(),
        });
      }
    });
    if (morphMeshes.length === 0) {
      throw new Error(
        "The Blender character is missing Dry and WaterFull morph targets.",
      );
    }
    spongeMorphMeshes.set(model, morphMeshes);
    spongeEyeMaterials.set(model, eyeMaterials);
  }
  const previous = spongeVisualWeights.get(model) ?? target;
  const blend =
    deltaSeconds === undefined
      ? 1
      : 1 -
        Math.exp(
          -gameConfig.waterVisualResponsePerSecond * Math.max(0, deltaSeconds),
        );
  const current = {
    dry: easedWeight(previous.dry, target.dry, blend),
    waterFull: easedWeight(previous.waterFull, target.waterFull, blend),
  };
  spongeVisualWeights.set(model, current);
  for (const { mesh, dryIndex, waterFullIndex } of morphMeshes) {
    mesh.morphTargetInfluences![dryIndex] = current.dry;
    mesh.morphTargetInfluences![waterFullIndex] = current.waterFull;
  }
  for (const { material, healthyColor } of spongeEyeMaterials.get(model) ?? [])
    material.color.copy(healthyColor).lerp(dryEyeColor, current.dry);
}

function easedWeight(current: number, target: number, blend: number): number {
  const next = current + (target - current) * blend;
  return Math.abs(target - next) < 0.0005 ? target : next;
}

export function spongeWaterMorphWeights(
  sponge: number,
  capacity: number,
  temperature: number,
): { dry: number; waterFull: number } {
  const fill = Math.max(0, Math.min(1, capacity > 0 ? sponge / capacity : 0));
  const waterDry = fill < 0.5 ? Math.pow(Math.max(0, 1 - fill * 2), 0.45) : 0;
  const fullProgress = Math.max(0, Math.min(1, (fill - 0.5) * 2));
  const waterFull = fullProgress * fullProgress * (3 - 2 * fullProgress);
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
