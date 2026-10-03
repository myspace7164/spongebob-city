import { briefingConfig as c } from "../../config/briefing.ts";

/** Word-paced text with a bounded, original wah-wah voice; no recorded speech. */
export class StorySpeech {
  private context?: AudioContext;
  private voices = new Set<OscillatorNode>();
  private timer?: ReturnType<typeof setInterval>;
  private revealAll?: () => void;
  private muted = false;
  constructor(private mascot: HTMLElement) {}
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.silence();
    else if (this.timer) this.prepareAudio();
  }
  speak(container: HTMLElement, paragraphs: readonly string[]): void {
    this.stop();
    const words = paragraphs.map((text) => text.split(/\s+/));
    const nodes = words.map(() => document.createElement("p"));
    container.replaceChildren(...nodes);
    const total = words.reduce((n, line) => n + line.length, 0);
    const duration = Math.min(
      c.maximumSeconds * 1000,
      (total * 60000) / c.wordsPerMinute,
    );
    const reveal = (count: number) => {
      for (const [i, line] of words.entries()) {
        nodes[i].textContent = line.slice(0, Math.max(0, count)).join(" ");
        count -= line.length;
      }
    };
    this.revealAll = () => reveal(total);
    this.mascot.classList.add("speaking");
    this.mascot.dataset.speaking = "true";
    const started = performance.now();
    let lastSyllable = -1;
    this.prepareAudio();
    const tick = () => {
      const elapsed = performance.now() - started;
      if (document.hidden || elapsed >= duration) return this.stop();
      reveal(Math.max(1, Math.floor((elapsed * total) / duration)));
      const syllable = Math.floor(elapsed / (c.syllableSeconds * 1000));
      if (syllable !== lastSyllable) {
        lastSyllable = syllable;
        this.wah(syllable);
      }
    };
    tick();
    this.timer = setInterval(tick, 40);
  }
  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.revealAll?.();
    this.revealAll = undefined;
    this.mascot.classList.remove("speaking");
    this.mascot.dataset.speaking = "false";
    this.silence();
  }
  private prepareAudio(): void {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {
        this.mascot.dataset.voice = "blocked";
      });
    } catch {
      // Text remains readable on browsers without Web Audio.
      this.mascot.dataset.voice = "unavailable";
    }
  }
  private silence(): void {
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  }
  private wah(syllable: number): void {
    if (this.muted || !this.context || this.context.state !== "running") return;
    const context = this.context,
      now = context.currentTime;
    const voice = context.createOscillator();
    const vowel = context.createBiquadFilter();
    const envelope = context.createGain();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(c.pitch + (syllable % 3) * c.pitchStep, now);
    vowel.type = "bandpass";
    vowel.Q.value = 3;
    vowel.frequency.setValueAtTime(c.formantLow, now);
    vowel.frequency.exponentialRampToValueAtTime(
      c.formantHigh,
      now + c.syllableSeconds / 2,
    );
    vowel.frequency.exponentialRampToValueAtTime(
      c.formantLow,
      now + c.syllableSeconds,
    );
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(c.volume, now + 0.02);
    envelope.gain.linearRampToValueAtTime(0, now + c.syllableSeconds);
    voice.connect(vowel).connect(envelope).connect(context.destination);
    this.voices.add(voice);
    voice.onended = () => {
      this.voices.delete(voice);
      voice.disconnect();
      vowel.disconnect();
      envelope.disconnect();
    };
    voice.start(now);
    voice.stop(now + c.syllableSeconds);
  }
}
