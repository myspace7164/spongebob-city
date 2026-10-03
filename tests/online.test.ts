import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { AccountStore } from "../server/store";
import { Rooms } from "../server/rooms";
import { createOnlineServer } from "../server/http";

test("unique account names, opaque sessions and leaderboard rewards survive reopening storage", () => {
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
    store.close();
    store = new AccountStore(path);
    assert.equal(store.account(token)?.id, account.id);
    assert.deepEqual(store.leaderboard(), [
      { username: "TestSponge", funding: 40, campaigns: 1 },
    ]);
  } finally {
    store.close();
    rmSync(dir, { recursive: true });
  }
});
test("co-op shares legal construction, refuses client scores/positions and limits rooms to four", () => {
  const store = new AccountStore(":memory:");
  try {
    const rooms = new Rooms(store),
      a = store.create("AlphaSponge").account,
      b = store.create("BetaSponge").account;
    const first = rooms.create(a);
    rooms.join(b, first.code);
    rooms.command(a.id, {
      ready: true,
      movement: { forward: 1, right: 0, run: false, jump: false },
      yaw: 0,
    });
    for (let i = 0; i < 14; i++) rooms.tick(0.1);
    rooms.command(a.id, {
      movement: { forward: 0, right: 0, run: false, jump: false },
      yaw: 0,
      action: "karate",
      target: 2,
    });
    const changed = rooms.current(b.id)!;
    assert.equal(changed.city.plots[2].kind, "soil");
    assert.equal(changed.city.budget, 2210);
    assert.equal(store.leaderboard()[0].funding, 40);
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
    assert.equal(store.leaderboard()[0].funding, 40);
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
    assert.throws(
      () => rooms.join(store.create("EpsilonSponge").account, first.code),
      /full/,
    );
    rooms.leave(a.id);
    assert.equal(rooms.current(b.id)!.hostId, b.id);
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
    const create = await (
      await fetch(`${base}/api/rooms`, { method: "POST", headers, body: "{}" })
    ).json();
    assert.equal(create.room.players[0].username, "CookieSponge");
    const events = await fetch(`${base}/api/events`, { headers });
    assert.match(events.headers.get("content-type")!, /event-stream/);
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
