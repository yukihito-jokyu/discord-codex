import { describe, expect, it } from "vitest";
import {
  AppError,
  ExternalServiceError,
  NotFoundError,
  ValidationError,
} from "@/shared/types/errors";
import {
  HTTP_BAD_GATEWAY,
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
} from "@/shared/utils/http-status";

describe("AppError", () => {
  it("sets message, code, statusCode, and name", () => {
    const error = new AppError("test error", "TEST_CODE", 418);
    expect(error.message).toBe("test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.statusCode).toBe(418);
    expect(error.name).toBe("AppError");
  });

  it("defaults statusCode to HTTP_INTERNAL_SERVER_ERROR", () => {
    const error = new AppError("test error", "TEST_CODE");
    expect(error.statusCode).toBe(HTTP_INTERNAL_SERVER_ERROR);
  });

  it("inherits from Error", () => {
    const error = new AppError("test error", "TEST_CODE");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ValidationError", () => {
  it("sets code to VALIDATION_ERROR and statusCode to HTTP_BAD_REQUEST", () => {
    const error = new ValidationError("invalid input");
    expect(error.message).toBe("invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(HTTP_BAD_REQUEST);
    expect(error.name).toBe("ValidationError");
  });

  it("inherits from AppError", () => {
    const error = new ValidationError("invalid input");
    expect(error).toBeInstanceOf(AppError);
  });

  it("inherits from Error", () => {
    const error = new ValidationError("invalid input");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("NotFoundError", () => {
  // biome-ignore lint/suspicious/noTemplateCurlyInString: test description, not a template literal
  it('formats message as "${resource} not found" with code NOT_FOUND', () => {
    const error = new NotFoundError("User");
    expect(error.message).toBe("User not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.statusCode).toBe(HTTP_NOT_FOUND);
    expect(error.name).toBe("NotFoundError");
  });

  it("inherits from AppError", () => {
    const error = new NotFoundError("User");
    expect(error).toBeInstanceOf(AppError);
  });

  it("inherits from Error", () => {
    const error = new NotFoundError("User");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ExternalServiceError", () => {
  // biome-ignore lint/suspicious/noTemplateCurlyInString: test description, not a template literal
  it('formats message as "${service}: ${message}" with code EXTERNAL_SERVICE_ERROR', () => {
    const error = new ExternalServiceError("OpenAI", "rate limit exceeded");
    expect(error.message).toBe("OpenAI: rate limit exceeded");
    expect(error.code).toBe("EXTERNAL_SERVICE_ERROR");
    expect(error.statusCode).toBe(HTTP_BAD_GATEWAY);
    expect(error.name).toBe("ExternalServiceError");
  });

  it("inherits from AppError", () => {
    const error = new ExternalServiceError("OpenAI", "timeout");
    expect(error).toBeInstanceOf(AppError);
  });

  it("inherits from Error", () => {
    const error = new ExternalServiceError("OpenAI", "timeout");
    expect(error).toBeInstanceOf(Error);
  });
});
