import * as THREE from "three";
import { gameConfig } from "../../config/game.ts";
import { cityConfig } from "../../config/city.ts";
import type { CityState, PlayerState } from "../interfaces.ts";
import { currentLevel } from "./campaign.ts";
import { themeColor } from "./characters.ts";
import { weather } from "./city.ts";

const look = gameConfig.weatherVisuals;

/** Soft round glow for the sun halo, drawn once. */
function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Deterministic 0..1 noise so drops spread evenly without Math.random. */
const scatter = (i: number, salt: number) => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Sky colour, fog, a sun that grows hotter with the heat meter, and rain
 * streaks with splashes that fade in and out. Purely visual.
 */
export function createWeatherView(scene: THREE.Scene, parent: THREE.Object3D) {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const colours = {
    sky: themeColor("sky"),
    heatSky: themeColor("heat-sky"),
    rainSky: themeColor("rain-sky"),
    sun: themeColor("sun"),
    hotSun: themeColor("hot-sun"),
    white: new THREE.Color(0xffffff),
    rainLight: new THREE.Color(0xc4d4e0),
  };
  const sunlight = scene.getObjectByName("sunlight") as
    THREE.DirectionalLight | undefined;
  const skylight = scene.getObjectByName("skylight") as
    THREE.HemisphereLight | undefined;
  const skylightBase = skylight?.intensity ?? 2.4;

  const sun = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(look.sun.discRadius, 40),
    new THREE.MeshBasicMaterial({
      color: colours.sun,
      fog: false,
      transparent: true,
      depthWrite: false,
    }),
  );
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: colours.sun,
      fog: false,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  sun.add(glow, disc);
  sun.renderOrder = -1;
  parent.add(sun);
  const sunDirection = new THREE.Vector3(
    look.sun.direction.x,
    look.sun.direction.y,
    look.sun.direction.z,
  ).normalize();

  const { rain: r } = look;
  const rainPositions = new Float32Array(r.maxDrops * 6);
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(rainPositions, 3),
  );
  const rainMaterial = new THREE.LineBasicMaterial({
    color: themeColor("rain-streak"),
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  parent.add(rain);

  const splashGeometry = new THREE.RingGeometry(0.06, 0.1, 16);
  splashGeometry.rotateX(-Math.PI / 2);
  const splashes = Array.from({ length: r.splashes }, (_, i) => {
    const mesh = new THREE.Mesh(
      splashGeometry,
      new THREE.MeshBasicMaterial({
        color: themeColor("rain-streak"),
        transparent: true,
        depthWrite: false,
      }),
    );
    parent.add(mesh);
    return { mesh, age: (i / r.splashes) * r.splashSeconds, cycle: i };
  });

  let rainAmount = 0;
  let previousElapsed: number | undefined;
  const sky = new THREE.Color();
  const sunColour = new THREE.Color();
  const sunAnchor = new THREE.Vector3();

  return {
    update(
      s: CityState,
      player: PlayerState,
      origin: { x: number; z: number },
      ground: (x: number, z: number) => number,
    ) {
      const dt = Math.max(
        0,
        Math.min(0.1, s.elapsed - (previousElapsed ?? s.elapsed)),
      );
      previousElapsed = s.elapsed;
      const raining = weather(s).raining;
      const step = dt / look.rainFadeSeconds;
      rainAmount = raining
        ? Math.min(1, rainAmount + step)
        : Math.max(0, rainAmount - step);
      const heat = Math.max(0, Math.min(1, s.heat / 100));
      const sunny = 1 - rainAmount;

      sky
        .copy(colours.sky)
        .lerp(colours.heatSky, heat * look.sun.skyHeatTint)
        .lerp(colours.rainSky, rainAmount);
      if (scene.background instanceof THREE.Color) scene.background.copy(sky);
      else scene.background = sky.clone();
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(sky);
        scene.fog.near = THREE.MathUtils.lerp(
          look.fog.dry.near,
          look.fog.rain.near,
          rainAmount,
        );
        scene.fog.far = THREE.MathUtils.lerp(
          look.fog.dry.far,
          look.fog.rain.far,
          rainAmount,
        );
      }

      if (sunlight) {
        sunlight.color
          .copy(colours.white)
          .lerp(colours.hotSun, heat * 0.55)
          .lerp(colours.rainLight, rainAmount);
        sunlight.intensity =
          THREE.MathUtils.lerp(
            look.sun.intensity.cool,
            look.sun.intensity.hot,
            heat,
          ) *
          (1 - 0.55 * rainAmount);
      }
      if (skylight) skylight.intensity = skylightBase * (1 - 0.3 * rainAmount);

      const px = player.position.x - origin.x;
      const pz = player.position.z - origin.z;
      sun.visible = sunny > 0.01;
      sun.position
        .copy(sunDirection)
        .multiplyScalar(look.sun.distance)
        .add(sunAnchor.set(px, player.position.y, pz));
      sun.lookAt(player.position.x, player.position.y, player.position.z);
      sunColour.copy(colours.sun).lerp(colours.hotSun, heat);
      disc.material.color.copy(sunColour);
      disc.material.opacity = sunny;
      disc.scale.setScalar(1 + heat * 0.6);
      glow.material.color.copy(sunColour);
      glow.material.opacity = (0.45 + heat * 0.55) * sunny;
      glow.scale.setScalar(look.sun.glowSize * (1 + heat * 1.2));

      const rainScale = Math.min(
        1.4,
        Math.max(
          0.6,
          (currentLevel(s)?.weather.rainRate ?? cityConfig.rainRate) /
            cityConfig.rainRate,
        ),
      );
      const limit = reducedMotion.matches ? r.reducedMotionDrops : r.maxDrops;
      const drops = Math.round(
        Math.min(r.maxDrops, limit * rainScale * rainAmount),
      );
      rain.visible = drops > 0;
      rainMaterial.opacity = r.opacity * Math.min(1, 0.4 + rainAmount * 0.6);
      const baseY = ground(player.position.x, player.position.z);
      rain.position.set(px, baseY, pz);
      if (drops > 0) {
        const half = r.area / 2;
        const drift = r.wind * r.streakLength;
        for (let i = 0; i < drops; i++) {
          const fall =
            (((scatter(i, 3) * r.height - s.elapsed * r.fallSpeed) % r.height) +
              r.height) %
            r.height;
          // Drops stay put in the world and wrap around the player as they walk.
          const x =
            ((((scatter(i, 1) * r.area - px + fall * r.wind) % r.area) +
              r.area) %
              r.area) -
            half;
          const z =
            ((((scatter(i, 2) * r.area - pz) % r.area) + r.area) % r.area) -
            half;
          const o = i * 6;
          rainPositions[o] = x;
          rainPositions[o + 1] = fall;
          rainPositions[o + 2] = z;
          rainPositions[o + 3] = x + drift;
          rainPositions[o + 4] = fall + r.streakLength;
          rainPositions[o + 5] = z;
        }
        rainGeometry.setDrawRange(0, drops * 2);
        rainGeometry.getAttribute("position").needsUpdate = true;
      }

      const splashing = !reducedMotion.matches && rainAmount > 0.05;
      for (const splash of splashes) {
        splash.mesh.visible = splashing;
        if (!splashing) continue;
        splash.age += dt;
        if (splash.age >= r.splashSeconds) {
          splash.age -= r.splashSeconds;
          splash.cycle += r.splashes;
          // Splashes land close to the player, where they can be seen.
          const angle = scatter(splash.cycle, 4) * Math.PI * 2;
          const radius = 1.5 + scatter(splash.cycle, 5) * 14;
          const x = px + Math.cos(angle) * radius;
          const z = pz + Math.sin(angle) * radius;
          splash.mesh.position.set(
            x,
            ground(origin.x + x, origin.z + z) + 0.03,
            z,
          );
        }
        const t = splash.age / r.splashSeconds;
        splash.mesh.scale.setScalar(0.6 + t * 2.4);
        splash.mesh.material.opacity = (1 - t) * 0.7 * rainAmount;
      }
    },
  };
}
