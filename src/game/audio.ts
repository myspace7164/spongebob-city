import { riversideBuddy as buddyConfig } from "../../config/riverside-buddy.ts";
import { riversideBuddyPose } from "./riverside-buddy.ts";
import { cast, characterConfig } from "../../config/characters.ts";
import { castPosition, characterAudibility } from "./cast.ts";
import { citySounds, levelSounds } from "../../config/audio.ts";
import { fundingConfig as funding } from "../../config/funding.ts";
import { performCityAction } from "./city.ts";
import type {
  CityAction,
  CitySound,
  CityState,
  Vector3State,
} from "../interfaces.ts";

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
  private characterVoices = new Map<
    string,
    { oscillator: OscillatorNode; gain: GainNode; pan: StereoPannerNode }
  >();

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

  /** Short brass-like fanfare for finishing the full campaign. */
  playCampaignVictory(): void {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      void context.resume().catch(() => {});
      const notes = [523, 659, 784, 1047, 784, 1047];
      for (const [index, frequency] of notes.entries()) {
        const start = context.currentTime + index * 0.16;
        const oscillator = context.createOscillator();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(frequency, start);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1700, start);
        filter.Q.setValueAtTime(1.2, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.025);
        gain.gain.setValueAtTime(0.1, start + 0.105);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.23);
        oscillator.connect(filter).connect(gain).connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(start + 0.24);
      }
    } catch {
      // The campaign report remains available without Web Audio.
    }
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
    if (!active || this.muted) {
      this.stopFunding();
      this.stopCharacters();
    }
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

  /** Original gibberish voices fade with distance and freeze with the simulation. */
  updateCharacters(
    active: boolean,
    s: CityState,
    listener: Vector3State,
    yaw: number,
    playerSpeaking = false,
  ): void {
    if (!active || this.muted || document.hidden) {
      this.stopCharacters();
      return;
    }
    const buddy = riversideBuddyPose(s);
    const sources = [
      ...cast.map((actor, index) => ({
        id: actor.id as string,
        pitch: actor.pitch as number,
        ...castPosition(s, index),
      })),
      { id: "buddy", pitch: buddyConfig.voicePitch, x: buddy.x, z: buddy.z },
      { id: "beton", pitch: 65, x: s.saboteur.x, z: s.saboteur.z },
      { id: "sponge", pitch: 420, x: listener.x, z: listener.z },
    ];
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
      for (const [index, source] of sources.entries()) {
        const dx = source.x - listener.x,
          dz = source.z - listener.z;
        const audible = characterAudibility(Math.hypot(dx, dz));
        const speaking =
          source.id === "sponge"
            ? playerSpeaking
            : source.id === "buddy"
              ? buddy.speaking
              : (s.elapsed + index * 1.3) % 6 < 1.8;
        if (!audible || !speaking) {
          const old = this.characterVoices.get(source.id);
          if (old) {
            old.oscillator.stop();
            old.oscillator.disconnect();
            old.gain.disconnect();
            old.pan.disconnect();
            this.characterVoices.delete(source.id);
          }
          continue;
        }
        let voice = this.characterVoices.get(source.id);
        if (!voice) {
          const oscillator = this.context.createOscillator(),
            gain = this.context.createGain(),
            pan = this.context.createStereoPanner();
          oscillator.type = source.id === "beton" ? "sawtooth" : "triangle";
          gain.gain.value = 0;
          oscillator
            .connect(gain)
            .connect(pan)
            .connect(this.context.destination);
          oscillator.start();
          voice = { oscillator, gain, pan };
          this.characterVoices.set(source.id, voice);
        }
        const syllable = Math.floor(s.elapsed * 9);
        voice.oscillator.frequency.setTargetAtTime(
          source.pitch * (0.8 + ((syllable + index * 3) % 5) * 0.13),
          this.context.currentTime,
          0.025,
        );
        voice.gain.gain.setTargetAtTime(
          audible *
            characterConfig.voiceVolume *
            (0.35 + Math.abs(Math.sin(s.elapsed * 28))),
          this.context.currentTime,
          0.025,
        );
        voice.pan.pan.value = Math.max(
          -1,
          Math.min(
            1,
            (dx * Math.cos(yaw) - dz * Math.sin(yaw)) /
              characterConfig.voiceDistance,
          ),
        );
      }
    } catch {
      this.stopCharacters();
    }
  }
  private stopCharacters(): void {
    for (const voice of this.characterVoices.values()) {
      voice.oscillator.stop();
      voice.oscillator.disconnect();
      voice.gain.disconnect();
      voice.pan.disconnect();
    }
    this.characterVoices.clear();
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
