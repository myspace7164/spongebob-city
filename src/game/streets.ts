import { cityConfig } from "../../config/city";
import type { LevelSite, Vector3State } from "../interfaces";

/** Real streets confine walking to their corridor; placeholder levels keep the square. */
export function clampToLevel(
  position: Vector3State,
  site: LevelSite | undefined,
): void {
  const b = site?.bounds ?? cityConfig.bounds;
  position.x = Math.min(b.maxX, Math.max(b.minX, position.x));
  position.z = Math.min(b.maxZ, Math.max(b.minZ, position.z));
}

/** Pose for the Basel scenery so the site's origin and street land on the play area. */
export function sceneryPose(site: LevelSite | undefined) {
  if (!site) return { rotationY: 0, x: 0, z: 0 };
  const [ox, oz] = site.origin;
  const c = Math.cos(site.heading),
    s = Math.sin(site.heading);
  return { rotationY: site.heading, x: -(c * ox + s * oz), z: s * ox - c * oz };
}

/** Inverse of sceneryPose: play-area metres back to map-local metres. */
export function playToMap(
  site: LevelSite,
  x: number,
  z: number,
): [number, number] {
  const c = Math.cos(site.heading),
    s = Math.sin(site.heading);
  return [site.origin[0] + c * x - s * z, site.origin[1] + s * x + c * z];
}
