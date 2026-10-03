import type { InventoryItem } from "../src/interfaces.ts";
/** Replace these definitions as the real inventory takes shape. */
export const inventoryItems: readonly InventoryItem[] = [
  {
    id: "panhandle",
    name: "Panhandle",
    action: "placeholder",
    description:
      "Equip-only placeholder. Its eventual behavior is yours to define.",
  },
  {
    id: "glock",
    name: "Glock",
    action: "shoot",
    description: "Click to fire at the orange targets. F reloads.",
  },
  {
    id: "block",
    name: "Block",
    action: "place",
    description: "Aim at the ground and click to place a block.",
  },
];
export const itemConfig = {
  magazineSize: 12,
  shotCooldown: 0.18,
  range: 80,
  placementReach: 8,
  blockSize: 1,
  maxBlocks: 100,
  tracerLifetime: 0.09,
  targetSize: 1.3,
};
