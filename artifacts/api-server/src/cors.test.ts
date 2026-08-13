import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";

const ALLOWED_ORIGIN = "https://example.com";

describe("CORS policy", () => {
  beforeEach(() => {
    process.env["FRONTEND_ORIGIN"] = ALLOWED_ORIGIN;
  });

  afterEach(() => {
    delete process.env["FRONTEND_ORIGIN"];
  });

  it("sets Access-Control-Allow-Origin to the configured origin for allowed requests", async () => {
    const { default: app } = await import("./app");
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", ALLOWED_ORIGIN);

    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED_ORIGIN);
  });

  it("does not grant access to a third-party attacker origin", async () => {
    const { default: app } = await import("./app");
    const attackerOrigin = "https://attacker.example.com";
    const res = await request(app)
      .get("/api/healthz")
      .set("Origin", attackerOrigin);

    // The cors package emits the configured allowed origin (not the attacker's
    // origin) so browsers will block the cross-origin read. The critical
    // invariant is that the attacker's origin is never echoed back.
    expect(res.headers["access-control-allow-origin"]).not.toBe(attackerOrigin);
    // And it must not be a wildcard either.
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("server startup fails when FRONTEND_ORIGIN is not set", async () => {
    delete process.env["FRONTEND_ORIGIN"];

    // index.ts validates FRONTEND_ORIGIN synchronously before listen()
    await expect(import("./index")).rejects.toThrow("FRONTEND_ORIGIN");
  });
});
