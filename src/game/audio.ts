import { citySounds, levelSounds } from "../../config/audio";
import { fundingConfig as funding } from "../../config/funding";
import { performCityAction } from "./city";
import type {
  CityAction,
  CitySound,
  CityState,
  Vector3State,
} from "../interfaces";

/** One voice per clip; successful transfers request loops for the current frame. */
export class CityAudio {
  private readonly clips = new Map<CitySound, HTMLAudioElement>();
  private readonly requested = new Set<CitySound>();
  private readonly failed = new Set<CitySound>();
  private muted = false;
  private readonly stages = new Map<string, HTMLAudioElement>();
  private context?: AudioContext;
  private coinVoices = new Set<OscillatorNode>();
  private wheelVoices = new Set<OscillatorNode>();

  constructor() {
    for (const [id, settings] of Object.entries(citySounds)) {
      const sound = id as CitySound;
      const clip = new Audio(
        `${import.meta.env.BASE_URL}audio/${settings.file}`,
      );
      clip.preload = "auto";
      clip.volume = settings.volume;
      clip.addEventListener("error", () => this.reportFailure(sound));
      this.clips.set(sound, clip);
    }
    for (const [level, settings] of Object.entries(levelSounds)) {
      const clip = new Audio(
        `${import.meta.env.BASE_URL}audio/${settings.file}`,
      );
      clip.preload = "metadata";
      clip.volume = settings.volume;
      clip.loop = true;
      this.stages.set(level, clip);
    }
  }

  /** An original, brief rising coin chime; one celebration per HUD reward batch. */
  playFunding(): void {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      void context.resume().catch(() => {});
      this.stopFunding();
      for (const [i, frequency] of funding.chimeNotes.entries()) {
        const voice = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + i * funding.noteSeconds;
        voice.type = "sine";
        voice.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(funding.chimeVolume, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        voice.connect(gain).connect(context.destination);
        this.coinVoices.add(voice);
        voice.onended = () => {
          this.coinVoices.delete(voice);
          voice.disconnect();
          gain.disconnect();
        };
        voice.start(start);
        voice.stop(start + 0.16);
      }
    } catch {
      // The wallet still celebrates if Web Audio is unavailable.
    }
  }
  private stopFunding(): void {
    for (const voice of this.coinVoices) voice.stop();
    this.coinVoices.clear();
  }

  private playWheelTone(
    frequencies: number[],
    duration: number,
    wave: OscillatorType,
  ): void {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      void context.resume().catch(() => {});
      for (const [index, frequency] of frequencies.entries()) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.018;
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, start);
        if (wave === "sawtooth")
          oscillator.frequency.exponentialRampToValueAtTime(
            frequency * 2.2,
            start + duration,
          );
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        oscillator.connect(gain).connect(context.destination);
        this.wheelVoices.add(oscillator);
        oscillator.onended = () => {
          this.wheelVoices.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      }
    } catch {
      // The wheel remains usable if Web Audio is unavailable.
    }
  }

  playWheelStart(): void {
    this.playWheelTone([95], 0.48, "sawtooth");
  }
  playWheelTick(): void {
    this.playWheelTone([980], 0.035, "square");
  }
  playWheelResult(positive: boolean): void {
    this.playWheelTone(
      positive ? [523, 659, 784] : [220, 185],
      positive ? 0.34 : 0.42,
      "triangle",
    );
  }

  private stopWheelSound(): void {
    for (const voice of this.wheelVoices) {
      try {
        voice.stop();
      } catch {
        /* it may have ended already */
      }
    }
    this.wheelVoices.clear();
  }

  private reportFailure(sound: CitySound): void {
    if (this.failed.has(sound)) return;
    this.failed.add(sound);
    console.warn(`Could not play the ${sound} sound. Check public/audio/.`);
  }

  private play(sound: CitySound, loop: boolean): void {
    if (this.muted || this.failed.has(sound)) return;
    const clip = this.clips.get(sound)!;
    if (loop && !clip.paused) return;
    clip.loop = loop;
    if (!loop) clip.currentTime = 0;
    void clip.play().catch((error: DOMException) => {
      // Pausing can cancel a pending play; autoplay restrictions can be retried.
      if (error.name !== "AbortError" && error.name !== "NotAllowedError")
        this.reportFailure(sound);
    });
  }

  /** Execute mission rules and sound only actual construction or water transfers. */
  performAction(
    state: CityState,
    action: CityAction,
    position: Vector3State,
    plotId: number | null,
    amount?: number,
    bubbles = false,
  ): string {
    const plot = state.plots.find((p) => p.id === plotId);
    const kind = plot?.kind;
    const sponge = state.sponge;
    const reused = state.reused;
    const budget = state.budget;
    const patrick = state.patrickCooldown;
    const machine = state.machineDisabled;
    const feedback = performCityAction(
      state,
      action,
      position,
      plotId,
      amount,
      bubbles,
    );
    if (action === "absorb" && state.sponge > sponge)
      this.requested.add("absorb");
    if (action === "spray" && state.reused > reused)
      this.requested.add(kind === "tank" ? "tank" : "spray");
    if (plot && plot.kind !== kind) {
      const sound =
        action === "karate"
          ? "asphalt"
          : action === "tree"
            ? "tree"
            : action === "pond"
              ? "pond"
              : action === "tank"
                ? "tank"
                : "build";
      this.play(sound, false);
    } else if (
      state.patrickCooldown > patrick ||
      state.machineDisabled > machine
    )
      this.play("asphalt", false);
    else if (action === "upgrade" && state.budget < budget)
      this.play("build", false);
    return feedback;
  }

  requestAbsorption(): void {
    this.requested.add("absorb");
  }

  /** Commit this frame's loops; pause, hidden tab and outcomes silence all voices. */
  update(active: boolean, raining: boolean, levelId?: string): void {
    if (!active || this.muted) this.stopFunding();
    if (document.hidden) this.stopWheelSound();
    for (const [level, clip] of this.stages) {
      if (!active || this.muted || level !== levelId) {
        clip.pause();
        clip.currentTime = 0;
      } else if (clip.paused) {
        void clip.play().catch(() => {});
      }
    }
    if (active && raining) this.requested.add("rain");
    for (const [sound, clip] of this.clips) {
      if (!active || this.muted || (clip.loop && !this.requested.has(sound))) {
        clip.pause();
        clip.currentTime = 0;
      } else if (this.requested.has(sound)) this.play(sound, true);
    }
    this.requested.clear();
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.update(false, false);
      this.stopWheelSound();
    }
    return this.muted;
  }
}
