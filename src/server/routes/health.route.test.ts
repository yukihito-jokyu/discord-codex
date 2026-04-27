import { describe, expect, it } from "vitest";
import {
  buildHealthResponse,
  checkHealth,
  health,
} from "@/server/routes/health.route";

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("checkHealth", () => {
  it("returns server as healthy", () => {
    expect(checkHealth()).toEqual({ server: true });
  });
});

describe("buildHealthResponse", () => {
  it("returns ok status when all services are healthy", () => {
    const { body, status } = buildHealthResponse({ server: true });

    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services).toEqual({ server: true });
    expect(body.timestamp).toMatch(ISO_8601);
  });

  it("returns ok status when services is empty", () => {
    const { body, status } = buildHealthResponse({});

    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services).toEqual({});
  });

  it("returns degraded status when a service is unhealthy", () => {
    const { body, status } = buildHealthResponse({
      server: true,
      redis: false,
    });

    expect(status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.services).toEqual({ server: true, redis: false });
  });

  it("returns degraded status when all services are false", () => {
    const { body, status } = buildHealthResponse({ server: false });

    expect(status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.services).toEqual({ server: false });
  });
});

describe("health route", () => {
  it("returns 200 with healthy response", async () => {
    const res = await health.request("/");

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.services).toEqual({ server: true });
  });

  it("includes all required fields in response", async () => {
    const res = await health.request("/");
    const body = await res.json();

    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("services");
    expect(body).toHaveProperty("timestamp");
  });
});
