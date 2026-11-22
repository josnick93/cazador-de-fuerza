// @vitest-environment node
import { describe, expect, it } from "vitest";

import { handleApi, workerEnv } from "./index";

describe("API del Worker", () => {
  it("lee los bindings de donde los deja nitro", () => {
    const request = new Request("https://fuerza.test/api/auth/me");
    expect(workerEnv(request)).toEqual({});
    const env = { GOOGLE_CLIENT_ID: "x" };
    Object.assign(request, { runtime: { cloudflare: { env } } });
    expect(workerEnv(request)).toBe(env);
  });

  it("sin configurar, /api/auth/me dice que no hay login; lo desconocido es 404", async () => {
    const me = await handleApi(new Request("https://fuerza.test/api/auth/me"), {});
    expect(await me.json()).toEqual({ enabled: false, user: null });
    const missing = await handleApi(new Request("https://fuerza.test/api/otra"), {});
    expect(missing.status).toBe(404);
  });
});
