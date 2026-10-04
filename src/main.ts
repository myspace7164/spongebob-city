import {
  createBuildingClearance,
  hiddenBuildingKeys,
} from "./game/building-clearance.ts";
import { EmoteUI } from "./ui/emotes.ts";
import { emoteConfig } from "../config/emotes.ts";
import { startEmote } from "./game/emotes.ts";
import { isToolAvailable } from "./game/progression.ts";
import * as THREE from "three";
import "./ui/style.css";
import { gameConfig } from "../config/game.ts";
import { cityConfig, cityTools } from "../config/city.ts";
import { GameInput, keyCode } from "./game/input.ts";
import { createPlayer, updatePlayer } from "./game/player.ts";
import { createWorld } from "./game/world.ts";
import { loadModel, updateSpongeWaterState } from "./game/assets.ts";
import {
  spongeCapacity,
  sweatDuringSprint,
  updateCity,
  weather,
} from "./game/city.ts";
import { loadMapLayers } from "./game/map-layers.ts";
import type { createTrees } from "./game/trees.ts";
import { styleBuildings } from "./game/building-style.ts";
import {
  connectRunoff,
  createCampaign,
  currentLevel,
  campaignLevel,
  startCampaignAt,
  levelPosition,
  recyclePlot,
  startNextCampaignLevel,
  startEndless,
} from "./game/campaign.ts";
import { clampToLevel, worldToMap } from "./game/streets.ts";
import { assignElevations, levelScenery } from "./game/terrain.ts";
import { CampaignUI } from "./ui/campaign.ts";
import { CreditsUI } from "./ui/credits.ts";
import { applyBuiltLevel } from "../config/levels.ts";
import type { createLevelBuilder } from "./ui/level-builder.ts";
import { CityAudio } from "./game/audio.ts";
import { createCityView } from "./game/city-view.ts";
import { CityUI } from "./ui/city.ts";
import {
  activatePowerup,
  powerupMultiplier,
  isPowerupActive,
} from "./game/powerups.ts";
import { createPowerupView } from "./game/powerup-view.ts";
import { PowerupUI } from "./ui/powerups.ts";
import { OnlineConnection, onlineRequest } from "./game/network.ts";
import { createRemotePlayers } from "./game/remote-players.ts";
import { OnlineUI } from "./ui/online.ts";
import { SurvivalRunTracker } from "./game/survival-run.ts";
import type {
  RoomSnapshot,
  CityAction,
  HatId,
  TerrainGrid,
} from "./interfaces.ts";
import { ModifierWheelUI } from "./ui/modifier-wheel.ts";
import {
  effectivePlayerVisualScale,
  modifierMultiplier,
} from "./game/level-modifiers.ts";
import { clearSavedHatCollection } from "./game/hat-collection.ts";
import { purchaseHat } from "./game/hats.ts";
import { HatShopUI } from "./ui/hat-shop.ts";
import { CollisionDebugView } from "./game/collision-debug.ts";
import {
  CollisionWorld,
  buildingColliders,
  circleCollider,
  transformCollider,
} from "./game/collisions.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const menu = document.querySelector<HTMLElement>("#menu")!;
const message = document.querySelector<HTMLElement>("#message")!;
const play = document.querySelector<HTMLButtonElement>("#play")!;
const crosshair = document.querySelector<HTMLElement>("#crosshair")!;

function startGame(): void {
  const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, gameConfig.maxPixelRatio));
  const scene = new THREE.Scene();
  const scenery = new THREE.Group();
  scene.add(scenery);
  const collisions = new CollisionWorld();
  const collisionDebug = new CollisionDebugView(
    scene,
    new URLSearchParams(location.search).get("debugCollisions") === "1",
  );
  const camera = new THREE.PerspectiveCamera(
    55,
    1,
    0.1,
    gameConfig.viewDistance,
  );
  const world = createWorld(scene);
  canvas.dataset.equippedHat = "none";
  const input = new GameInput(canvas);
  const audio = new CityAudio();
  const emoteUI = new EmoteUI();
  const soundToggle =
    document.querySelector<HTMLButtonElement>("#sound-toggle")!;
  soundToggle.addEventListener("click", () => {
    const muted = audio.toggleMuted();
    campaignUI.setMuted(muted);
    soundToggle.textContent = muted ? "Sound: off" : "Sound: on";
    soundToggle.setAttribute("aria-pressed", String(muted));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audio.update(false, false);
      if (!network.room) survivalRun.pause();
    } else if (input.active && !network.room && city.outcome === "playing") {
      survivalRun.start(city.campaign?.endlessRound ? "practice" : "solo");
    }
  });
  let city = createCampaign();
  world.equipHat(city.campaign?.equippedHat ?? null);
  canvas.dataset.equippedHat = city.campaign?.equippedHat ?? "none";
  const spawnPlayer = () => {
    const player = createPlayer();
    // Built levels may set their own spawn point and facing.
    const site = currentLevel(city)?.site;
    const [x, z] = site?.start ?? [0, 0];
    Object.assign(player.position, levelPosition(city, { x, z }));
    input.yaw = site?.startYaw ?? 0;
    return player;
  };
  let player = spawnPlayer();
  let checkpoint = structuredClone(city);
  let storyPending = true;
  const campaignUI = new CampaignUI(() => audio.playCampaignVictory());
  const creditsUI = new CreditsUI(() => enterEndless());
  function enterEndless() {
    if (network.room) {
      if (network.room.hostId === network.account?.id)
        void network.action({ action: "endless" });
      else
        document.getElementById("result-reason")!.textContent =
          "Waiting for the room leader to start endless mode.";
      return;
    }
    if (!startEndless(city)) return;
    player = spawnPlayer();
    checkpoint = structuredClone(city);
    placeScenery();
    creditsUI.reset();
    targetId = null;
    accumulator = 0;
    hudTime = 0;
    storyPending = true;
    ui.render(city, targetId, false);
    campaignUI.render(city);
    showStory();
  }
  const modifierWheel = new ModifierWheelUI(
    () => city,
    () => audio.playWheelStart(),
    () => audio.playWheelTick(),
    (positive) => audio.playWheelResult(positive),
    () => {
      if (!startNextCampaignLevel(city)) return;
      player = spawnPlayer();
      input.pitch = 0.28;
      targetId = null;
      accumulator = 0;
      hudTime = 0;
      checkpoint = structuredClone(city);
      placeScenery();
      storyPending = true;
      showStory();
    },
  );
  let characterModel: THREE.Group | null = null;
  const cityView = createCityView(scene, city);
  // Basel buildings, roads and photo move together so each level's street meets the play area.
  const levelStatus = document.querySelector<HTMLElement>("#level-status")!;
  let sceneryLoaded = false;
  let clearBuildings: ((s: typeof city) => void) | undefined;
  let terrain: TerrainGrid | null = null;
  let buildingModel: THREE.Group | null = null;
  let ground = levelScenery(currentLevel(city), terrain).groundAt;
  /** World height of the Basel terrain under a point; flat (0) until it loads. */
  const groundAt = (x: number, z: number) => ground(x, z);
  let trees: ReturnType<typeof createTrees> | undefined;
  const rebuildStaticCollisions = () => {
    scenery.updateMatrixWorld(true);
    const hidden = hiddenBuildingKeys(city);
    const buildings = buildingModel
      ? buildingColliders(buildingModel).filter(
          (b) => !hidden.has(b.id.split(":")[0]),
        )
      : [];
    const mapTrees =
      trees
        ?.colliders()
        .map((collider) => transformCollider(collider, scenery)) ?? [];
    const solids = [...buildings, ...mapTrees];
    collisions.setStatic(solids);
    collisionDebug.setStatic(solids);
  };
  const placeScenery = () => {
    const site = currentLevel(city)?.mapSite ?? currentLevel(city)?.site;
    clearBuildings?.(city);
    const placed = levelScenery(currentLevel(city), terrain);
    scenery.rotation.y = placed.rotationY;
    scenery.position.set(placed.x, placed.y, placed.z);
    ground = placed.groundAt;
    if (terrain) assignElevations(city, groundAt);
    // Real trees never stand on this level's unsealing spots.
    trees?.clearAround(city.plots.map((p) => worldToMap(placed, p.x, p.z)));
    rebuildStaticCollisions();
    if (sceneryLoaded)
      levelStatus.textContent = `Basel buildings loaded · ${site ? site.street : "fictional mission square"}`;
  };
  placeScenery();
  const ui = new CityUI(
    (tool) => {
      if (!isToolAvailable(city, tool)) return;
      city.selected = tool;
      selected = tool;
      ui.render(city, targetId, inReach());
    },
    () => {
      if (input.active && city.outcome === "playing") audio.playFunding();
    },
  );
  const powerupView = createPowerupView(scene);
  const powerupUI = new PowerupUI(() => {
    if (network.room) void network.action({ powerup: true });
    else activatePowerup(city);
    hudTime = 0;
  });
  const remotePlayers = createRemotePlayers(scene);
  let selected = city.selected;
  let receivedCode: string | null = null;
  let pendingJump = false;
  const network = new OnlineConnection(receiveRoom, (text) =>
    onlineUI.status(text),
  );
  const onlineUI = new OnlineUI(
    network,
    receiveRoom,
    () => {
      remotePlayers.clear();
      receivedCode = null;
      city = createCampaign();
      world.equipHat(city.campaign?.equippedHat ?? null);
      canvas.dataset.equippedHat = city.campaign?.equippedHat ?? "none";
      checkpoint = structuredClone(city);
      player = spawnPlayer();
      storyPending = true;
      placeScenery();
      menu.hidden = false;
    },
    (entries) => cityView.setLeaderboard(entries),
  );
  let lossSubmissionRequested = false;
  const survivalRun = new SurvivalRunTracker(
    onlineRequest,
    (result) =>
      onlineUI.showSurvivalResult(
        result.survivalTimeMs,
        result.entries,
        result.improved,
      ),
    (error) => {
      document.getElementById("survival-record-status")!.textContent =
        `Could not save this run: ${error}`;
    },
  );
  function receiveRoom(room: RoomSnapshot | null): void {
    onlineUI?.renderRoom(room);
    if (!room) {
      remotePlayers.clear();
      return;
    }
    const changedLevel =
      city.campaign!.level !== room.city.campaign!.level ||
      city.campaign!.endlessRound !== room.city.campaign!.endlessRound;
    const previousOutcome = city.outcome;
    const freshRoom =
      receivedCode !== room.code ||
      room.city.elapsed + 1 < city.elapsed ||
      (city.outcome !== "playing" && room.city.outcome === "playing");
    receivedCode = room.code;
    const ledger = city.funding;
    const previousHat = city.campaign?.equippedHat ?? null;
    const previousOwnedHats = [...(city.campaign?.ownedHats ?? [])];
    city = room.city;
    if (previousOutcome === "playing" && city.outcome === "lost")
      void onlineUI.showLatestSurvivalResult().catch((error: unknown) => {
        document.getElementById("survival-record-status")!.textContent =
          error instanceof Error ? error.message : "Leaderboard unavailable.";
      });
    const nextHat = city.campaign?.equippedHat ?? null;
    if (previousHat !== nextHat) {
      world.equipHat(nextHat);
      canvas.dataset.equippedHat = nextHat ?? "none";
    }
    if (city.outcome === "lost" && previousOwnedHats.length > 0)
      clearSavedHatCollection(localStorage);
    if (hatShop.open) hatShop.render();
    city.selected = selected;
    if (!changedLevel && !freshRoom) {
      ledger.earned = city.funding.earned;
      ledger.claimed = city.funding.claimed;
      city.funding = ledger;
    }
    const me = room.players.find((p) => p.id === network.account?.id);
    if (me) {
      player.emote = me.player.emote
        ? structuredClone(me.player.emote)
        : undefined;
      if (changedLevel || freshRoom) selected = me.selected;
      city.selected = selected;
      if (
        Math.hypot(
          player.position.x - me.player.position.x,
          player.position.z - me.player.position.z,
        ) > 1.5 ||
        changedLevel ||
        freshRoom
      )
        player = structuredClone(me.player);
    }
    if (changedLevel || freshRoom) {
      creditsUI.reset();
      checkpoint = structuredClone(city);
      placeScenery();
      storyPending = true;
      showStory();
    }
    if (city.outcome !== "playing" && input.active) document.exitPointerLock();
    hudTime = 0;
  }
  canvas.tabIndex = 0;
  let targetId: number | null = null;
  let accumulator = 0,
    lastTime = performance.now(),
    hudTime = 0;
  let networkTime = 0;
  let remotePlayerCount = "";
  let remoteCharacterAsset = "";
  let currentEmote = "";
  const target = new THREE.Vector3();
  const inReach = () => {
    const plot = city.plots.find((p) => p.id === targetId);
    return (
      !!plot &&
      Math.hypot(plot.x - player.position.x, plot.z - player.position.z) <=
        (input.held("KeyB") &&
        (city.upgraded || isPowerupActive(city, "bubbles"))
          ? cityConfig.bubbleReach
          : cityConfig.reach * powerupMultiplier(city, "bell"))
    );
  };
  let hatShopReturnToGame = false;
  const hatShop = new HatShopUI(
    () => city.budget,
    () => city.campaign?.equippedHat ?? null,
    () => city.campaign?.ownedHats ?? [],
    (id: HatId) => {
      if (network.room) {
        void network.action({ equippedHat: id });
        return true;
      }
      if (!purchaseHat(city, id)) return false;
      world.equipHat(id);
      canvas.dataset.equippedHat = id;
      checkpoint.budget = city.budget;
      if (checkpoint.campaign) {
        checkpoint.campaign.equippedHat = id;
        checkpoint.campaign.ownedHats = [...(city.campaign?.ownedHats ?? [])];
      }
      ui.render(city, targetId, inReach());
      return true;
    },
    () => {
      hatShop.hide();
      if (hatShopReturnToGame) {
        hatShopReturnToGame = false;
        void enterGame();
      } else {
        menu.hidden = false;
        document.querySelector<HTMLButtonElement>("#open-hat-shop")!.focus();
      }
    },
  );
  document
    .querySelector<HTMLButtonElement>("#open-hat-shop")!
    .addEventListener("click", () => {
      hatShopReturnToGame = false;
      menu.hidden = true;
      hatShop.show();
    });
  const openHatShopDuringGame = () => {
    if (city.outcome !== "playing") return;
    hatShopReturnToGame = input.active;
    if (input.active) {
      input.clear();
      audio.update(false, false);
      document.exitPointerLock();
    }
    menu.hidden = true;
    hatShop.show(hatShopReturnToGame);
  };
  const reset = () => {
    creditsUI.reset();
    if (network.room) {
      void network.action({ action: "reset" });
      return;
    }
    survivalRun.reset();
    lossSubmissionRequested = false;
    audio.update(false, false);
    const ownedHats = [...(city.campaign?.ownedHats ?? [])];
    const equippedHat = city.campaign?.equippedHat ?? null;
    city =
      city.outcome === "won" ? createCampaign() : structuredClone(checkpoint);
    if (city.campaign) {
      city.campaign.ownedHats = ownedHats;
      city.campaign.equippedHat = equippedHat;
    }
    if (city.campaign?.activeModifier) city.campaign.activeModifier = null;
    world.equipHat(city.campaign?.equippedHat ?? null);
    canvas.dataset.equippedHat = city.campaign?.equippedHat ?? "none";
    player = spawnPlayer();
    checkpoint = structuredClone(city);
    placeScenery();
    storyPending = true;
    campaignUI.hide();
    modifierWheel.hide();
    input.clear();
    input.yaw = currentLevel(city)?.site?.startYaw ?? 0;
    input.pitch = 0.28;
    targetId = null;
    accumulator = 0;
    hudTime = 0;
    ui.setOpen(false);
    ui.render(city, targetId, false);
    campaignUI.render(city);
    document.exitPointerLock();
    menu.hidden = false;
  };
  const act = (action: CityAction) =>
    network.room
      ? void network.action({
          action,
          target: targetId,
          selected: city.selected,
        })
      : audio.performAction(city, action, player.position, targetId);
  ui.render(city, targetId, false);
  campaignUI.render(city);
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  const showStory = () => {
    audio.update(false, false);
    input.clear();
    ui.setOpen(false);
    document.exitPointerLock();
    menu.hidden = true;
    campaignUI.show(city);
  };
  const showModifierWheel = () => {
    audio.update(false, false);
    input.clear();
    ui.setOpen(false);
    document.exitPointerLock();
    campaignUI.hide();
    menu.hidden = true;
    modifierWheel.show();
  };
  async function enterGame() {
    try {
      canvas.focus({ preventScroll: true });
      await canvas.requestPointerLock();
      if (network.room) void network.action({ ready: true });
      storyPending = false;
      campaignUI.hide();
      if (!network.room)
        survivalRun.start(city.campaign?.endlessRound ? "practice" : "solo");
    } catch {
      message.textContent =
        "Mouse capture was blocked. Open the game in its own browser tab and click I’M READY again.";
      document.querySelector("#story-status")!.textContent =
        message.textContent;
    }
  }
  // ---- Dev-only level builder ----
  // Off unless `npm run dev` runs with VITE_LEVEL_BUILDER=1 or the URL has ?builder;
  // never available in an online co-op room, so shared games stay untouched.
  const builderEnabled =
    import.meta.env.DEV &&
    (import.meta.env.VITE_LEVEL_BUILDER === "1" ||
      new URLSearchParams(location.search).has("builder"));
  let builder: ReturnType<typeof createLevelBuilder> | undefined;
  let builderSession:
    | {
        city: typeof city;
        player: typeof player;
        checkpoint: typeof checkpoint;
        yaw: number;
        pitch: number;
      }
    | undefined;
  const openBuilder = () => {
    if (!builder || builder.active) return;
    if (network.room) {
      message.textContent =
        "The level builder is not available in an online room.";
      return;
    }
    document.exitPointerLock();
    builderSession = {
      city,
      player,
      checkpoint,
      yaw: input.yaw,
      pitch: input.pitch,
    };
    builder.toggle();
    menu.hidden = true;
    crosshair.hidden = true;
  };
  const closeBuilder = (play = true) => {
    if (!builder?.active) return;
    builder.toggle();
    if (builderSession) {
      ({ city, player, checkpoint } = builderSession);
      input.yaw = builderSession.yaw;
      input.pitch = builderSession.pitch;
      builderSession = undefined;
      placeScenery();
    }
    if (play) {
      storyPending = false;
      void enterGame();
    } else menu.hidden = false;
  };
  if (builderEnabled)
    void import("./ui/level-builder").then(({ createLevelBuilder }) => {
      builder = createLevelBuilder({
        scenery,
        camera,
        canvas,
        levelIndex: () => city.campaign!.level,
        level: (index) => campaignLevel(city, index)!,
        selectLevel: (index) => {
          if (city.campaign!.level === index) return;
          const locations = city.campaign!.locations;
          city = startCampaignAt(index);
          city.campaign!.locations = locations;
          player = spawnPlayer();
          placeScenery();
        },
        normalView: () => ({
          x: player.position.x,
          z: player.position.z,
          yaw: input.yaw,
          pitch: input.pitch,
        }),
        terrain: () => terrain,
        groundAt,
        // Test play: the draft replaces that level in memory and starts at once.
        testPlay: (levelId, level) => {
          if (network.room) return;
          builderSession = undefined;
          const index = applyBuiltLevel(levelId, level);
          city = startCampaignAt(index);
          checkpoint = structuredClone(city);
          placeScenery();
          player = spawnPlayer();
          input.pitch = 0.28;
          targetId = null;
          accumulator = 0;
          hudTime = 0;
          closeBuilder();
        },
        backToGame: () => closeBuilder(),
        showGameScene: (visible) => {
          cityView.setVisible(visible);
          world.character.visible = true;
          trees?.setGhost(!visible);
        },
      });
      const open = document.createElement("button");
      open.type = "button";
      open.className = "level-builder-open";
      open.textContent = "🛠 Level builder (dev)";
      open.addEventListener("click", openBuilder);
      menu.append(open);
    });
  play.addEventListener("click", () => {
    if (!onlineUI.requireAccount()) return;
    storyPending ? showStory() : void enterGame();
  });
  document
    .querySelector("#story-start")!
    .addEventListener("click", () => void enterGame());
  document.querySelector("#read-story")!.addEventListener("click", showStory);
  document.addEventListener(
    "pointerlockerror",
    () =>
      (message.textContent =
        "Mouse capture was blocked. Open the game in its own browser tab and try again."),
  );
  document.addEventListener("pointerlockchange", () => {
    if (!input.active) {
      audio.update(false, false);
      if (network.room) void network.action({ ready: false });
      else survivalRun.pause();
    }
    if (!input.active && city.campaign) city.campaign.connectFrom = null;
    menu.hidden =
      input.active ||
      ui.open ||
      campaignUI.open ||
      hatShop.open ||
      modifierWheel.open ||
      city.outcome !== "playing" ||
      !!builder?.active;
    crosshair.hidden = !input.active;
    accumulator = 0;
    lastTime = performance.now();
  });
  window.addEventListener("keydown", (event) => {
    if (!event.repeat && keyCode(event) === "KeyM") soundToggle.click();
    if (event.repeat || !input.active || city.outcome !== "playing") return;
    const code = keyCode(event);
    if (code === "KeyN" && builder && !network.room) {
      openBuilder();
      return;
    }
    if (code === "KeyT") {
      openHatShopDuringGame();
      return;
    }
    if (
      input.emoteChord &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      /^Digit[1-5]$/.test(code)
    ) {
      event.preventDefault();
      const emote = emoteConfig.items[Number(code.slice(-1)) - 1];
      startEmote(player, emote.id);
      if (network.room) void network.action({ emote: emote.id, ready: true });
      return;
    }
    if (code === "KeyR") {
      reset();
      return;
    }
    if (code === "KeyC") {
      if (currentLevel(city)?.id === "voltanord") return;
      if (network.room)
        void network.action({ action: "connect", target: targetId });
      else connectRunoff(city, targetId, player.position);
    }
    if (code === "KeyV") {
      if (network.room)
        void network.action({ action: "recycle", target: targetId });
      else recyclePlot(city, targetId, player.position);
    }
    if (code === "KeyQ") {
      if (network.room) void network.action({ powerup: true });
      else activatePowerup(city);
      hudTime = 0;
    }
    if (code === "KeyE") {
      const machine = city.saboteur;
      if (
        Math.hypot(
          player.position.x - machine.x,
          player.position.z - machine.z,
        ) <= cityConfig.reach
      )
        act("machine");
      else act("upgrade");
    }
    if (code === "KeyH") {
      ui.setOpen(true);
      input.clear();
      document.exitPointerLock();
      menu.hidden = true;
    }
    hudTime = 0;
  });
  document.querySelector("#close-inventory")!.addEventListener("click", () => {
    ui.setOpen(false);
    menu.hidden = false;
  });
  document.querySelector("#restart")!.addEventListener("click", reset);
  document
    .querySelector("#start-endless")!
    .addEventListener("click", enterEndless);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    document.exitPointerLock();
    menu.hidden = false;
    play.disabled = true;
    message.textContent =
      "Graphics connection lost. Reload this page to restart.";
  });
  async function addAssets(): Promise<void> {
    for (const [name, config] of Object.entries({
      character: gameConfig.character,
      level: gameConfig.level,
    })) {
      if (!config.url) continue;
      if (name === "level") {
        canvas.dataset.level = "loading";
        levelStatus.textContent = "Loading Basel buildings…";
      }
      try {
        const model = await loadModel(config);
        if (name === "character") {
          characterModel = model;
          remotePlayers.setCharacterTemplate(model, true);
          updateSpongeWaterState(
            model,
            city.sponge,
            spongeCapacity(city),
            city.temperature,
          );
          world.useCharacter(model);
          canvas.dataset.character = "loaded";
        } else {
          styleBuildings(model);
          clearBuildings = createBuildingClearance(model);
          buildingModel = model;
          scenery.add(model);
          cityView.useImportedLevel();
          void loadMapLayers(
            scenery,
            canvas,
            (grid) => {
              terrain = grid;
              placeScenery();
              world.useTerrain();
              cityView.useGround(groundAt);
            },
            (layer) => {
              trees = layer;
              placeScenery();
            },
          );
          canvas.dataset.level = "loaded";
          sceneryLoaded = true;
          placeScenery();
        }
      } catch (error) {
        if (name === "level") {
          canvas.dataset.level = "fallback";
          levelStatus.textContent =
            "Basel map unavailable · using the original scenery";
        }
        message.textContent = `Could not load the ${name} model. Check config/game.ts and reload.`;
        console.error(error);
      }
    }
  }
  void addAssets();
  renderer.setAnimationLoop((time: number) => {
    const dt = Math.max(
      0,
      Math.min((time - lastTime) / 1000, gameConfig.maxFrameTime),
    );
    lastTime = time;
    if (document.hidden) return;
    const reducedMotion = reducedMotionQuery.matches;
    const active =
      input.active &&
      !campaignUI.open &&
      !modifierWheel.open &&
      city.outcome === "playing";
    let clickRequested = false;
    let networkMovement: ReturnType<GameInput["consume"]> | null = null;
    if (active) {
      input.updateLook(dt);
      const actions = input.consumeActions();
      clickRequested = actions.use;
      if (actions.selection !== null) {
        const tool = cityTools[actions.selection];
        if (isToolAvailable(city, tool.id)) selected = city.selected = tool.id;
        else
          city.feedback = `${tool.name} is locked. Complete this level to unlock more tools.`;
      }
      accumulator += dt;
      while (accumulator >= gameConfig.fixedStep) {
        const movement = input.consume();
        pendingJump ||= movement.jump;
        const teammates =
          network.room?.players
            .filter((member) => member.id !== network.account?.id)
            .map((member) =>
              circleCollider(
                `teammate-${member.id}`,
                member.player.position.x,
                member.player.position.z,
                gameConfig.playerCollisionRadius,
                member.player.position.y,
                member.player.position.y + gameConfig.playerCollisionHeight,
                "character",
              ),
            ) ?? [];
        const dynamicSolids = [...cityView.colliders(city), ...teammates];
        collisions.setDynamic(dynamicSolids);
        collisionDebug.setDynamic(dynamicSolids);
        updatePlayer(
          player,
          movement,
          input.yaw,
          gameConfig.fixedStep,
          groundAt,
          modifierMultiplier(city, "playerSpeed"),
          collisions,
          powerupMultiplier(city, "laeckerli"),
        );
        sweatDuringSprint(city, player, gameConfig.fixedStep);
        if (currentLevel(city)?.site)
          clampToLevel(player.position, currentLevel(city)?.site);
        else {
          // The playable square has flat-ground bounds, so the mission stays in reach.
          const origin = levelPosition(city, { x: 0, z: 0 });
          player.position.x = THREE.MathUtils.clamp(
            player.position.x,
            cityConfig.bounds.minX + origin.x,
            cityConfig.bounds.maxX + origin.x,
          );
          player.position.z = THREE.MathUtils.clamp(
            player.position.z,
            cityConfig.bounds.minZ + origin.z,
            cityConfig.bounds.maxZ + origin.z,
          );
        }
        if (
          input.using &&
          !input.held("KeyB") &&
          (city.selected === "absorb" || city.selected === "spray")
        )
          if (!network.room)
            audio.performAction(
              city,
              city.selected,
              player.position,
              targetId,
              (city.selected === "absorb"
                ? cityConfig.absorbRate
                : cityConfig.sprayRate) * gameConfig.fixedStep,
            );
        if (input.held("KeyB") && !network.room)
          audio.performAction(
            city,
            "spray",
            player.position,
            targetId,
            cityConfig.sprayRate * gameConfig.fixedStep,
            true,
          );
        const spongeBeforeUpdate = city.sponge;
        const previousLevel = city.campaign!.level;
        const previousRound = city.campaign!.endlessRound;
        const wasWheelPending = city.campaign!.wheelPending;
        if (!network.room) {
          const hatBeforeUpdate = city.campaign!.equippedHat;
          const ownedHatsBeforeUpdate = [...(city.campaign!.ownedHats ?? [])];
          collisions.setDynamic([
            ...cityView.colliders(city),
            circleCollider(
              "local-player",
              player.position.x,
              player.position.z,
              gameConfig.playerCollisionRadius,
              player.position.y,
              player.position.y + gameConfig.playerCollisionHeight,
              "character",
            ),
          ]);
          updateCity(
            city,
            gameConfig.fixedStep,
            player.position,
            collisions,
            groundAt,
          );
          if (city.outcome === "lost" && !lossSubmissionRequested) {
            lossSubmissionRequested = true;
            survivalRun.finish();
          }
          if (
            city.outcome === "lost" &&
            (hatBeforeUpdate !== null || ownedHatsBeforeUpdate.length > 0)
          ) {
            world.equipHat(null);
            canvas.dataset.equippedHat = "none";
            clearSavedHatCollection(localStorage);
            checkpoint.budget = city.budget;
            if (checkpoint.campaign) {
              checkpoint.campaign.equippedHat = null;
              checkpoint.campaign.ownedHats = [];
            }
          }
        }
        if (
          city.campaign!.level !== previousLevel ||
          city.campaign!.endlessRound !== previousRound
        ) {
          player = spawnPlayer();
          input.pitch = 0.28;
          targetId = null;
          accumulator = 0;
          hudTime = 0;
          checkpoint = structuredClone(city);
          placeScenery();
          storyPending = true;
          showStory();
          break;
        }
        if (!wasWheelPending && city.campaign!.wheelPending) {
          accumulator = 0;
          showModifierWheel();
          break;
        }
        if (city.sponge > spongeBeforeUpdate) audio.requestAbsorption();
        audio.update(
          city.outcome === "playing",
          weather(city).raining,
          currentLevel(city)?.id,
        );
        accumulator -= gameConfig.fixedStep;
      }
    }
    if (network.room) {
      const powerVisualScale =
        city.maximumTime > 0 ? 2.5 : city.powerTime > 0 ? 1.2 : 1;
      const remoteCount = remotePlayers.update(
        network.room.players,
        network.account!.id,
        time / 1000,
        reducedMotion,
        {
          sponge: city.sponge,
          capacity: spongeCapacity(city),
          temperature: city.temperature,
          equippedHat: city.campaign?.equippedHat ?? null,
          visualScale: effectivePlayerVisualScale(city, powerVisualScale),
        },
      );
      const nextRemotePlayerCount = String(remoteCount);
      if (remotePlayerCount !== nextRemotePlayerCount) {
        remotePlayerCount = nextRemotePlayerCount;
        canvas.dataset.remotePlayerCount = remotePlayerCount;
      }
      if (remoteCharacterAsset !== remotePlayers.assetKind) {
        remoteCharacterAsset = remotePlayers.assetKind;
        canvas.dataset.remoteCharacterAsset = remoteCharacterAsset;
      }
      networkTime -= dt;
      if (networkTime <= 0) {
        networkTime = 0.1;
        const movement = active
          ? input.consume()
          : { forward: 0, right: 0, run: false, jump: false };
        movement.jump = pendingJump;
        pendingJump = false;
        networkMovement = movement;
      }
      if (!network.connected && input.active) document.exitPointerLock();
    }
    if (!active) audio.update(false, false);
    powerupView.update(city, groundAt, city.elapsed, reducedMotion);
    if (characterModel)
      updateSpongeWaterState(
        characterModel,
        city.sponge,
        spongeCapacity(city),
        city.temperature,
      );
    world.update(
      player,
      groundAt(player.position.x, player.position.z),
      city.elapsed,
      city.selected,
      reducedMotion,
    );
    const nextEmote = player.emote?.id ?? "";
    if (currentEmote !== nextEmote) {
      currentEmote = nextEmote;
      canvas.dataset.emote = currentEmote;
    }
    const powerVisualScale =
      city.maximumTime > 0 ? 2.5 : city.powerTime > 0 ? 1.2 : 1;
    world.character.scale.setScalar(
      effectivePlayerVisualScale(city, powerVisualScale),
    );
    target.set(
      player.position.x,
      player.position.y + gameConfig.cameraTargetHeight,
      player.position.z,
    );
    emoteUI.update(
      active && input.emoteChord,
      active
        ? emoteConfig.items.find((item) => item.id === player.emote?.id)?.name
        : undefined,
    );
    const cameraYaw = player.emote ? player.facing : input.yaw;
    const horizontalDistance =
      Math.cos(input.pitch) * gameConfig.cameraDistance;
    camera.position.set(
      target.x + Math.sin(cameraYaw) * horizontalDistance,
      target.y + Math.sin(input.pitch) * gameConfig.cameraDistance,
      target.z + Math.cos(cameraYaw) * horizontalDistance,
    );
    // Keep the camera out of hillsides behind the player.
    camera.position.y = Math.max(
      camera.position.y,
      groundAt(camera.position.x, camera.position.z) + 0.5,
    );
    camera.lookAt(target);
    // The level builder flies its own editor camera while it is open.
    if (builder?.active) {
      if (network.room) closeBuilder(false);
      else builder.updateCamera(dt);
    }
    camera.updateMatrixWorld();
    targetId = cityView.target(city, camera);
    if (active && clickRequested && city.outcome === "playing") {
      const machine = city.saboteur;
      if (
        city.selected === "karate" &&
        Math.hypot(
          player.position.x - machine.x,
          player.position.z - machine.z,
        ) <= cityConfig.reach
      )
        act("machine");
      else if (city.selected !== "absorb" && city.selected !== "spray")
        act(city.selected);
    }
    if (network.room && networkMovement)
      void network.command({
        movement: networkMovement,
        yaw: input.yaw,
        selected: city.selected,
        ready: active,
        ...(active &&
        (input.using || input.held("KeyB")) &&
        (city.selected === "absorb" ||
          city.selected === "spray" ||
          input.held("KeyB"))
          ? {
              action: input.held("KeyB") ? "spray" : city.selected,
              target: targetId,
              bubbles: input.held("KeyB"),
            }
          : {}),
      });
    cityView.update(
      city,
      player,
      targetId,
      input.held("KeyB") && city.upgraded
        ? cityConfig.bubbleReach
        : cityConfig.reach * powerupMultiplier(city, "bell"),
      active
        ? input.held("KeyB") && city.upgraded
          ? "spray"
          : input.using
            ? city.selected
            : null
        : null,
      input.held("KeyB") && city.upgraded,
    );
    audio.updateCharacters(
      active,
      city,
      player.position,
      input.yaw,
      !!player.emote,
    );
    hudTime -= dt;
    if (hudTime <= 0) {
      const runoffAvailable = currentLevel(city)?.id !== "voltanord";
      document.getElementById("runoff-guide-shortcut")!.hidden =
        !runoffAvailable;
      document.getElementById("runoff-footer-shortcut")!.hidden =
        !runoffAvailable;
      const sprintCooldown = player.sprintCooldown ?? 0;
      document.getElementById("sprint-status")!.textContent =
        active && sprintCooldown > 0
          ? `REST ${Math.ceil(sprintCooldown)}s`
          : active && player.sprinting
            ? "SWEATING"
            : "sprint";
      ui.render(city, targetId, inReach());
      powerupUI.render(city);
      campaignUI.render(city);
      if (city.outcome === "won" && !city.campaign?.endlessRound) {
        audio.update(false, false);
        campaignUI.hide();
        input.clear();
        if (input.active) document.exitPointerLock();
        creditsUI.show();
      }
      hudTime = 0.1;
    }
    if (city.outcome !== "playing" && input.active) {
      input.clear();
      document.exitPointerLock();
      menu.hidden = true;
    }
    collisionDebug.updatePlayer(player.position);
    renderer.render(scene, camera);
  });
}
try {
  startGame();
} catch (error) {
  play.disabled = true;
  message.textContent =
    "The game could not start. Use a desktop browser with WebGL 2 enabled and reload.";
  console.error(error);
}
