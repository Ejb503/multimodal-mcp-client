import { describe, it, expect } from "vitest";
import { mapToolsToGeminiFormat, mapToolProperties } from "../tool-mappers";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

describe("mapToolProperties", () => {
  it("creates default parameters for empty schema", () => {
    const tool: Tool = {
      name: "test_tool",
      description: "Test tool",
      inputSchema: {
        type: "object",
        properties: {},
      },
    };

    const result = mapToolProperties(tool);
    expect(result).toEqual({
      name: "test_tool",
      description: "Test tool",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    });
  });

  it("creates default parameters for missing schema", () => {
    const tool: Tool = {
      name: "test_tool",
      description: "Test tool",
      inputSchema: {
        type: "object",
        properties: {},
      },
    };

    const result = mapToolProperties(tool);
    expect(result).toEqual({
      name: "test_tool",
      description: "Test tool",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    });
  });

  it("maps tool with schema properties", () => {
    const tool: Tool = {
      name: "test_tool",
      description: "Test tool",
      inputSchema: {
        type: "object",
        properties: {
          field1: { type: "string" },
          field2: { type: "number" },
        },
      },
    };

    const result = mapToolProperties(tool);
    expect(result).toEqual({
      name: "test_tool",
      description: "Test tool",
      parameters: {
        type: "object",
        properties: {
          field1: { type: "string", description: "" },
          field2: { type: "number", description: "" },
        },
        required: [],
      },
    });
  });
});

describe("mapToolsToGeminiFormat", () => {
  it("maps array of tools", () => {
    const tools: Tool[] = [
      {
        name: "tool1",
        description: "Tool 1",
        inputSchema: {
          type: "object",
          properties: {
            field1: { type: "string" },
          },
        },
      },
      {
        name: "tool2",
        description: "Tool 2",
        inputSchema: {
          type: "object",
          properties: {
            field2: { type: "number" },
          },
        },
      },
    ];

    const result = mapToolsToGeminiFormat(tools);
    expect(result).toEqual([
      {
        name: "tool1",
        description: "Tool 1",
        parameters: {
          type: "object",
          properties: {
            field1: { type: "string", description: "" },
          },
          required: [],
        },
      },
      {
        name: "tool2",
        description: "Tool 2",
        parameters: {
          type: "object",
          properties: {
            field2: { type: "number", description: "" },
          },
          required: [],
        },
      },
    ]);
  });
});
