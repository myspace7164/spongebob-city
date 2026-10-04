import type { LeaderboardEntry } from "../interfaces.ts";

interface RunStartResponse {
  runId: string;
}

export interface SurvivalRunResult {
  runId: string;
  survivalTimeMs: number;
  entries: LeaderboardEntry[];
  improved: boolean;
}

type Request = <T>(path: string, body?: unknown) => Promise<T>;

/** Serializes timestamp-run requests so pause/resume cannot overtake a start. */
export class SurvivalRunTracker {
  private runId: string | null = null;
  private state: "idle" | "running" | "paused" | "finishing" | "finished" =
    "idle";
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private request: Request,
    private onFinish: (result: SurvivalRunResult) => void,
    private onError: (message: string) => void = () => {},
  ) {}

  start(mode: "solo" | "practice"): void {
    this.enqueue(async () => {
      if (this.state === "running" || this.state === "finishing") return;
      if (!this.runId) {
        const result = await this.request<RunStartResponse>("runs/start", {
          mode,
        });
        this.runId = result.runId;
      } else if (this.state === "paused") {
        await this.request("runs/resume", { runId: this.runId });
      }
      this.state = "running";
    });
  }

  pause(): void {
    this.enqueue(async () => {
      if (this.state !== "running" || !this.runId) return;
      await this.request("runs/pause", { runId: this.runId });
      this.state = "paused";
    });
  }

  finish(): void {
    this.enqueue(async () => {
      if (!this.runId || this.state === "finished") return;
      this.state = "finishing";
      try {
        const result = await this.request<SurvivalRunResult>("runs/finish", {
          runId: this.runId,
        });
        this.state = "finished";
        this.onFinish(result);
      } catch (error) {
        this.state = "paused";
        throw error;
      }
    });
  }

  reset(): void {
    this.enqueue(async () => {
      this.runId = null;
      this.state = "idle";
    });
  }

  private enqueue(operation: () => Promise<void>): void {
    this.queue = this.queue
      .then(operation)
      .catch((error: unknown) => {
        this.onError(
          error instanceof Error ? error.message : "Survival score unavailable.",
        );
      });
  }
}
