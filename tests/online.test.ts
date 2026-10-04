import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { AccountStore } from "../server/store";
import { Rooms } from "../server/rooms";
import { createOnlineServer } from "../server/http";

test("unique accounts and best survival scores survive reopening storage", () => {
  const dir = mkdtempSync(join(tmpdir(), "sponge-accounts-")),
    path = join(dir, "accounts.sqlite");
  let store = new AccountStore(path);
  try {
    const { account, token } = store.create("TestSponge");
    assert.throws(() => store.create("testsponge"), /already taken/);
    assert.throws(() => store.create("<script>"), /letters/);
    assert.equal(store.account(token)?.username, "TestSponge");
    assert.equal(store.account("forged"), null);
    store.reward(account.id, "server-event-1", 40);
    store.reward(account.id, "server-event-1", 40);
    store.reward(account.id, "server-win", 0, 1);
    const runId = store.startSurvivalRun(account.id, "solo", 1000);
    store.finishSurvivalRun(account.id, runId, 94000);
    store.close();
    store = new AccountStore(path);
    assert.equal(store.account(token)?.id, account.id);
    assert.deepEqual(store.leaderboard(), [
      {
        playerId: account.id,
        username: "TestSponge",
        survivalTimeMs: 93000,
        mode: "solo",
      },
    ]);
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});
test("co-op shares legal construction, refuses client scores/positions and keeps individual hats", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store),
      a = store.create("AlphaSponge").account,
      b = store.create("BetaSponge").account;
    const first = rooms.create(a);
    rooms.join(b, first.code);
    assert.deepEqual(
      rooms.current(b.id)!.city.campaign!.locations,
      first.city.campaign!.locations,
    );
    assert.equal(new Set(first.city.campaign!.locations).size, 4);
    rooms.command(a.id, { equippedHat: "wizard" });
    assert.equal(
      rooms.current(b.id)!.players.find((p) => p.id === a.id)!.equippedHat,
      "wizard",
    );
    assert.equal(
      rooms.current(b.id)!.players.find((p) => p.id === b.id)!.equippedHat,
      null,
    );
    rooms.command(b.id, { equippedHat: "wizard" });
    rooms.command(a.id, { equippedHat: null });
    assert.equal(
      rooms.current(b.id)!.players.find((p) => p.id === b.id)!.equippedHat,
      "wizard",
    );
    assert.throws(
      () => rooms.command(a.id, { equippedHat: "invalid" as never }),
      /Unknown hat/,
    );
    rooms.command(a.id, {
      ready: true,
      movement: { forward: 1, right: 0, run: false, jump: false },
      yaw: 0,
    });
    for (let i = 0; i < 14; i++) rooms.tick(0.1);
    assert.deepEqual(store.leaderboard(), []);
    rooms.command(a.id, {
      movement: { forward: 0, right: 0, run: false, jump: false },
      yaw: 0,
      action: "karate",
      target: 2,
    });
    const changed = rooms.current(b.id)!;
    assert.equal(changed.city.plots[2].kind, "soil");
    assert.equal(changed.city.budget, 1210);
    const hatBalance = changed.city.budget;
    rooms.command(a.id, { equippedHat: "wizard" });
    assert.equal(rooms.current(a.id)!.city.budget, hatBalance);
    assert.deepEqual(rooms.current(a.id)!.city.campaign!.ownedHats, ["wizard"]);
    assert.equal(
      rooms.current(a.id)!.city.funding.earned,
      rooms.current(b.id)!.city.funding.earned,
    );
    const before = structuredClone(changed.players[0].player.position);
    rooms.command(a.id, {
      position: { x: 999, z: 999 },
      score: 999999,
      budget: 999999,
    } as never);
    assert.deepEqual(rooms.current(a.id)!.players[0].player.position, before);
    assert.throws(
      () =>
        rooms.command(a.id, {
          movement: { forward: 100, right: 0, run: false, jump: false },
          yaw: 0,
        }),
      /Invalid movement/,
    );
    rooms.join(store.create("GammaSponge").account, first.code);
    rooms.join(store.create("DeltaSponge").account, first.code);
    rooms.join(store.create("EpsilonSponge").account, first.code);
    rooms.leave(a.id);
    assert.equal(rooms.current(b.id)!.hostId, b.id);
  } finally {
    store.close();
  }
});
test("opening an old account database adds required persistence columns", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sponge-old-accounts-")),
    path = join(dir, "accounts.sqlite");
  const { DatabaseSync } = await import("node:sqlite");
  const oldDb = new DatabaseSync(path);
  oldDb.exec(
    "CREATE TABLE accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, funding INTEGER NOT NULL DEFAULT 0, campaigns INTEGER NOT NULL DEFAULT 0)",
  );
  oldDb.close();
  const store = new AccountStore(path);
  try {
    const player = store.create("ReturnPlayer").account;
    const run = store.startSurvivalRun(player.id, "practice", 1000);
    assert.equal(
      store.finishSurvivalRun(player.id, run, 10000).survivalTimeMs,
      9000,
    );
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});
test("leaderboard ranks best survival duration rather than funding or wins", () => {
  const store = new AccountStore(":memory:");
  try {
    const longer = store.create("LongerPlayer").account;
    const winner = store.create("WinningPlayer").account;
    store.reward(winner.id, "campaign-one", 100000, 20);
    const longerRun = store.startSurvivalRun(longer.id, "solo", 1000);
    const winnerRun = store.startSurvivalRun(winner.id, "practice", 1000);
    store.finishSurvivalRun(longer.id, longerRun, 3602000);
    store.finishSurvivalRun(winner.id, winnerRun, 3601000);
    assert.deepEqual(store.leaderboard(), [
      {
        playerId: longer.id,
        username: "LongerPlayer",
        survivalTimeMs: 3601000,
        mode: "solo",
      },
      {
        playerId: winner.id,
        username: "WinningPlayer",
        survivalTimeMs: 3600000,
        mode: "practice",
      },
    ]);
  } finally {
    store.close();
  }
});
test("survival pauses exclude paused time and duplicate runs never occupy multiple ranks", () => {
  const store = new AccountStore(":memory:");
  try {
    const players = Array.from(
      { length: 7 },
      (_, index) => store.create(`RankHero${index}`).account,
    );
    const pausedRun = store.startSurvivalRun(players[0]!.id, "practice", 1000);
    store.pauseSurvivalRun(players[0]!.id, pausedRun, 4000);
    store.resumeSurvivalRun(players[0]!.id, pausedRun, 9000);
    const firstResult = store.finishSurvivalRun(
      players[0]!.id,
      pausedRun,
      14000,
    );
    assert.equal(firstResult.survivalTimeMs, 8000);
    assert.equal(firstResult.improved, true);
    const duplicate = store.finishSurvivalRun(players[0]!.id, pausedRun, 20000);
    assert.equal(duplicate.survivalTimeMs, 8000);
    assert.equal(duplicate.improved, false);
    const betterRun = store.startSurvivalRun(players[0]!.id, "solo", 20000);
    assert.equal(
      store.finishSurvivalRun(players[0]!.id, betterRun, 33000).survivalTimeMs,
      13000,
    );
    for (let i = 1; i < players.length; i++) {
      const run = store.startSurvivalRun(
        players[i]!.id,
        i % 2 ? "solo" : "practice",
        1000,
      );
      store.finishSurvivalRun(players[i]!.id, run, 1000 + (13 - i) * 1000);
    }
    const topFive = store.leaderboard();
    assert.equal(topFive.length, 5);
    assert.deepEqual(
      topFive.map((entry) => entry.survivalTimeMs),
      [13000, 12000, 11000, 10000, 9000],
    );
    assert.equal(new Set(topFive.map((entry) => entry.playerId)).size, 5);
  } finally {
    store.close();
  }
});
test("room weather pauses with nobody ready and completion rewards are recorded once", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store),
      a = store.create("PausedSponge").account;
    rooms.create(a);
    rooms.tick();
    assert.equal(rooms.current(a.id)!.city.elapsed, 0);
    rooms.command(a.id, { ready: true });
    rooms.tick();
    assert.ok(rooms.current(a.id)!.city.elapsed > 0);
    rooms.command(a.id, { ready: false });
    const elapsed = rooms.current(a.id)!.city.elapsed;
    rooms.tick();
    assert.equal(rooms.current(a.id)!.city.elapsed, elapsed);
    assert.throws(() => rooms.command(a.id, { action: "reset" }), /Finish/);
  } finally {
    store.close();
  }
});
test("HTTP cookies restore identity, origin checks reject cross-site writes and API scores cannot be posted", async () => {
  const online = createOnlineServer(":memory:"),
    server = createServer((req, res) => void online.handle(req, res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const registration = await fetch(`${base}/api/account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "CookieSponge" }),
    });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=31536000/);
    const headers = {
      "Content-Type": "application/json",
      cookie: cookie.split(";")[0],
    };
    const account = await (
      await fetch(`${base}/api/account`, { headers })
    ).json();
    assert.equal(account.account.username, "CookieSponge");
    assert.equal(
      (
        await fetch(`${base}/api/rooms`, {
          method: "POST",
          headers: { ...headers, Origin: "https://other.example" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/api/command`, {
          method: "POST",
          headers,
          body: JSON.stringify({ score: 9999 }),
        })
      ).status,
      400,
    );
    const run = await (
      await fetch(`${base}/api/runs/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: "practice" }),
      })
    ).json();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const submitted = await (
      await fetch(`${base}/api/runs/finish`, {
        method: "POST",
        headers,
        body: JSON.stringify({ runId: run.runId, survivalTimeMs: 999999999 }),
      })
    ).json();
    assert.ok(submitted.survivalTimeMs > 0 && submitted.survivalTimeMs < 1000);
    assert.equal(submitted.entries[0].username, "CookieSponge");
    const duplicate = await (
      await fetch(`${base}/api/runs/finish`, {
        method: "POST",
        headers,
        body: JSON.stringify({ runId: run.runId }),
      })
    ).json();
    assert.equal(duplicate.survivalTimeMs, submitted.survivalTimeMs);
    const otherRegistration = await fetch(`${base}/api/account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "OtherLongRunner" }),
    });
    const otherCookie = otherRegistration.headers.get("set-cookie")!;
    const otherHeaders = {
      "Content-Type": "application/json",
      cookie: otherCookie.split(";")[0],
    };
    const otherRun = await (
      await fetch(`${base}/api/runs/start`, {
        method: "POST",
        headers: otherHeaders,
        body: JSON.stringify({ mode: "solo" }),
      })
    ).json();
    await new Promise((resolve) => setTimeout(resolve, 15));
    await fetch(`${base}/api/runs/finish`, {
      method: "POST",
      headers: otherHeaders,
      body: JSON.stringify({ runId: otherRun.runId }),
    });
    const globalEntries = await (await fetch(`${base}/api/leaderboard`)).json();
    assert.deepEqual(
      globalEntries.entries.map(
        (entry: { username: string }) => entry.username,
      ),
      ["OtherLongRunner", "CookieSponge"],
    );
    assert.equal(online.store.leaderboard().length, 2);
    assert.equal(
      (await fetch(`${base}/api/leaderboard`, { headers })).headers.get(
        "cache-control",
      ),
      "no-store",
    );
    const create = await (
      await fetch(`${base}/api/rooms`, { method: "POST", headers, body: "{}" })
    ).json();
    assert.equal(create.room.players[0].username, "CookieSponge");
    const events = await fetch(`${base}/api/events`, {
      headers: { ...headers, "Accept-Encoding": "identity" },
    });
    assert.match(events.headers.get("content-type")!, /event-stream/);
    assert.equal(events.headers.get("content-encoding"), null);
    const reader = events.body!.getReader();
    const first = await reader.read();
    assert.match(new TextDecoder().decode(first.value), /CookieSponge/);
    await reader.cancel();
  } finally {
    online.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("authoritative cooperative movement honors Shift sprint", () => {
  const store = new AccountStore(":memory:"),
    rooms = new Rooms(store);
  try {
    const a = store.create("WalkCheck").account,
      b = store.create("SprintCheck").account;
    const room = rooms.create(a);
    rooms.join(b, room.code);
    for (const [account, run] of [
      [a, false],
      [b, true],
    ] as const)
      rooms.command(account.id, {
        ready: true,
        movement: { forward: 1, right: 0, jump: false, run },
        yaw: 0,
      });
    for (let i = 0; i < 10; i++) rooms.tick(0.1);
    const players = rooms.current(a.id)!.players;
    const walk = players.find((p) => p.id === a.id)!.player,
      sprint = players.find((p) => p.id === b.id)!.player;
    assert.ok(Math.hypot(sprint.velocity.x, sprint.velocity.z) > 8.5);
    assert.ok(Math.hypot(walk.velocity.x, walk.velocity.z) < 5.1);
  } finally {
    store.close();
  }
});

test("pausing a multiplayer session does not submit a survival result", () => {
  const store = new AccountStore(":memory:"),
    rooms = new Rooms(store);
  try {
    const account = store.create("BriefSession").account;
    rooms.create(account);
    rooms.command(account.id, {
      ready: true,
      movement: { forward: 0, right: 0, jump: false, run: false },
      yaw: 0,
    });
    for (let i = 0; i < 6; i++) rooms.tick(0.1);
    rooms.command(account.id, { ready: false });
    assert.deepEqual(store.leaderboard(), []);
  } finally {
    store.close();
  }
});

test("co-op leader starts endless after victory and retries preserve the round", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store);
    const a = store.create("EndlessAlpha").account;
    const b = store.create("EndlessBeta").account;
    const first = rooms.create(a);
    rooms.join(b, first.code);
    const internal = (
      rooms as unknown as {
        rooms: Map<string, { city: import("../src/interfaces").CityState }>;
      }
    ).rooms.get(first.code)!;
    assert.throws(() => rooms.command(a.id, { action: "endless" }), /Finish/);
    internal.city.outcome = "won";
    assert.throws(() => rooms.command(b.id, { action: "endless" }), /leader/);
    rooms.command(a.id, { action: "endless" });
    const started = rooms.current(a.id)!;
    assert.equal(started.city.campaign!.endlessRound, 1);
    assert.equal(started.city.outcome, "playing");
    assert.deepEqual(started.city, rooms.current(b.id)!.city);
    assert.ok(started.players.every((p) => !p.ready));
    internal.city.outcome = "lost";
    rooms.command(a.id, { action: "reset" });
    const retry = rooms.current(b.id)!;
    assert.equal(retry.city.campaign!.endlessRound, 1);
    assert.equal(retry.city.campaign!.level, started.city.campaign!.level);
    assert.deepEqual(
      retry.city.campaign!.locations,
      started.city.campaign!.locations,
    );
    assert.equal(retry.city.outcome, "playing");
  } finally {
    store.close();
  }
});

test("co-op applies one server-chosen modifier and advances every player together", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store);
    const a = store.create("ModifierAlpha").account;
    const b = store.create("ModifierBeta").account;
    const first = rooms.create(a);
    rooms.join(b, first.code);
    const internal = (
      rooms as unknown as {
        rooms: Map<string, { city: import("../src/interfaces").CityState }>;
      }
    ).rooms.get(first.code)!;
    internal.city.campaign!.wheelPending = true;
    internal.city.campaign!.completed = ["riehenring"];
    rooms.command(a.id, { ready: true });
    rooms.tick();
    const state = rooms.current(a.id)!;
    assert.equal(state.city.campaign!.level, 1);
    assert.equal(state.city.campaign!.wheelPending, false);
    assert.ok(state.city.campaign!.activeModifier);
    assert.deepEqual(state.city, rooms.current(b.id)!.city);
    assert.ok(state.players.every((p) => !p.ready));
  } finally {
    store.close();
  }
});

test("64 active players fit one room, move authoritatively, and free a slot on leaving", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store);
    const players = Array.from(
      { length: 65 },
      (_, i) => store.create(`Crowd${i}`).account,
    );
    const room = rooms.create(players[0]);
    for (const player of players.slice(1, 64)) rooms.join(player, room.code);
    const initial = rooms.current(players[0].id)!;
    assert.equal(initial.players.length, 64);
    assert.equal(
      new Set(
        initial.players.map(
          (p) => `${p.player.position.x},${p.player.position.z}`,
        ),
      ).size,
      64,
    );
    assert.throws(
      () => rooms.join(players[64], room.code),
      /full \(64 players\)/,
    );
    assert.equal(rooms.join(players[0], room.code).players.length, 64);
    for (const player of players.slice(0, 64))
      rooms.command(player.id, {
        ready: true,
        movement: { forward: 1, right: 0, run: false, jump: false },
        yaw: 0,
      });
    for (let i = 0; i < 10; i++) rooms.tick(0.1);
    const active = rooms.current(players[0].id)!;
    assert.equal(active.players.filter((p) => p.ready).length, 64);
    assert.ok(
      active.players.every(
        (p) =>
          Number.isFinite(p.player.position.x) &&
          Number.isFinite(p.player.position.z),
      ),
    );
    assert.ok(
      active.players.some(
        (p, i) => p.player.position.z !== initial.players[i].player.position.z,
      ),
    );
    rooms.leave(players[0].id);
    const replaced = rooms.join(players[64], room.code);
    assert.equal(replaced.players.length, 64);
    assert.equal(replaced.hostId, players[1].id);
  } finally {
    store.close();
  }
});

test("64 demo attendees register on one network and receive live room broadcasts", async () => {
  const online = createOnlineServer(":memory:");
  const server = createServer((req, res) => void online.handle(req, res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/`;
  const controllers: AbortController[] = [];
  try {
    const cookies = await Promise.all(
      Array.from({ length: 65 }, async (_, i) => {
        const res = await fetch(base + "account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: `Audience${i}` }),
        });
        assert.equal(res.status, 201);
        return res.headers.get("set-cookie")!.split(";")[0];
      }),
    );
    const post = (cookie: string, path: string, data: unknown) =>
      fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify(data),
      });
    const { room } = await (await post(cookies[0], "rooms", {})).json();
    await Promise.all(
      cookies
        .slice(1, 64)
        .map(async (cookie) =>
          assert.equal(
            (await post(cookie, "join", { code: room.code })).status,
            200,
          ),
        ),
    );
    assert.equal(
      (await post(cookies[64], "join", { code: room.code })).status,
      400,
    );
    const readers = await Promise.all(
      cookies.slice(0, 64).map(async (cookie) => {
        const controller = new AbortController();
        controllers.push(controller);
        const res = await fetch(base + "events", {
          headers: { cookie },
          signal: controller.signal,
        });
        assert.equal(res.headers.get("content-encoding"), "gzip");
        return res.body!.getReader();
      }),
    );
    const readSnapshot = async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
    ) => {
      let text = "";
      while (!text.includes("\n\n")) {
        const { value, done } = await reader.read();
        assert.equal(done, false);
        text += new TextDecoder().decode(value);
      }
      return JSON.parse(text.split("\n\n")[0].slice(6));
    };
    const first = await Promise.all(readers.map(readSnapshot));
    assert.ok(first.every((snapshot) => snapshot.players.length === 64));
    await Promise.all(
      cookies.slice(0, 64).map(async (cookie) =>
        assert.equal(
          (
            await post(cookie, "command", {
              ready: true,
              movement: { forward: 1, right: 0, run: false, jump: false },
              yaw: 0,
            })
          ).status,
          200,
        ),
      ),
    );
    await post(cookies[0], "command", { equippedHat: "wizard" });
    const deadline = Date.now() + 5000;
    await Promise.all(
      readers.map(async (reader) => {
        let snapshot;
        do {
          assert.ok(
            Date.now() < deadline,
            "all viewers receive the latest hat within five seconds",
          );
          snapshot = await readSnapshot(reader);
        } while (snapshot.players[0].equippedHat !== "wizard");
        assert.equal(snapshot.players.length, 64);
        assert.ok(
          snapshot.players
            .slice(1)
            .every((p: { equippedHat: unknown }) => p.equippedHat === null),
        );
      }),
    );
  } finally {
    controllers.forEach((controller) => controller.abort());
    online.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
