import { describe, expect, it } from "vitest";
import { AppError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";

describe("ok", () => {
  it("returns a success Result with value", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("works with string values", () => {
    const result = ok("hello");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("hello");
    }
  });

  it("works with null value", () => {
    const result = ok(null);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it("works with object values", () => {
    const obj = { name: "test", count: 5 };
    const result = ok(obj);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: "test", count: 5 });
    }
  });
});

describe("err", () => {
  it("returns a failure Result with error", () => {
    const error = new AppError("something failed", "TEST_ERROR");
    const result = err(error);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("something failed");
      expect(result.error.code).toBe("TEST_ERROR");
    }
  });

  it("works with plain Error", () => {
    const error = new Error("plain error");
    const result = err(error);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("plain error");
    }
  });
});

describe("Result type discrimination", () => {
  it("narrows to value on ok", () => {
    const result: Result<number, AppError> = ok(10);
    if (result.ok) {
      expect(result.value).toBe(10);
    } else {
      expect.unreachable("should be ok");
    }
  });

  it("narrows to error on err", () => {
    const result: Result<number, AppError> = err(new AppError("fail", "ERR"));
    if (!result.ok) {
      expect(result.error.code).toBe("ERR");
    } else {
      expect.unreachable("should be err");
    }
  });
});
