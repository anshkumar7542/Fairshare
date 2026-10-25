import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { env } from "../src/config/env.js";
import { extractToken, setSessionCookie, clearSessionCookie, signSession } from "../src/middleware/auth.js";

describe("Authentication Utilities", () => {
  it("signs a valid JWT session with user id", () => {
    const token = signSession("user_123");
    expect(typeof token).toBe("string");

    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    expect(decoded.sub).toBe("user_123");
  });

  it("extracts token from cookie when present", () => {
    const req = {
      cookies: { fairshare_session: "cookie_jwt_token" },
      headers: {}
    } as unknown as Request;

    expect(extractToken(req)).toBe("cookie_jwt_token");
  });

  it("extracts token from Authorization header when cookie is absent", () => {
    const req = {
      cookies: {},
      headers: { authorization: "Bearer bearer_jwt_token" }
    } as unknown as Request;

    expect(extractToken(req)).toBe("bearer_jwt_token");
  });

  it("prefers cookie over header when both are present or extracts bearer cleanly", () => {
    const reqWithBoth = {
      cookies: { fairshare_session: "primary_cookie" },
      headers: { authorization: "Bearer secondary_bearer" }
    } as unknown as Request;

    expect(extractToken(reqWithBoth)).toBe("primary_cookie");

    const reqHeaderOnly = {
      cookies: undefined,
      headers: { authorization: "Bearer   clean_bearer   " }
    } as unknown as Request;

    expect(extractToken(reqHeaderOnly)).toBe("clean_bearer");
  });

  it("returns null if no cookie or authorization header is provided", () => {
    const req = {
      cookies: {},
      headers: {}
    } as unknown as Request;

    expect(extractToken(req)).toBeNull();
  });

  it("sets session cookie with safe lax sameSite and explicit path", () => {
    let cookieCall: { name: string; val: string; opts: any } | null = null;
    const res = {
      cookie(name: string, val: string, opts: any) {
        cookieCall = { name, val, opts };
      }
    } as unknown as Response;

    setSessionCookie(res, "sample_jwt");
    expect(cookieCall).not.toBeNull();
    expect(cookieCall!.name).toBe("fairshare_session");
    expect(cookieCall!.val).toBe("sample_jwt");
    expect(cookieCall!.opts.httpOnly).toBe(true);
    expect(cookieCall!.opts.sameSite).toBe("lax");
    expect(cookieCall!.opts.path).toBe("/");
  });

  it("clears session cookie with matching options", () => {
    let clearCall: { name: string; opts: any } | null = null;
    const res = {
      clearCookie(name: string, opts: any) {
        clearCall = { name, opts };
      }
    } as unknown as Response;

    clearSessionCookie(res);
    expect(clearCall).not.toBeNull();
    expect(clearCall!.name).toBe("fairshare_session");
    expect(clearCall!.opts.httpOnly).toBe(true);
    expect(clearCall!.opts.sameSite).toBe("lax");
    expect(clearCall!.opts.path).toBe("/");
  });
});

describe("HTTP and CORS Integration", () => {
  it("responds to /api/health with ok: true", async () => {
    const { app } = await import("../src/app.js");
    const supertest = (await import("supertest")).default;
    const res = await supertest(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("handles CORS headers dynamically for Render deployments", async () => {
    const { app } = await import("../src/app.js");
    const supertest = (await import("supertest")).default;
    const res = await supertest(app)
      .options("/api/health")
      .set("Origin", "https://fairshare-custom.onrender.com")
      .set("Access-Control-Request-Method", "GET");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://fairshare-custom.onrender.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("handles CORS headers dynamically for Vercel deployments", async () => {
    const { app } = await import("../src/app.js");
    const supertest = (await import("supertest")).default;
    const res = await supertest(app)
      .options("/api/health")
      .set("Origin", "https://fairshare-web.vercel.app")
      .set("Access-Control-Request-Method", "GET");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://fairshare-web.vercel.app");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("returns 401 when accessing protected route without credentials", async () => {
    const { app } = await import("../src/app.js");
    const supertest = (await import("supertest")).default;
    const res = await supertest(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error?.message).toBe("Authentication required");
  });
});
