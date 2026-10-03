import type { Group } from "three";
import type { ModelConfig } from "../interfaces";

/** Load a Blender glTF/GLB export without changing gameplay or collision rules. */
export async function loadModel(config: ModelConfig): Promise<Group> {
  const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
  const { scene } = await new GLTFLoader().loadAsync(config.url);
  scene.scale.setScalar(config.scale);
  scene.rotation.y = config.rotationY;
  return scene;
}
