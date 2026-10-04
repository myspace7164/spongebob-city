import type { IncomingMessage, ServerResponse } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createGzip, constants, type Gzip } from "node:zlib";
import { AccountStore } from "./store.ts";
import { Rooms } from "./rooms.ts";
import { onlineConfig } from "../config/online.ts";
import type { OnlineCommand } from "../src/interfaces.ts";
import {
  clientAddress,
  production,
  publicOrigin,
  RequestLimits,
} from "./security.ts";
export function createOnlineServer(
  database = process.env.DATABASE_PATH ?? "data/accounts.sqlite",
) {
  if (database !== ":memory:")
    mkdirSync(dirname(database), { recursive: true, mode: 0o700 });
  const store = new AccountStore(database),
    rooms = new Rooms(store);
  const streams = new Map<ServerResponse, string>();
  const compressedStreams = new Map<ServerResponse, Gzip>();
  const limits = new RequestLimits();
  const timer = setInterval(() => {
    rooms.tick(0.1);
    // Serialize each room once, rather than cloning all 64 players for every viewer.
    const messages = new Map<string, string>();
    for (const [res, id] of streams) {
      const writer = compressedStreams.get(res) ?? res;
      if (res.writableLength + writer.writableLength > 256000) {
        res.destroy();
        streams.delete(res);
        continue;
      }
      const code = rooms.room(id)?.code ?? "";
      let message = messages.get(code);
      if (message === undefined) {
        message = `data: ${JSON.stringify(rooms.current(id))}\n\n`;
        messages.set(code, message);
      }
      writer.write(message);
    }
  }, 100);
  timer.unref();
  const json = (res: ServerResponse, status: number, data: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  async function handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (!path.startsWith("/api/")) return false;
    try {
      const address = clientAddress(req);
      if (
        !limits.allow("global", 240000) ||
        !limits.allow(`ip:${address}`, 180000)
      ) {
        res.setHeader("Retry-After", "60");
        json(res, 429, { error: "Too many requests. Wait a minute." });
        return true;
      }
      if (req.headers["sec-fetch-site"] === "cross-site") {
        json(res, 403, { error: "Use the game on this host." });
        return true;
      }
      const token = req.headers.cookie
        ?.split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("sponge_session="))
        ?.slice(15);
      const account = store.account(token);
      if (
        !limits.allow(
          account ? `account:${account.id}` : `anonymous:${address}`,
          account ? 2400 : 1200,
        )
      ) {
        res.setHeader("Retry-After", "60");
        json(res, 429, { error: "Too many requests. Wait a minute." });
        return true;
      }
      if (req.method === "GET") {
        if (path === "/api/account") {
          json(res, 200, { account });
          return true;
        }
        if (path === "/api/leaderboard") {
          json(res, 200, { entries: store.leaderboard() });
          return true;
        }
        if (path === "/api/runs/latest" && account) {
          json(res, 200, store.latestSurvivalRun(account.id));
          return true;
        }
        if (!account) {
          json(res, 401, { error: "Create a username to play online." });
          return true;
        }
        if (path === "/api/room") {
          rooms.touch(account.id);
          json(res, 200, { room: rooms.current(account.id) });
          return true;
        }
        if (path === "/api/events") {
          if (
            streams.size >= 256 &&
            ![...streams.values()].includes(account.id)
          ) {
            json(res, 503, {
              error: "All connections are busy. Try again shortly.",
            });
            return true;
          }
          // Replace an older stream for this account (one browser identity, one player).
          for (const [old, id] of streams)
            if (id === account.id) {
              compressedStreams.get(old)?.destroy();
              old.end();
              streams.delete(old);
            }
          const gzip = /\bgzip\b/.test(req.headers["accept-encoding"] ?? "")
            ? createGzip({ flush: constants.Z_SYNC_FLUSH })
            : null;
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            Vary: "Accept-Encoding",
            ...(gzip ? { "Content-Encoding": "gzip" } : {}),
          });
          if (gzip) {
            compressedStreams.set(res, gzip);
            gzip.on("error", () => res.destroy());
            gzip.pipe(res);
          }
          (gzip ?? res).write(
            `data: ${JSON.stringify(rooms.current(account.id))}\n\n`,
          );
          streams.set(res, account.id);
          res.on("close", () => {
            streams.delete(res);
            compressedStreams.delete(res);
            gzip?.destroy();
          });
          return true;
        }
      }
      if (req.method !== "POST") {
        json(res, 404, { error: "Not found." });
        return true;
      }
      const origin = req.headers.origin;
      if (
        (production && origin !== publicOrigin) ||
        (origin && new URL(origin).host !== req.headers.host)
      ) {
        json(res, 403, { error: "Use the game on this host." });
        return true;
      }
      if (!req.headers["content-type"]?.startsWith("application/json")) {
        json(res, 415, { error: "JSON required." });
        return true;
      }
      const key =
        path === "/api/account"
          ? `registration:${address}`
          : `${path === "/api/command" ? "command" : "post"}:${account?.id ?? address}`;
      if (
        (path === "/api/account" &&
          !limits.allow("registrations:global", 256)) ||
        !limits.allow(
          key,
          path === "/api/account" || !account
            ? onlineConfig.registrationsPerMinute
            : path === "/api/command"
              ? 1800
              : 120,
        )
      ) {
        res.setHeader("Retry-After", "60");
        json(res, 429, { error: "Too many requests. Wait a minute." });
        return true;
      }
      let data = "";
      let bytes = 0;
      for await (const chunk of req) {
        bytes += Buffer.byteLength(chunk);
        data += chunk;
        if (bytes > 4096) {
          res.setHeader("Connection", "close");
          json(res, 413, { error: "Request too large." });
          return true;
        }
      }
      const body = JSON.parse(data || "{}");
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("JSON object required.");
      if (path === "/api/account") {
        if (account) {
          json(res, 409, { error: "This browser already has an account." });
          return true;
        }
        const created = store.create(body.username);
        res.setHeader(
          "Set-Cookie",
          `sponge_session=${created.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
        json(res, 201, { account: created.account });
        return true;
      }
      if (!account) {
        json(res, 401, { error: "Create a username to play online." });
        return true;
      }
      if (path === "/api/runs/start") {
        const mode = body.mode;
        if (mode !== "solo" && mode !== "practice")
          throw new Error("Choose a valid survival run mode.");
        json(res, 201, {
          runId: store.startSurvivalRun(account.id, mode),
        });
      } else if (path === "/api/runs/pause") {
        if (typeof body.runId !== "string")
          throw new Error("Survival run ID required.");
        store.pauseSurvivalRun(account.id, body.runId);
        json(res, 200, { ok: true });
      } else if (path === "/api/runs/resume") {
        if (typeof body.runId !== "string")
          throw new Error("Survival run ID required.");
        store.resumeSurvivalRun(account.id, body.runId);
        json(res, 200, { ok: true });
      } else if (path === "/api/runs/finish") {
        if (typeof body.runId !== "string")
          throw new Error("Survival run ID required.");
        json(res, 200, store.finishSurvivalRun(account.id, body.runId));
      } else if (path === "/api/rooms")
        json(res, 201, { room: rooms.create(account) });
      else if (path === "/api/join") {
        if (
          typeof body.code !== "string" ||
          !/^[A-Fa-f0-9]{6}$/.test(body.code.trim())
        )
          throw new Error("Enter the six-character room code.");
        json(res, 200, { room: rooms.join(account, body.code.trim()) });
      } else if (path === "/api/leave") {
        rooms.leave(account.id);
        json(res, 200, { room: null });
      } else if (path === "/api/command") {
        rooms.command(account.id, body as OnlineCommand);
        json(res, 200, { ok: true });
      } else json(res, 404, { error: "Not found." });
    } catch (error) {
      json(res, 400, {
        error:
          error instanceof Error &&
          !(error instanceof TypeError) &&
          !(error instanceof SyntaxError) &&
          !("code" in error)
            ? error.message
            : "Invalid request.",
      });
    }
    return true;
  }
  return {
    handle,
    rooms,
    store,
    close() {
      clearInterval(timer);
      for (const res of streams.keys()) {
        compressedStreams.get(res)?.destroy();
        res.end();
      }
      store.close();
    },
  };
}
