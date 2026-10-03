import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { Account, LeaderboardEntry } from "../src/interfaces.ts";
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
  leaderboard(): LeaderboardEntry[] {
    const rows = this.db
      .prepare(
        "SELECT username,play_seconds AS playSeconds FROM accounts WHERE play_seconds>0 ORDER BY play_seconds DESC,name_key ASC LIMIT 50",
      )
      .all() as unknown as LeaderboardEntry[];
    return rows.map((row) => ({ ...row }));
  }
  close(): void {
    this.db.close();
  }
}
