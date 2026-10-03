import { emoteConfig } from "../../config/emotes";
import { gameConfig } from "../../config/game";
import type { MovementInput } from "../interfaces";

const movementKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
]);
/** Prefer the printed WASD key, with physical codes as a fallback. */
export function keyCode(event: Pick<KeyboardEvent, "key" | "code">): string {
  const key = event.key.toLowerCase();
  if (key === "shift")
    return event.code === "ShiftRight" ? "ShiftRight" : "ShiftLeft";
  if (key.length === 1 && /[a-z]/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[1-9]$/.test(key)) return `Digit${key}`;
  return event.code;
}

/** Persistent held input is independent of mouse motion and one-shot actions. */
export class GameInput {
  yaw = 0;
  pitch = 0.28;
  private keys = new Map<string, string>();
  private shiftModifier = false;
  private jump = false;
  private click = false;
  private clickHeld = false;
  private reload = false;
  private selection: number | null = null;
  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (event) => {
      if (!this.active) return;
      const code = keyCode(event);
      if (typeof event.shiftKey === "boolean")
        this.shiftModifier = event.shiftKey;
      if (code === "Escape") {
        this.clear();
        document.exitPointerLock();
        return;
      }
      if (movementKeys.has(code)) event.preventDefault();
      this.keys.set(event.code || code, code);
      if (event.repeat) return;
      if (code === "Space") this.jump = true;
      if (code === "KeyF") this.reload = true;
      if (
        /^Digit[1-9]$/.test(code) &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !this.emoteChord
      )
        this.selection = Number(code.slice(-1)) - 1;
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code || keyCode(event));
      if (typeof event.shiftKey === "boolean")
        this.shiftModifier = event.shiftKey;
      else if (keyCode(event).startsWith("Shift")) this.shiftModifier = false;
    });
    document.addEventListener("mousemove", (event) => {
      if (!this.active) return;
      this.shiftModifier = event.shiftKey;
      this.yaw -= event.movementX * gameConfig.mouseSensitivity;
      this.pitch = Math.max(
        -0.1,
        Math.min(
          1.1,
          this.pitch + event.movementY * gameConfig.mouseSensitivity,
        ),
      );
    });
    canvas.addEventListener("mousedown", (event) => {
      if (this.active && event.button === 0) {
        this.click = true;
        this.clickHeld = true;
      }
    });
    document.addEventListener("mouseup", () => (this.clickHeld = false));
    document.addEventListener("pointerlockchange", () => this.clear());
    window.addEventListener("blur", () => {
      this.clear();
      document.exitPointerLock();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.clear();
        document.exitPointerLock();
      }
    });
  }
  get active(): boolean {
    return document.pointerLockElement === this.canvas;
  }
  clear(): void {
    this.keys.clear();
    this.shiftModifier = false;
    this.jump = false;
    this.click = false;
    this.clickHeld = false;
    this.reload = false;
    this.selection = null;
  }
  /** Read held movement, consuming only the jump edge. */
  consume(): MovementInput {
    const held = new Set(this.keys.values());
    const down = (...codes: string[]) =>
      codes.some((code) => held.has(code)) ? 1 : 0;
    const input = {
      forward: down("KeyW", "ArrowUp") - down("KeyS", "ArrowDown"),
      right: down("KeyD", "ArrowRight") - down("KeyA", "ArrowLeft"),
      run: this.sprinting,
      jump: this.jump,
    };
    this.jump = false;
    return input;
  }
  get emoteChord(): boolean {
    return this.held(`Key${emoteConfig.chord}`);
  }
  get sprinting(): boolean {
    return (
      this.shiftModifier || this.held("ShiftLeft") || this.held("ShiftRight")
    );
  }
  held(code: string): boolean {
    return [...this.keys.values()].includes(code);
  }
  get using(): boolean {
    return this.clickHeld;
  }
  /** Consume item actions once per rendered frame, even when no physics step runs. */
  consumeActions() {
    const actions = {
      use: this.click,
      reload: this.reload,
      selection: this.selection,
    };
    this.click = false;
    this.reload = false;
    this.selection = null;
    return actions;
  }
  /** Keyboard camera controls also work when a touchpad is suppressed while typing. */
  updateLook(dt: number): void {
    const held = new Set(this.keys.values());
    const down = (code: string) => (held.has(code) ? 1 : 0);
    this.yaw +=
      (down("KeyJ") - down("KeyL")) * gameConfig.keyboardLookSpeed * dt;
    this.pitch = Math.max(
      -0.1,
      Math.min(
        1.1,
        this.pitch +
          (down("KeyK") - down("KeyI")) * gameConfig.keyboardLookSpeed * dt,
      ),
    );
  }
}
