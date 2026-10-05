import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { RequestLimits, clientAddress } from "../server/security.ts";
import type { IncomingMessage } from "node:http";
import { request } from "node:http";
import { AccountStore } from "../server/store.ts";

test("new runs replace unfinished runs only for the same account and mode", () => {
  const store = new AccountStore(":memory:");
  try {
    const player = store.create("RunPlayer").account;
    const old = store.startSurvivalRun(player.id, "solo", 1000);
    const other = store.startSurvivalRun(player.id, "practice", 1000);
    const current = store.startSurvivalRun(player.id, "solo", 2000);
    assert.throws(
      () => store.finishSurvivalRun(player.id, old, 3000),
      /not found/,
    );
    assert.equal(
      store.finishSurvivalRun(player.id, current, 3000).survivalTimeMs,
      1000,
    );
    assert.equal(
      store.finishSurvivalRun(player.id, other, 3000).survivalTimeMs,
      2000,
    );
  } finally {
    store.close();
  }
});

// Node fetch controls Host itself; use raw HTTP for proxy-preserved hosts.
function httpFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(url, options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("error", reject);
      res.on("end", () =>
        resolve(
          new Response(Buffer.concat(chunks), {
            status: res.statusCode,
            headers: Object.fromEntries(
              Object.entries(res.headers)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => [
                  key,
                  Array.isArray(value) ? value.join(", ") : value!,
                ]),
            ),
          }),
        ),
      );
    });
    req.on("error", reject);
    req.end(options.body);
  });
}

test("rate counters reset after expiry and fail closed at the memory cap", () => {
  const limits = new RequestLimits();
  assert.equal(limits.allow("player", 2, 0), true);
  assert.equal(limits.allow("player", 2, 1), true);
  assert.equal(limits.allow("player", 2, 2), false);
  for (let i = 0; i < 9999; i++)
    assert.equal(limits.allow(`ip${i}`, 1, 0), true);
  assert.equal(limits.allow("overflow", 1, 0), false);
  assert.equal(limits.allow("overflow", 1, 60000), true);
});

test("forwarded client IPs are trusted only with explicit loopback proxy opt-in", () => {
  const previous = process.env.TRUST_PROXY;
  const request = (peer: string, forwarded: string) =>
    ({
      socket: { remoteAddress: peer },
      headers: { "x-forwarded-for": forwarded },
    }) as unknown as IncomingMessage;
  try {
    delete process.env.TRUST_PROXY;
    assert.equal(
      clientAddress(request("127.0.0.1", "198.51.100.1")),
      "127.0.0.1",
    );
    process.env.TRUST_PROXY = "loopback";
    assert.equal(
      clientAddress(request("127.0.0.1", "spoofed, 198.51.100.1")),
      "198.51.100.1",
    );
    assert.equal(
      clientAddress(request("198.51.100.2", "198.51.100.1")),
      "198.51.100.2",
    );
    assert.equal(clientAddress(request("127.0.0.1", "invalid")), "127.0.0.1");
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  }
});

test(
  "production rejects foreign origins, malformed bodies and escaped files, sets secure cookies and headers",
  { timeout: 20000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "sponge-security-"));
    mkdirSync(join(directory, "dist"));
    writeFileSync(
      join(directory, "dist/index.html"),
      "<!doctype html><title>Game</title>",
    );
    writeFileSync(join(directory, "secret.txt"), "private");
    symlinkSync(
      join(directory, "secret.txt"),
      join(directory, "dist/leak.txt"),
    );
    const origin = "https://game.example.org";
    const child = spawn(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        new URL("../server/index.ts", import.meta.url).pathname,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          NODE_ENV: "production",
          PUBLIC_ORIGIN: origin,
          HOST: "127.0.0.1",
          PORT: "0",
          DATABASE_PATH: ":memory:",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let diagnostics = "";
    child.stderr.on("data", (data) => (diagnostics += data));
    try {
      const port = await new Promise<string>((resolve, reject) => {
        child.stdout.on("data", (data) => {
          const match = String(data).match(/ready on port (\d+)/);
          if (match) resolve(match[1]);
        });
        child.once("exit", () =>
          reject(new Error(diagnostics || "Server exited before readiness")),
        );
        child.once("error", reject);
      });
      const base = `http://127.0.0.1:${port}`;
      const headers = { Host: "game.example.org" };
      const post = (body: string, extra = {}) =>
        httpFetch(base + "/api/account", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            Origin: origin,
            ...extra,
          },
          body,
        });
      const page = await httpFetch(base, { headers });
      assert.equal(page.status, 200);
      assert.match(
        page.headers.get("content-security-policy")!,
        /frame-ancestors 'none'/,
      );
      assert.equal(page.headers.get("x-frame-options"), "DENY");
      assert.ok(page.headers.get("strict-transport-security"));
      assert.equal(
        (await httpFetch(base, { headers: { Host: "evil.example" } })).status,
        421,
      );
      assert.equal(
        (
          await post('{"username":"Blocked"}', {
            Origin: "https://evil.example",
          })
        ).status,
        403,
      );
      assert.equal(
        (await post('{"username":"NoOrigin"}', { Origin: "" })).status,
        403,
      );
      assert.equal((await post("null")).status, 400);
      assert.equal((await post("{invalid")).status, 400);
      assert.equal(
        (
          await post(
            JSON.stringify({ username: "Wide", padding: "🧽".repeat(1100) }),
          )
        ).status,
        413,
      );
      assert.equal(
        (await httpFetch(base + "/leak.txt", { headers })).status,
        403,
      );
      assert.equal(
        (
          await httpFetch(base + "/__level-builder/library", {
            method: "POST",
            headers,
          })
        ).status,
        405,
      );
      const account = await post('{"username":"PublicPlayer"}');
      assert.equal(account.status, 201);
      assert.match(
        account.headers.get("set-cookie")!,
        /HttpOnly; SameSite=Lax;.*Secure/,
      );
      assert.equal(
        (await httpFetch(base + "/api/account", { headers })).status,
        200,
      );
    } finally {
      if (child.exitCode === null) {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
