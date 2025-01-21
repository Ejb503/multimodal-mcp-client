import { describe, it, expect } from "vitest";
import { mapEnvironmentVariables } from "../../transports/index.js";

describe("mapEnvironmentVariables", () => {
  const mockBaseEnv = {
    SYSTEMPROMPT_API_KEY: "test-api-key",
    NOTION_API_KEY: "test-notion-key",
    OTHER_VAR: "other-value",
  };

  it("should map array-style environment variables", () => {
    const envConfig = {
      "0": "SYSTEMPROMPT_API_KEY",
      "1": "NOTION_API_KEY",
    };

    const result = mapEnvironmentVariables(envConfig, mockBaseEnv);

    expect(result.SYSTEMPROMPT_API_KEY).toBe("test-api-key");
    expect(result.NOTION_API_KEY).toBe("test-notion-key");
    expect(result.OTHER_VAR).toBe("other-value");
  });

  it("should handle direct key-value pairs", () => {
    const envConfig = {
      DIRECT_KEY: "direct-value",
      "0": "SYSTEMPROMPT_API_KEY",
    };

    const result = mapEnvironmentVariables(envConfig, mockBaseEnv);

    expect(result.DIRECT_KEY).toBe("direct-value");
    expect(result.SYSTEMPROMPT_API_KEY).toBe("test-api-key");
    expect(result.OTHER_VAR).toBe("other-value");
  });

  it("should handle empty environment config", () => {
    const result = mapEnvironmentVariables({}, mockBaseEnv);
    expect(result).toEqual(mockBaseEnv);
  });

  it("should handle undefined environment config", () => {
    const result = mapEnvironmentVariables(undefined, mockBaseEnv);
    expect(result).toEqual(mockBaseEnv);
  });

  it("should handle missing environment variables", () => {
    const envConfig = {
      "0": "MISSING_VAR",
      "1": "SYSTEMPROMPT_API_KEY",
    };

    const result = mapEnvironmentVariables(envConfig, mockBaseEnv);

    expect(result.MISSING_VAR).toBeUndefined();
    expect(result.SYSTEMPROMPT_API_KEY).toBe("test-api-key");
    expect(result.OTHER_VAR).toBe("other-value");
  });

  it("should handle non-string values", () => {
    const envConfig = {
      "0": "SYSTEMPROMPT_API_KEY",
      INVALID: 123,
      ALSO_INVALID: { key: "value" },
    } as Record<string, unknown>;

    const result = mapEnvironmentVariables(envConfig, mockBaseEnv);

    expect(result.SYSTEMPROMPT_API_KEY).toBe("test-api-key");
    expect(result.INVALID).toBeUndefined();
    expect(result.ALSO_INVALID).toBeUndefined();
    expect(result.OTHER_VAR).toBe("other-value");
  });

  it("should handle process.env as default base environment", () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, TEST_VAR: "test-value" };

    const envConfig = {
      "0": "TEST_VAR",
    };

    const result = mapEnvironmentVariables(envConfig);
    expect(result.TEST_VAR).toBe("test-value");

    process.env = originalEnv;
  });
});
