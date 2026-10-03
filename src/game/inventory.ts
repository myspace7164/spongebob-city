import { inventoryItems, itemConfig } from "../../config/items.ts";
import type {
  InventoryState,
  PlacedBlock,
  Vector3State,
} from "../interfaces.ts";

export function createInventory(): InventoryState {
  return {
    items: inventoryItems,
    selected: 0,
    ammo: itemConfig.magazineSize,
    blocks: itemConfig.maxBlocks,
    cooldown: 0,
  };
}
export function selectSlot(inventory: InventoryState, slot: number): void {
  if (Number.isInteger(slot) && slot >= 0 && slot < inventory.items.length)
    inventory.selected = slot;
}
/** Spend one round only when the equipped item can shoot and its cooldown has elapsed. */
export function fire(inventory: InventoryState): boolean {
  if (
    inventory.items[inventory.selected].action !== "shoot" ||
    inventory.ammo <= 0 ||
    inventory.cooldown > 0
  )
    return false;
  inventory.ammo--;
  inventory.cooldown = itemConfig.shotCooldown;
  return true;
}
export function reload(inventory: InventoryState): void {
  if (inventory.items[inventory.selected].action === "shoot")
    inventory.ammo = itemConfig.magazineSize;
}
/** Validate grid placement against player overlap, duplicates, reach and capacity. */
export function canPlace(
  inventory: InventoryState,
  point: PlacedBlock,
  player: Vector3State,
  placed: readonly PlacedBlock[],
): boolean {
  return (
    inventory.items[inventory.selected].action === "place" &&
    inventory.blocks > 0 &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.z) &&
    Math.hypot(point.x - player.x, point.z - player.z) <=
      itemConfig.placementReach &&
    !(
      Math.abs(point.x - player.x) < 0.85 && Math.abs(point.z - player.z) < 0.85
    ) &&
    !placed.some((block) => block.x === point.x && block.z === point.z)
  );
}
