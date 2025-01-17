/// <reference types="jest" />
import { convertToGeminiSchema } from "../schema";
import { SchemaType } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";

type SchemaProperties = Record<
  string,
  {
    type: SchemaType;
    properties?: Record<string, Schema>;
    items?: Schema;
    enum?: unknown[];
    const?: unknown;
  }
>;

describe("convertToGeminiSchema", () => {
  it("should handle oneOf fields by taking the first option", () => {
    const testSchema = {
      type: "object",
      required: ["parent", "properties"],
      properties: {
        parent: {
          type: "object",
          oneOf: [
            {
              type: "object",
              properties: {
                database_id: {
                  type: "string",
                  description: "The ID of the database",
                },
              },
              required: ["database_id"],
            },
          ],
        },
        properties: {
          type: "object",
          properties: {
            title: {
              type: "string",
            },
          },
        },
      },
    };

    const result = convertToGeminiSchema(testSchema);
    expect(result.type).toBe(SchemaType.OBJECT);
    expect(result.properties).toBeDefined();
    const props = result.properties as SchemaProperties;
    expect(props.parent.properties?.database_id.type).toBe(SchemaType.STRING);
  });

  it("should convert const fields to enum with single value", () => {
    const testSchema = {
      type: "object",
      properties: {
        object: {
          type: "string",
          const: "block",
        },
      },
    };

    const result = convertToGeminiSchema(testSchema);
    expect(result.type).toBe(SchemaType.OBJECT);
    const props = result.properties as SchemaProperties;
    expect(props.object.enum).toEqual(["block"]);
    expect(props.object.const).toBeUndefined();
  });

  it("should handle nested arrays and objects", () => {
    const testSchema = {
      type: "object",
      properties: {
        children: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
              },
            },
          },
        },
      },
    };

    const result = convertToGeminiSchema(testSchema);
    expect(result.type).toBe(SchemaType.OBJECT);
    const props = result.properties as SchemaProperties;
    expect(props.children.type).toBe(SchemaType.ARRAY);
    expect(props.children.items?.type).toBe(SchemaType.OBJECT);
    expect(props.children.items?.properties?.text.type).toBe(SchemaType.STRING);
  });

  it("should handle empty object properties by converting to string type", () => {
    const testSchema = {
      type: "object",
      properties: {
        emptyObj: {
          type: "object",
          properties: {},
        },
      },
    };

    const result = convertToGeminiSchema(testSchema);
    expect(result.type).toBe(SchemaType.OBJECT);
    const props = result.properties as SchemaProperties;
    expect(props.emptyObj.type).toBe(SchemaType.STRING);
    expect(props.emptyObj.properties).toBeUndefined();
  });
});
