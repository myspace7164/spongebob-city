import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { Account, LeaderboardEntry } from "../src/interfaces.ts";
export type SurvivalMode = "solo" | "practice" | "multiplayer";
export interface SurvivalRunResult {
  runId: string;
  survivalTimeMs: number;
  entries: LeaderboardEntry[];
  improved: boolean;
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export class AccountStore {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, funding INTEGER NOT NULL DEFAULT 0, campaigns INTEGER NOT NULL DEFAULT 0, play_seconds INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS rewards (claim TEXT PRIMARY KEY, account_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS survival_runs (
        run_id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id),
        mode TEXT NOT NULL CHECK(mode IN ('solo','practice','multiplayer')),
        started_at INTEGER NOT NULL,
        paused_ms INTEGER NOT NULL DEFAULT 0,
        paused_at INTEGER,
        ended_at INTEGER,
        survival_time_ms INTEGER
      );
      CREATE TABLE IF NOT EXISTS survival_bests (
        account_id TEXT PRIMARY KEY REFERENCES accounts(id),
        survival_time_ms INTEGER NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('solo','practice','multiplayer')),
        achieved_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS survival_bests_rank
        ON survival_bests(survival_time_ms DESC, achieved_at ASC);
      CREATE INDEX IF NOT EXISTS survival_runs_account_ended
        ON survival_runs(account_id, ended_at DESC, run_id ASC);
    `);
    const columns = this.db.prepare("PRAGMA table_info(accounts)").all() as {
      name: string;
    }[];
    if (!columns.some((column) => column.name === "play_seconds"))
      this.db.exec(
        "ALTER TABLE accounts ADD COLUMN play_seconds INTEGER NOT NULL DEFAULT 0",
      );
  }
  create(username: unknown): { account: Account; token: string } {
    if (
      typeof username !== "string" ||
      !/^[A-Za-z0-9_]{3,20}$/.test(username.trim())
    )
      throw new Error("Use 3–20 letters, numbers or underscores.");
    username = username.trim();
    const account = { id: randomUUID(), username: username as string };
    const token = randomBytes(32).toString("hex");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT INTO accounts(id,username,name_key) VALUES(?,?,?)")
        .run(account.id, account.username, account.username.toLowerCase());
      this.db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(hash(token), account.id, Date.now() + 365 * 86400000);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      if (String(error).includes("UNIQUE"))
        throw new Error("That username is already taken. Pick another.");
      throw error;
    }
    return { account, token };
  }
  account(token: string | undefined): Account | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return (
      (this.db
        .prepare(
          "SELECT a.id,a.username FROM accounts a JOIN sessions s ON a.id=s.account_id WHERE s.hash=? AND s.expires>?",
        )
        .get(hash(token), Date.now()) as unknown as Account) ?? null
    );
  }
  reward(id: string, claim: string, funding: number, campaigns = 0): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db
        .prepare("INSERT OR IGNORE INTO rewards VALUES(?,?)")
        .run(claim, id);
      if (result.changes)
        this.db
          .prepare(
            "UPDATE accounts SET funding=funding+?,campaigns=campaigns+? WHERE id=?",
          )
          .run(Math.max(0, Math.floor(funding)), campaigns, id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  recordPlaytime(id: string, seconds: number): void {
    const elapsed = Math.floor(seconds);
    if (elapsed <= 0) return;
    this.db
      .prepare("UPDATE accounts SET play_seconds=play_seconds+? WHERE id=?")
      .run(elapsed, id);
  }
  startSurvivalRun(
    accountId: string,
    mode: SurvivalMode,
    now = Date.now(),
  ): string {
    this.db
      .prepare(
        "DELETE FROM survival_runs WHERE account_id=? AND mode=? AND ended_at IS NULL",
      )
      .run(accountId, mode);
    const runId = randomUUID();
    this.db
      .prepare(
        "INSERT INTO survival_runs(run_id,account_id,mode,started_at) VALUES(?,?,?,?)",
      )
      .run(runId, accountId, mode, now);
    return runId;
  }
  pauseSurvivalRun(accountId: string, runId: string, now = Date.now()): void {
    this.db
      .prepare(
        "UPDATE survival_runs SET paused_at=? WHERE run_id=? AND account_id=? AND ended_at IS NULL AND paused_at IS NULL",
      )
      .run(now, runId, accountId);
  }
  resumeSurvivalRun(accountId: string, runId: string, now = Date.now()): void {
    this.db
      .prepare(
        "UPDATE survival_runs SET paused_ms=paused_ms+MAX(0,?-paused_at),paused_at=NULL WHERE run_id=? AND account_id=? AND ended_at IS NULL AND paused_at IS NOT NULL",
      )
      .run(now, runId, accountId);
  }
  finishSurvivalRun(
    accountId: string,
    runId: string,
    now = Date.now(),
  ): SurvivalRunResult {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const run = this.db
        .prepare(
          "SELECT run_id,mode,started_at,paused_ms,paused_at,ended_at,survival_time_ms FROM survival_runs WHERE run_id=? AND account_id=?",
        )
        .get(runId, accountId) as
        | {
            run_id: string;
            mode: SurvivalMode;
            started_at: number;
            paused_ms: number;
            paused_at: number | null;
            ended_at: number | null;
            survival_time_ms: number | null;
          }
        | undefined;
      if (!run) throw new Error("Survival run not found.");
      const previousBest = this.db
        .prepare(
          "SELECT survival_time_ms FROM survival_bests WHERE account_id=?",
        )
        .get(accountId) as { survival_time_ms: number } | undefined;
      const survivalTimeMs =
        run.survival_time_ms ??
        Math.max(
          0,
          Math.min(
            24 * 60 * 60 * 1000,
            now -
              run.started_at -
              run.paused_ms -
              (run.paused_at === null ? 0 : Math.max(0, now - run.paused_at)),
          ),
        );
      if (!run.ended_at) {
        this.db
          .prepare(
            "UPDATE survival_runs SET ended_at=?,survival_time_ms=? WHERE run_id=? AND account_id=? AND ended_at IS NULL",
          )
          .run(now, survivalTimeMs, runId, accountId);
        if (survivalTimeMs > 0)
          this.db
            .prepare(
              `INSERT INTO survival_bests(account_id,survival_time_ms,mode,achieved_at)
               VALUES(?,?,?,?)
               ON CONFLICT(account_id) DO UPDATE SET
                 survival_time_ms=excluded.survival_time_ms,
                 mode=excluded.mode,
                 achieved_at=excluded.achieved_at
               WHERE excluded.survival_time_ms>survival_bests.survival_time_ms`,
            )
            .run(accountId, survivalTimeMs, run.mode, now);
      }
      const isBest =
        !run.ended_at && survivalTimeMs > (previousBest?.survival_time_ms ?? 0);
      this.db.exec("COMMIT");
      return {
        runId,
        survivalTimeMs,
        entries: this.leaderboard(),
        improved: isBest,
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  latestSurvivalRun(accountId: string): {
    survivalTimeMs: number;
    mode: SurvivalMode;
  } | null {
    const run = this.db
      .prepare(
        "SELECT survival_time_ms AS survivalTimeMs,mode FROM survival_runs WHERE account_id=? AND ended_at IS NOT NULL AND survival_time_ms>0 ORDER BY ended_at DESC,run_id ASC LIMIT 1",
      )
      .get(accountId) as
      { survivalTimeMs: number; mode: SurvivalMode } | undefined;
    return run ?? null;
  }
  leaderboard(): LeaderboardEntry[] {
    const rows = this.db
      .prepare(
        `SELECT a.id AS playerId,a.username,b.survival_time_ms AS survivalTimeMs,b.mode
         FROM survival_bests b JOIN accounts a ON a.id=b.account_id
         ORDER BY b.survival_time_ms DESC,b.achieved_at ASC,a.name_key ASC LIMIT 5`,
      )
      .all() as unknown as LeaderboardEntry[];
    return rows.map((row) => ({ ...row }));
  }
  close(): void {
    this.db.close();
  }
}
