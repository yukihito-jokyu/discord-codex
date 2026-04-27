import { describe, expect, it } from "vitest";
import {
  HTTP_BAD_GATEWAY,
  HTTP_BAD_REQUEST,
  HTTP_FORBIDDEN,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  HTTP_OK,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_UNAUTHORIZED,
} from "@/shared/utils/http-status";

describe("http-status", () => {
  it("HTTP_OK is 200", () => {
    expect(HTTP_OK).toBe(200);
  });

  it("HTTP_BAD_REQUEST is 400", () => {
    expect(HTTP_BAD_REQUEST).toBe(400);
  });

  it("HTTP_UNAUTHORIZED is 401", () => {
    expect(HTTP_UNAUTHORIZED).toBe(401);
  });

  it("HTTP_FORBIDDEN is 403", () => {
    expect(HTTP_FORBIDDEN).toBe(403);
  });

  it("HTTP_NOT_FOUND is 404", () => {
    expect(HTTP_NOT_FOUND).toBe(404);
  });

  it("HTTP_INTERNAL_SERVER_ERROR is 500", () => {
    expect(HTTP_INTERNAL_SERVER_ERROR).toBe(500);
  });

  it("HTTP_BAD_GATEWAY is 502", () => {
    expect(HTTP_BAD_GATEWAY).toBe(502);
  });

  it("HTTP_SERVICE_UNAVAILABLE is 503", () => {
    expect(HTTP_SERVICE_UNAVAILABLE).toBe(503);
  });
});
