import type { IncomingMessage, ServerResponse } from "node:http";
import { isIP } from "node:net";

export const production = process.env.NODE_ENV === "production";
export const publicOrigin = process.env.PUBLIC_ORIGIN;
export function validateProductionConfig(): void {
  if (
    production &&
    (!publicOrigin ||
      new URL(publicOrigin).origin !== publicOrigin ||
      !publicOrigin.startsWith("https://"))
  )
    throw new Error(
      "Production requires PUBLIC_ORIGIN, an HTTPS origin without a trailing slash.",
    );
}

export function clientAddress(req: IncomingMessage): string {
  const peer = req.socket.remoteAddress ?? "unknown";
  // Trust one proxy only, explicitly enabled and connected over loopback.
  if (
    process.env.TRUST_PROXY === "loopback" &&
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer)
  ) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      const address = forwarded.split(",").at(-1)!.trim();
      if (isIP(address)) return address;
    }
  }
  return peer;
}

export function securityHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  if (production)
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
}

/** Fixed windows with an explicit memory cap; fail closed when saturated. */
export class RequestLimits {
  private entries = new Map<string, { expires: number; count: number }>();
  allow(key: string, maximum: number, now = Date.now()): boolean {
    let entry = this.entries.get(key);
    if (!entry || entry.expires <= now) {
      if (this.entries.size >= 10000) {
        for (const [id, value] of this.entries)
          if (value.expires <= now) this.entries.delete(id);
        if (!entry && this.entries.size >= 10000) return false;
      }
      entry = { expires: now + 60000, count: 0 };
      this.entries.set(key, entry);
    }
    return ++entry.count <= maximum;
  }
}
