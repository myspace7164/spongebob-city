import { onlineRequest, OnlineConnection } from "../game/network.ts";
import type { Account, RoomSnapshot, LeaderboardEntry } from "../interfaces.ts";
import { formatSurvivalTime } from "../game/time-format.ts";
const el = (id: string) => document.getElementById(id)!;
export class OnlineUI {
  available = false;
  constructor(
    private connection: OnlineConnection,
    private joined: (room: RoomSnapshot) => void,
    private left: () => void,
    private leaderboardUpdated: (
      entries: readonly LeaderboardEntry[] | null,
    ) => void = () => {},
  ) {
    el("online-toggle").addEventListener("click", () => {
      document.exitPointerLock();
      if (this.connection.account) this.show();
      else this.promptForName();
    });
    el("online-close").addEventListener("click", () => this.hide());
    el("account-form").addEventListener("submit", (event) => {
      event.preventDefault();
      void this.run(async () => {
        const result = await onlineRequest<{ account: Account }>("account", {
          username: (el("username") as HTMLInputElement).value,
        });
        connection.account = result.account;
        this.renderAccount();
        this.status("USERNAME CLAIMED! Your browser will remember you.");
      });
    });
    el("create-room").addEventListener(
      "click",
      () =>
        void this.run(async () => {
          const { room } = await onlineRequest<{ room: RoomSnapshot }>(
            "rooms",
            {},
          );
          this.enter(room);
        }),
    );
    el("join-room-form").addEventListener("submit", (event) => {
      event.preventDefault();
      void this.run(async () => {
        const { room } = await onlineRequest<{ room: RoomSnapshot }>("join", {
          code: (el("room-code") as HTMLInputElement).value,
        });
        this.enter(room);
      });
    });
    el("leave-room").addEventListener(
      "click",
      () =>
        void this.run(async () => {
          await onlineRequest("leave", {});
          connection.close();
          this.left();
          this.renderRoom(null);
          this.status("You left the room.");
        }),
    );
    void this.init();
  }
  private async init(): Promise<void> {
    try {
      const { account } = await onlineRequest<{ account: Account | null }>(
        "account",
      );
      this.available = true;
      this.connection.account = account;
      this.renderAccount();
      if (account) {
        const { room } = await onlineRequest<{ room: RoomSnapshot | null }>(
          "room",
        );
        if (room) this.enter(room, false);
      }
      el("online-toggle").textContent = account
        ? `🧽 ${account.username} · PLAY ONLINE`
        : "🧽 CLAIM YOUR NAME · PLAY ONLINE";
      void this.loadLeaderboard();
    } catch {
      this.leaderboardUpdated(null);
      this.status("Online server unavailable. Solo practice is available.");
      el("online-toggle").textContent = "ONLINE UNAVAILABLE · SOLO PRACTICE";
    }
  }
  requireAccount(): boolean {
    if (this.available && !this.connection.account) {
      this.promptForName();
      return false;
    }
    return true;
  }
  status(message: string): void {
    el("online-status").textContent = message;
    el("connection-status").textContent = message;
    el("name-status").textContent = message;
  }
  private promptForName(): void {
    el("menu").hidden = false;
    (el("player-name-details") as HTMLDetailsElement).open = true;
    el("username").focus({ preventScroll: true });
    this.status(
      "Choose a character name to play online and appear on the leaderboard.",
    );
  }
  show(): void {
    el("online-panel").hidden = false;
    void this.loadLeaderboard();
    this.renderAccount();
    this.renderRoom(this.connection.room);
  }
  hide(): void {
    el("online-panel").hidden = true;
  }
  private enter(room: RoomSnapshot, show = true): void {
    this.connection.room = room;
    this.joined(room);
    this.connection.watch();
    this.renderRoom(room);
    if (show) this.hide();
  }
  private renderAccount(): void {
    const account = this.connection.account;
    el("account-form").hidden = !!account;
    el("online-controls").hidden = !account;
    el("account-name").textContent = account
      ? `CHARACTER NAME: ${account.username}`
      : "NAME YOUR CHARACTER";
    (el("player-name-details") as HTMLDetailsElement).open = false;
    el("online-account-name").textContent = account
      ? `YOU ARE ${account.username}`
      : "PICK YOUR SPONGE NAME";
    el("online-close").textContent = account ? "Back to game" : "Back";
    if (account)
      el("online-toggle").textContent = `🧽 ${account.username} · PLAY ONLINE`;
  }
  renderRoom(room: RoomSnapshot | null): void {
    el("play").textContent = room ? "RESUME CO-OP ➜" : "SOLO PRACTICE ➜";
    el("room-info").hidden = !room;
    el("room-actions").hidden = !!room;
    el("room-label").textContent = room
      ? `ROOM ${room.code} · ${room.players.length}/4 SPONGES`
      : "";
    el("team-status").hidden = !room;
    el("team-status").textContent = room
      ? `CO-OP ${room.code} · ${room.players.length}/4 · SHARED COINS + WATER`
      : "";
    el("room-roster").replaceChildren(
      ...(room?.players ?? []).map((p) => {
        const item = document.createElement("li");
        item.textContent = `${p.username}${p.id === room?.hostId ? " ★ LEADER" : ""} · ${p.ready ? "PLAYING" : "PAUSED"}`;
        return item;
      }),
    );
  }
  private async loadLeaderboard(): Promise<void> {
    try {
      const { entries } = await onlineRequest<{ entries: LeaderboardEntry[] }>(
        "leaderboard",
      );
      this.renderLeaderboard(entries);
    } catch {
      this.leaderboardUpdated(null);
      el("leaderboard-empty").textContent =
        "Leaderboard unavailable. Reconnect to try again.";
    }
  }
  async refreshLeaderboard(): Promise<LeaderboardEntry[]> {
    const { entries } = await onlineRequest<{ entries: LeaderboardEntry[] }>(
      "leaderboard",
    );
    this.renderLeaderboard(entries);
    return entries;
  }
  async showLatestSurvivalResult(): Promise<void> {
    const [latest, entries] = await Promise.all([
      onlineRequest<{
        survivalTimeMs: number;
        mode: LeaderboardEntry["mode"];
      } | null>("runs/latest"),
      this.refreshLeaderboard(),
    ]);
    if (latest) this.showSurvivalResult(latest.survivalTimeMs, entries, false);
  }
  showSurvivalResult(
    survivalTimeMs: number,
    entries: readonly LeaderboardEntry[],
    improved: boolean,
  ): void {
    // The server response already contains the global top five. Reuse it for
    // the menu and in-world sign instead of issuing another leaderboard query.
    this.renderLeaderboard(entries);
    const report = el("survival-report");
    report.hidden = false;
    el("survival-time").textContent = formatSurvivalTime(survivalTimeMs);
    el("survival-record-status").textContent = improved
      ? "NEW PERSONAL BEST!"
      : "RUN RECORDED";
    el("survival-top-five").replaceChildren(
      ...entries.slice(0, 5).map((entry, index) => {
        const row = document.createElement("li");
        row.textContent = `${index + 1}. ${entry.username} · ${formatSurvivalTime(entry.survivalTimeMs)}`;
        if (entry.playerId === this.connection.account?.id)
          row.classList.add("current-player");
        return row;
      }),
    );
  }
  private renderLeaderboard(entries: readonly LeaderboardEntry[]): void {
    const topFive = entries.slice(0, 5);
    el("leaderboard-rows").replaceChildren(
      ...topFive.map((entry, i) => {
        const row = document.createElement("tr");
        for (const value of [
          `${i + 1}`,
          entry.username,
          formatSurvivalTime(entry.survivalTimeMs),
        ]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        }
        return row;
      }),
    );
    el("leaderboard-empty").hidden = topFive.length > 0;
    this.leaderboardUpdated(topFive);
  }
  private async run(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (error) {
      this.status((error as Error).message);
    }
  }
}
