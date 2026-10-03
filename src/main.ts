import * as THREE from "three";
import "./ui/style.css";
import { gameConfig } from "../config/game";
import { cityConfig, cityTools } from "../config/city";
import { GameInput, keyCode } from "./game/input";
import { createPlayer, updatePlayer } from "./game/player";
import { createWorld } from "./game/world";
import { loadModel, updateSpongeWaterState } from "./game/assets";
import { spongeCapacity, updateCity, weather } from "./game/city";
import { loadMapLayers } from "./game/map-layers";
import {
  connectRunoff,
  createCampaign,
  currentLevel,
  levelPosition,
  recyclePlot,
} from "./game/campaign";
import { clampToLevel } from "./game/streets";
import { assignElevations, levelScenery } from "./game/terrain";
import { CampaignUI } from "./ui/campaign";
import { CityAudio } from "./game/audio";
import { createCityView } from "./game/city-view";
import { CityUI } from "./ui/city";
import type { CityAction, TerrainGrid } from "./interfaces";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const menu = document.querySelector<HTMLElement>("#menu")!;
const message = document.querySelector<HTMLElement>("#message")!;
const play = document.querySelector<HTMLButtonElement>("#play")!;
const crosshair = document.querySelector<HTMLElement>("#crosshair")!;

function startGame(): void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, gameConfig.maxPixelRatio));
  const scene = new THREE.Scene();
  const scenery = new THREE.Group();
  scene.add(scenery);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
  const world = createWorld(scene);
  const input = new GameInput(canvas);
  const audio = new CityAudio();
  const soundToggle =
    document.querySelector<HTMLButtonElement>("#sound-toggle")!;
  soundToggle.addEventListener("click", () => {
    const muted = audio.toggleMuted();
    campaignUI.setMuted(muted);
    soundToggle.textContent = muted ? "Sound: off" : "Sound: on";
    soundToggle.setAttribute("aria-pressed", String(muted));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.update(false, false);
  });
  let city = createCampaign();
  const spawnPlayer = () => {
    const player = createPlayer();
    Object.assign(player.position, levelPosition(city, player.position));
    return player;
  };
  let player = spawnPlayer();
  let checkpoint = structuredClone(city);
  let storyPending = true;
  const campaignUI = new CampaignUI();
  let characterModel: THREE.Group | null = null;
  const cityView = createCityView(scene, city);
  // Basel buildings, roads and photo move together so each level's street meets the play area.
  const levelStatus = document.querySelector<HTMLElement>("#level-status")!;
  let sceneryLoaded = false;
  let terrain: TerrainGrid | null = null;
  let ground = levelScenery(currentLevel(city), terrain).groundAt;
  /** World height of the Basel terrain under a point; flat (0) until it loads. */
  const groundAt = (x: number, z: number) => ground(x, z);
  const placeScenery = () => {
    const site = currentLevel(city)?.site;
    const placed = levelScenery(currentLevel(city), terrain);
    scenery.rotation.y = placed.rotationY;
    scenery.position.set(placed.x, placed.y, placed.z);
    ground = placed.groundAt;
    if (terrain) assignElevations(city, groundAt);
    if (sceneryLoaded)
      levelStatus.textContent = `Basel buildings loaded · ${site ? site.street : "fictional mission square"}`;
  };
  placeScenery();
  const ui = new CityUI(
    (tool) => {
      city.selected = tool;
      ui.render(city, targetId, inReach());
    },
    () => {
      if (input.active && city.outcome === "playing") audio.playFunding();
    },
  );
  canvas.tabIndex = 0;
  let targetId: number | null = null;
  let accumulator = 0,
    lastTime = performance.now(),
    hudTime = 0;
  const target = new THREE.Vector3();
  const inReach = () => {
    const plot = city.plots.find((p) => p.id === targetId);
    return (
      !!plot &&
      Math.hypot(plot.x - player.position.x, plot.z - player.position.z) <=
        (input.held("KeyB") && city.upgraded
          ? cityConfig.bubbleReach
          : cityConfig.reach)
    );
  };
  const reset = () => {
    audio.update(false, false);
    city =
      city.outcome === "won" ? createCampaign() : structuredClone(checkpoint);
    player = spawnPlayer();
    checkpoint = structuredClone(city);
    placeScenery();
    storyPending = true;
    campaignUI.hide();
    input.clear();
    input.yaw = 0;
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
    audio.performAction(city, action, player.position, targetId);
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
  const enterGame = async () => {
    try {
      canvas.focus({ preventScroll: true });
      await canvas.requestPointerLock();
      storyPending = false;
      campaignUI.hide();
    } catch {
      message.textContent =
        "Mouse capture was blocked. Open the game in its own browser tab and click I’M READY again.";
      document.querySelector("#story-status")!.textContent =
        message.textContent;
    }
  };
  play.addEventListener("click", () =>
    storyPending ? showStory() : void enterGame(),
  );
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
    if (!input.active) audio.update(false, false);
    if (!input.active && city.campaign) city.campaign.connectFrom = null;
    menu.hidden =
      input.active || ui.open || campaignUI.open || city.outcome !== "playing";
    crosshair.hidden = !input.active;
    accumulator = 0;
    lastTime = performance.now();
  });
  window.addEventListener("keydown", (event) => {
    if (!event.repeat && keyCode(event) === "KeyM") soundToggle.click();
    if (event.repeat || !input.active || city.outcome !== "playing") return;
    const code = keyCode(event);
    if (code === "KeyR") {
      reset();
      return;
    }
    if (code === "KeyC") connectRunoff(city, targetId, player.position);
    if (code === "KeyV") recyclePlot(city, targetId, player.position);
    if (code === "KeyQ") act("power");
    if (code === "KeyX") act("maximum");
    if (code === "KeyP") act("patrick");
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
          updateSpongeWaterState(model, city.sponge, spongeCapacity(city));
          world.useCharacter(model);
        } else {
          scenery.add(model);
          cityView.useImportedLevel();
          void loadMapLayers(scenery, canvas, (grid) => {
            terrain = grid;
            placeScenery();
            world.useTerrain();
            cityView.useGround(groundAt);
          });
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
    const active =
      input.active && !campaignUI.open && city.outcome === "playing";
    if (active) {
      input.updateLook(dt);
      const actions = input.consumeActions();
      if (actions.selection !== null)
        city.selected = cityTools[actions.selection].id;
      const machine = city.saboteur;
      if (
        actions.use &&
        city.selected === "karate" &&
        Math.hypot(
          player.position.x - machine.x,
          player.position.z - machine.z,
        ) <= cityConfig.reach
      )
        act("machine");
      else if (
        actions.use &&
        city.selected !== "absorb" &&
        city.selected !== "spray"
      )
        act(city.selected);
      accumulator += dt;
      while (accumulator >= gameConfig.fixedStep) {
        updatePlayer(
          player,
          input.consume(),
          input.yaw,
          gameConfig.fixedStep,
          groundAt,
        );
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
          audio.performAction(
            city,
            city.selected,
            player.position,
            targetId,
            (city.selected === "absorb"
              ? cityConfig.absorbRate
              : cityConfig.sprayRate) * gameConfig.fixedStep,
          );
        if (input.held("KeyB"))
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
        updateCity(city, gameConfig.fixedStep, player.position);
        if (city.campaign!.level !== previousLevel) {
          player = spawnPlayer();
          input.yaw = 0;
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
        if (city.sponge > spongeBeforeUpdate) audio.requestAbsorption();
        audio.update(
          city.outcome === "playing",
          weather(city).raining,
          currentLevel(city)?.id,
        );
        accumulator -= gameConfig.fixedStep;
      }
    }
    if (!active) audio.update(false, false);
    placeScenery();
    if (characterModel)
      updateSpongeWaterState(characterModel, city.sponge, spongeCapacity(city));
    world.update(
      player,
      groundAt(player.position.x, player.position.z),
      city.elapsed,
      city.selected,
    );
    world.character.scale.setScalar(
      city.maximumTime > 0 ? 2.5 : city.powerTime > 0 ? 1.2 : 1,
    );
    target.set(
      player.position.x,
      player.position.y + gameConfig.cameraTargetHeight,
      player.position.z,
    );
    const horizontalDistance =
      Math.cos(input.pitch) * gameConfig.cameraDistance;
    camera.position.set(
      target.x + Math.sin(input.yaw) * horizontalDistance,
      target.y + Math.sin(input.pitch) * gameConfig.cameraDistance,
      target.z + Math.cos(input.yaw) * horizontalDistance,
    );
    // Keep the camera out of hillsides behind the player.
    camera.position.y = Math.max(
      camera.position.y,
      groundAt(camera.position.x, camera.position.z) + 0.5,
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    targetId = cityView.target(city, camera);
    cityView.update(
      city,
      player,
      targetId,
      input.held("KeyB") && city.upgraded
        ? cityConfig.bubbleReach
        : cityConfig.reach,
      active
        ? input.held("KeyB") && city.upgraded
          ? "spray"
          : input.using
            ? city.selected
            : null
        : null,
      input.held("KeyB") && city.upgraded,
    );
    hudTime -= dt;
    if (hudTime <= 0) {
      ui.render(city, targetId, inReach());
      campaignUI.render(city);
      hudTime = 0.1;
    }
    if (city.outcome !== "playing" && input.active) {
      input.clear();
      document.exitPointerLock();
      menu.hidden = true;
    }
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
