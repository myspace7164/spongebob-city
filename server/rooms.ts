import {
  chooseLevelModifier,
  modifierMultiplier,
} from "../src/game/level-modifiers";
import { isEmoteId, startEmote } from "../src/game/emotes";
import { isToolAvailable } from "../src/game/progression";
import {
  collectPowerups,
  isPowerupActive,
  activatePowerup,
  powerupMultiplier,
} from "../src/game/powerups";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { gameConfig } from "../config/game";
import { hats } from "../config/hats";
import {
  createCampaign,
  currentLevel,
  startNextCampaignLevel,
  levelPosition,
  connectRunoff,
  recyclePlot,
} from "../src/game/campaign";
import {
  performCityAction,
  sweatDuringSprint,
  updateCity,
} from "../src/game/city";
import { createPlayer, updatePlayer } from "../src/game/player";
import {
  buildingColliders,
  circleCollider,
  CollisionWorld,
  transformCollider,
  type SolidCollider,
} from "../src/game/collisions";
import { gameplayColliders } from "../src/game/world-colliders";
import { treeColliders, treesNear, type TreeRow } from "../src/game/trees";
import {
  assignElevations,
  heightAt,
  levelScenery,
  terrainFromBuffer,
} from "../src/game/terrain";
import { cityConfig, cityTools } from "../config/city";
import { clampToLevel, worldToMap } from "../src/game/streets";
import type {
  Account,
  OnlinePlayer,
  OnlineCommand,
  RoomSnapshot,
  TerrainGrid,
  CityState,
} from "../src/interfaces";
import type { AccountStore } from "./store";
const idle = () => ({ forward: 0, right: 0, run: false, jump: false });
interface Member {
  public: OnlinePlayer;
  input: OnlineCommand;
  seen: number;
  lastAction: number;
  source: number | null;
}
interface Room {
  code: string;
  hostId: string;
  run: string;
  revision: number;
  city: CityState;
  checkpoint: CityState;
  members: Map<string, Member>;
  touched: number;
}
const actions = new Set([
  "absorb",
  "spray",
  "karate",
  "tree",
  "basin",
  "roof",
  "pond",
  "shade",
  "tank",
  "machine",
  "upgrade",
  "connect",
  "recycle",
  "reset",
]);
let baselBuildingFootprints: Promise<SolidCollider[]> | undefined;
function loadBaselBuildingFootprints(): Promise<SolidCollider[]> {
  baselBuildingFootprints ??= (async () => {
    const data = readFileSync("public/models/basel-city.glb");
    const binary = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );
    const model = await new GLTFLoader().parseAsync(binary, "");
    return buildingColliders(model.scene);
  })();
  return baselBuildingFootprints;
}
/** One authoritative simulation per room. Shared funding and reservoir are cooperative resources. */
export class Rooms {
  private rooms = new Map<string, Room>();
  private membership = new Map<string, string>();
  private terrain: TerrainGrid | null = null;
  private trees: TreeRow[] = [];
  private buildings: SolidCollider[] = [];
  private staticWorlds = new Map<number, CollisionWorld>();
  constructor(private store: AccountStore) {
    try {
      const meta = JSON.parse(
        readFileSync("public/maps/basel-terrain.json", "utf8"),
      );
      const data = readFileSync("public/maps/basel-terrain.bin");
      this.terrain = terrainFromBuffer(
        meta,
        data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      );
    } catch {
      /* Flat scenery fallback, as in the client. */
    }
    try {
      this.trees = JSON.parse(
        readFileSync("public/maps/basel-trees.json", "utf8"),
      ).trees as TreeRow[];
    } catch {
      /* Tree collisions are omitted if the map data is unavailable. */
    }
    void loadBaselBuildingFootprints()
      .then((colliders) => {
        this.buildings = colliders;
        this.staticWorlds.clear();
      })
      .catch(() => {
        /* Gameplay remains usable with local structure colliders. */
      });
  }
  create(account: Account): RoomSnapshot {
    const previous = this.room(account.id);
    if (previous)
      throw new Error("Leave your current room before creating another.");
    if (this.rooms.size >= 100)
      throw new Error("All rooms are busy. Try again shortly.");
    let code: string;
    do {
      code = randomBytes(3).toString("hex").toUpperCase();
    } while (this.rooms.has(code));
    const city = createCampaign();
    assignElevations(
      city,
      levelScenery(currentLevel(city), this.terrain).groundAt,
    );
    const room: Room = {
      code,
      hostId: account.id,
      run: randomUUID(),
      revision: 0,
      city,
      checkpoint: structuredClone(city),
      members: new Map(),
      touched: Date.now(),
    };
    this.rooms.set(code, room);
    return this.join(account, code);
  }
  join(account: Account, code: string): RoomSnapshot {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error("Room not found. Check the code.");
    const previous = this.room(account.id);
    if (previous && previous !== room)
      throw new Error("Leave your current room first.");
    if (!room.members.has(account.id)) {
      if (room.members.size >= 4)
        throw new Error("This room is full (4 players).");
      const player = createPlayer();
      Object.assign(player.position, levelPosition(room.city, player.position));
      player.position.x += room.members.size * 1.2;
      player.position.y = levelScenery(
        currentLevel(room.city),
        this.terrain,
      ).groundAt(player.position.x, player.position.z);
      room.members.set(account.id, {
        public: { ...account, player, selected: "absorb", ready: false },
        input: { movement: idle(), yaw: 0 },
        seen: Date.now(),
        lastAction: 0,
        source: null,
      });
      this.membership.set(account.id, room.code);
    }
    this.touch(account.id);
    return this.snapshot(room);
  }
  room(id: string): Room | undefined {
    return this.rooms.get(this.membership.get(id) ?? "");
  }
  touch(id: string): void {
    const room = this.room(id);
    const m = room?.members.get(id);
    if (m) {
      m.seen = Date.now();
      room!.touched = m.seen;
    }
  }
  current(id: string): RoomSnapshot | null {
    const room = this.room(id);
    return room ? this.snapshot(room) : null;
  }
  leave(id: string): void {
    const room = this.room(id);
    if (!room) return;
    room.members.delete(id);
    this.membership.delete(id);
    if (room.hostId === id)
      room.hostId = room.members.keys().next().value ?? "";
    if (!room.members.size) this.rooms.delete(room.code);
    else room.revision++;
  }
  command(id: string, command: OnlineCommand): void {
    const room = this.room(id),
      m = room?.members.get(id);
    if (!room || !m) throw new Error("Join a room first.");
    this.touch(id);
    if (command.selected && cityTools.some((t) => t.id === command.selected)) {
      if (!isToolAvailable(room.city, command.selected))
        throw new Error("This tool is locked for the current level.");
      m.public.selected = command.selected;
    }
    if (typeof command.ready === "boolean") {
      m.public.ready = command.ready;
      if (!command.ready) {
        m.input.movement = idle();
        m.source = null;
      }
    }
    if (command.movement) {
      const input = command.movement;
      if (
        !Number.isFinite(input.forward) ||
        !Number.isFinite(input.right) ||
        Math.abs(input.forward) > 1 ||
        Math.abs(input.right) > 1 ||
        !Number.isFinite(command.yaw)
      )
        throw new Error("Invalid movement.");
      m.input.movement = {
        forward: input.forward,
        right: input.right,
        run: input.run === true,
        jump: input.jump === true,
      };
      m.input.yaw = command.yaw;
    }
    if (command.emote !== undefined) {
      if (!isEmoteId(command.emote)) throw new Error("Unknown emote.");
      if (room.city.outcome === "playing" && m.public.ready) {
        startEmote(m.public.player, command.emote);
        room.revision++;
      }
    }
    if (command.powerup === true) {
      activatePowerup(room.city);
      room.revision++;
    }
    if (command.equippedHat !== undefined) {
      if (
        command.equippedHat !== null &&
        !hats.some((hat) => hat.id === command.equippedHat)
      )
        throw new Error("Unknown hat.");
      if (room.city.campaign) {
        room.city.campaign.equippedHat = command.equippedHat;
        room.revision++;
      }
    }
    if (!command.action) return;
    if (!actions.has(command.action)) throw new Error("Unknown action.");
    if (command.action === "reset") {
      if (room.hostId !== id)
        throw new Error("Only the room leader can retry.");
      if (room.city.outcome === "playing")
        throw new Error("Finish this attempt before retrying.");
      room.city =
        room.city.outcome === "won"
          ? createCampaign()
          : structuredClone(room.checkpoint);
      room.run = randomUUID();
      this.newLevel(room);
      return;
    }
    if (!m.public.ready || Date.now() - m.lastAction < 95) return;
    m.lastAction = Date.now();
    if (
      command.target !== null &&
      command.target !== undefined &&
      (!Number.isInteger(command.target) ||
        command.target < 0 ||
        command.target >= room.city.plots.length)
    )
      throw new Error("Invalid plot.");
    const city = room.city,
      before = city.funding.earned;
    city.selected = m.public.selected;
    city.campaign!.connectFrom = m.source;
    if (command.action === "connect")
      connectRunoff(city, command.target ?? null, m.public.player.position);
    else if (command.action === "recycle")
      recyclePlot(city, command.target ?? null, m.public.player.position);
    else
      performCityAction(
        city,
        command.action,
        m.public.player.position,
        command.target ?? null,
        command.action === "absorb"
          ? cityConfig.absorbRate * 0.1
          : cityConfig.sprayRate * 0.1,
        command.bubbles === true &&
          (city.upgraded || isPowerupActive(city, "bubbles")),
      );
    m.source = city.campaign!.connectFrom;
    city.campaign!.connectFrom = null;
    const earned = city.funding.earned - before;
    if (earned > 0)
      this.store.reward(
        id,
        `${room.run}:${city.campaign!.level}:${city.funding.claimed.at(-1)}`,
        earned,
      );
    room.revision++;
  }
  private newLevel(room: Room): void {
    const ground = levelScenery(currentLevel(room.city), this.terrain).groundAt;
    assignElevations(room.city, ground);
    room.checkpoint = structuredClone(room.city);
    for (const m of room.members.values()) {
      m.public.ready = false;
      m.input.movement = idle();
      m.source = null;
      m.public.player = createPlayer();
      Object.assign(
        m.public.player.position,
        levelPosition(room.city, m.public.player.position),
      );
      m.public.player.position.y = ground(
        m.public.player.position.x,
        m.public.player.position.z,
      );
    }
    room.revision++;
  }
  tick(dt = 0.05): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      for (const [id, m] of room.members)
        if (now - m.seen > 90000) this.leave(id);
      if (!room.members.size) continue;
      const ground = levelScenery(
        currentLevel(room.city),
        this.terrain,
      ).groundAt;
      const collisionWorld = this.staticWorld(room.city);
      let active = false;
      for (const [id, m] of room.members) {
        if (now - m.seen > 2000) {
          m.input.movement = idle();
          m.public.ready = false;
        }
        if (!m.public.ready) continue;
        active = true;
        collisionWorld.setDynamic([
          ...gameplayColliders(room.city, ground, this.buildings.length === 0),
          ...[...room.members.entries()]
            .filter(([otherId]) => otherId !== id)
            .map(([, other]) => {
              const point = other.public.player.position;
              return circleCollider(
                `online-player-${other.public.id}`,
                point.x,
                point.z,
                gameConfig.playerCollisionRadius,
                point.y,
                point.y + gameConfig.playerCollisionHeight,
                "character",
              );
            }),
        ]);
        updatePlayer(
          m.public.player,
          m.input.movement ?? idle(),
          m.input.yaw ?? 0,
          dt,
          ground,
          modifierMultiplier(room.city, "playerSpeed"),
          collisionWorld,
          powerupMultiplier(room.city, "laeckerli"),
        );
        sweatDuringSprint(room.city, m.public.player, dt);
        m.input.movement!.jump = false;
        const origin = levelPosition(room.city, { x: 0, z: 0 });
        const local = {
          ...m.public.player.position,
          x: m.public.player.position.x - origin.x,
          z: m.public.player.position.z - origin.z,
        };
        clampToLevel(local, currentLevel(room.city)?.site);
        m.public.player.position.x = local.x + origin.x;
        m.public.player.position.z = local.z + origin.z;
        collectPowerups(room.city, m.public.player.position);
      }
      if (active && room.city.outcome === "playing") {
        const level = room.city.campaign!.level;
        collisionWorld.setDynamic([
          ...gameplayColliders(room.city, ground, this.buildings.length === 0),
          ...[...room.members.values()].map((member) => {
            const point = member.public.player.position;
            return circleCollider(
              `online-player-${member.public.id}`,
              point.x,
              point.z,
              gameConfig.playerCollisionRadius,
              point.y,
              point.y + gameConfig.playerCollisionHeight,
              "character",
            );
          }),
        ]);
        // Automatic collection belongs to the team; personal rankings only count explicit useful actions.
        const collector = [...room.members.values()].find(
          (m) => m.public.ready,
        )!;
        updateCity(
          room.city,
          dt,
          collector.public.player.position,
          collisionWorld,
          ground,
        );
        if (room.city.campaign!.wheelPending) {
          room.city.campaign!.pendingModifier = chooseLevelModifier();
          startNextCampaignLevel(room.city);
        }
        if (room.city.campaign!.level !== level) this.newLevel(room);
        if ((room.city.outcome as string) === "won")
          for (const id of room.members.keys())
            this.store.reward(id, `${room.run}:win:${id}`, 0, 1);
      }
      room.revision++;
    }
  }
  private staticWorld(city: CityState): CollisionWorld {
    const levelIndex = city.campaign?.level ?? 0;
    const cached = this.staticWorlds.get(levelIndex);
    if (cached) return cached;
    const placed = levelScenery(currentLevel(city), this.terrain);
    const parent = new THREE.Group();
    parent.position.set(placed.x, placed.y, placed.z);
    parent.rotation.y = placed.rotationY;
    parent.updateMatrixWorld(true);
    const buildings = this.buildings.map((collider) =>
      transformCollider(collider, parent),
    );
    const plotPoints = city.plots.map((plot) =>
      worldToMap(placed, plot.x, plot.z),
    );
    const hiddenTrees = treesNear(this.trees, plotPoints, 3);
    const treeGround = this.terrain
      ? (x: number, z: number) => heightAt(this.terrain!, x, z)
      : () => 0;
    const trees = treeColliders(this.trees, treeGround, hiddenTrees).map(
      (collider) => transformCollider(collider, parent),
    );
    const world = new CollisionWorld();
    world.setStatic([...buildings, ...trees]);
    this.staticWorlds.set(levelIndex, world);
    return world;
  }
  private snapshot(room: Room): RoomSnapshot {
    return {
      code: room.code,
      hostId: room.hostId,
      revision: room.revision,
      city: structuredClone(room.city),
      players: [...room.members.values()].map((m) => structuredClone(m.public)),
    };
  }
}
