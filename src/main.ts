import * as THREE from "three";
import "./ui/style.css";
import { gameConfig } from "../config/game";
import { cityConfig, cityTools } from "../config/city";
import { GameInput, keyCode } from "./game/input";
import { createPlayer, updatePlayer } from "./game/player";
import { createWorld } from "./game/world";
import { loadModel } from "./game/assets";
import { createCity, updateCity, weather } from "./game/city";
import { CityAudio } from "./game/audio";
import { createCityView } from "./game/city-view";
import { CityUI } from "./ui/city";
import type { CityAction } from "./interfaces";

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
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 150);
  const world = createWorld(scene);
  const input = new GameInput(canvas);
  const audio = new CityAudio();
  const soundToggle =
    document.querySelector<HTMLButtonElement>("#sound-toggle")!;
  soundToggle.addEventListener("click", () => {
    const muted = audio.toggleMuted();
    soundToggle.textContent = muted ? "Sound: off" : "Sound: on";
    soundToggle.setAttribute("aria-pressed", String(muted));
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.update(false, false);
  });
  let player = createPlayer();
  let city = createCity();
  const cityView = createCityView(scene, city);
  const ui = new CityUI((tool) => {
    city.selected = tool;
    ui.render(city, targetId, inReach());
  });
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
    player = createPlayer();
    city = createCity();
    input.clear();
    input.yaw = 0;
    input.pitch = 0.28;
    targetId = null;
    accumulator = 0;
    hudTime = 0;
    ui.setOpen(false);
    ui.render(city, targetId, false);
    menu.hidden = input.active;
  };
  const act = (action: CityAction) =>
    audio.performAction(city, action, player.position, targetId);
  ui.render(city, targetId, false);
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  play.addEventListener("click", async () => {
    try {
      canvas.focus({ preventScroll: true });
      await canvas.requestPointerLock();
    } catch {
      message.textContent =
        "Mouse capture was blocked. Open the game in its own browser tab and click I’M READY again.";
    }
  });
  document.addEventListener(
    "pointerlockerror",
    () =>
      (message.textContent =
        "Mouse capture was blocked. Open the game in its own browser tab and try again."),
  );
  document.addEventListener("pointerlockchange", () => {
    if (!input.active) audio.update(false, false);
    menu.hidden = input.active || ui.open || city.outcome !== "playing";
    crosshair.hidden = !input.active;
    accumulator = 0;
    lastTime = performance.now();
  });
  window.addEventListener("keydown", (event) => {
    if (!event.repeat && keyCode(event) === "KeyM") soundToggle.click();
    if (event.repeat || !input.active || city.outcome !== "playing") return;
    const code = keyCode(event);
    if (code === "KeyR") reset();
    if (code === "KeyQ") act("power");
    if (code === "KeyX") act("maximum");
    if (code === "KeyP") act("patrick");
    if (code === "KeyE") {
      const machine = cityConfig.machine;
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
      try {
        const model = await loadModel(config);
        if (name === "character") {
          world.character.remove(world.placeholder);
          world.character.add(model);
        } else scene.add(model);
      } catch (error) {
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
    const active = input.active && city.outcome === "playing";
    if (active) {
      input.updateLook(dt);
      const actions = input.consumeActions();
      if (actions.selection !== null)
        city.selected = cityTools[actions.selection].id;
      const machine = cityConfig.machine;
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
        updatePlayer(player, input.consume(), input.yaw, gameConfig.fixedStep);
        // The playable square has flat-ground bounds, so the mission stays in reach.
        player.position.x = THREE.MathUtils.clamp(
          player.position.x,
          cityConfig.bounds.minX,
          cityConfig.bounds.maxX,
        );
        player.position.z = THREE.MathUtils.clamp(
          player.position.z,
          cityConfig.bounds.minZ,
          cityConfig.bounds.maxZ,
        );
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
        updateCity(city, gameConfig.fixedStep, player.position);
        if (city.sponge > spongeBeforeUpdate) audio.requestAbsorption();
        audio.update(city.outcome === "playing", weather(city).raining);
        accumulator -= gameConfig.fixedStep;
      }
    }
    if (!active) audio.update(false, false);
    world.update(player);
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
