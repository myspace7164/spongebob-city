import { buildingCollisions } from "../../config/building-collisions.ts";
import { collisionConfig as c } from "../../config/collisions.ts";
import { cast, characterConfig } from "../../config/characters.ts";
import { castPosition } from "./cast.ts";
import { currentLevel, levelPosition } from "./campaign.ts";
import type {
  CityState,
  CollisionObstacle,
  PlayerState,
  Vector3State,
} from "../interfaces.ts";
export function cityObstacles(s: CityState): CollisionObstacle[] {
  const obstacles: CollisionObstacle[] = cast.map((_, index) => ({
    ...castPosition(s, index),
    radius: characterConfig.collisionRadius,
  }));
  obstacles.push({ x: s.saboteur.x, z: s.saboteur.z, radius: 0.9 });
  for (const p of s.plots) {
    if (p.kind === "tree") obstacles.push({ x: p.x, z: p.z, radius: 0.4 });
    if (p.kind === "tank") obstacles.push({ x: p.x, z: p.z, radius: 1 });
  }
  if (currentLevel(s)?.site) obstacles.push(...buildingCollisions);
  if (!currentLevel(s)?.site) {
    for (const x of [-18, 18])
      for (const z of [-3, -10, -17])
        obstacles.push({ ...levelPosition(s, { x, z }), halfX: 2.5, halfZ: 3 });
    for (let i = 0; i < 7; i++)
      obstacles.push({
        ...levelPosition(s, { x: (i - 3) * 5, z: -30 }),
        halfX: 2.3,
        halfZ: 2,
      });
  }
  return obstacles;
}
/** Small swept steps prevent sprint tunneling; projection permits sliding along walls. */
export function resolvePlayerCollisions(
  player: PlayerState,
  previous: Vector3State,
  obstacles: readonly CollisionObstacle[],
) {
  const dx = player.position.x - previous.x,
    dz = player.position.z - previous.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / c.maxStep));
  let x = previous.x,
    z = previous.z;
  for (let step = 0; step < steps; step++) {
    x += dx / steps;
    z += dz / steps;
    for (let pass = 0; pass < c.passes; pass++)
      for (const o of obstacles) {
        if (o.radius !== undefined) {
          const ox = x - o.x,
            oz = z - o.z,
            d = Math.hypot(ox, oz),
            r = o.radius + c.playerRadius;
          if (d < r) {
            x = o.x + (d ? ox / d : 1) * r;
            z = o.z + (d ? oz / d : 0) * r;
          }
        } else {
          const hx = (o.halfX ?? 0) + c.playerRadius,
            hz = (o.halfZ ?? 0) + c.playerRadius;
          const ox = x - o.x,
            oz = z - o.z;
          if (Math.abs(ox) < hx && Math.abs(oz) < hz) {
            if (hx - Math.abs(ox) < hz - Math.abs(oz))
              x = o.x + (ox < 0 ? -hx : hx);
            else z = o.z + (oz < 0 ? -hz : hz);
          }
        }
      }
  }
  if (Math.abs(x - player.position.x) > 0.0001) player.velocity.x = 0;
  if (Math.abs(z - player.position.z) > 0.0001) player.velocity.z = 0;
  player.position.x = x;
  player.position.z = z;
}
