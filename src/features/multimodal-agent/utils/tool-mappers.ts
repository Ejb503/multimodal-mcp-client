import { SchemaType } from "@google/generative-ai";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";

// Protected keywords that need to be prefixed with "safe_"
const PROTECTED_KEYWORDS = ["token", "from"];

const safePropertyName = (name: string): string => {
  if (PROTECTED_KEYWORDS.includes(name)) {
    return `safe_${name}`;
  }
  return name;
};

type GeminiPropertyType = {
  type: SchemaType;
  items?: { type: SchemaType };
  properties?: Record<string, GeminiPropertyType & { description: string }>;
};

export const sanitizeFunctionName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
};

const handleSchemaItems = (
  items: JSONSchema7Definition | JSONSchema7Definition[] | undefined
): GeminiPropertyType => {
  if (!items) {
    return { type: SchemaType.STRING };
  }

  if (Array.isArray(items)) {
    return handleSchemaItems(items[0]);
  }

  if (typeof items === "boolean") {
    return { type: SchemaType.BOOLEAN };
  }

  // Handle objects with no type or properties
  if (typeof items === "object") {
    if (!items.type || (items.type === "object" && !items.properties)) {
      return {
        type: SchemaType.OBJECT,
        properties: {
          _data: {
            type: SchemaType.STRING,
            description: "Generic data field for object",
          },
        },
      };
    }
  }

  return mapPropertyType(items);
};

const getFirstValidOption = (
  options: JSONSchema7Definition[] | undefined
): JSONSchema7Definition | undefined => {
  if (!options?.length) return undefined;
  const firstOption = options[0];
  return firstOption;
};

const getSchemaType = (schema: JSONSchema7): string => {
  if (!schema.type) return "string";
  return Array.isArray(schema.type) ? schema.type[0] : schema.type;
};

const isJSONSchema = (value: JSONSchema7Definition): value is JSONSchema7 => {
  return typeof value === "object" && value !== null;
};

export const mapPropertyType = (
  schema: JSONSchema7 | JSONSchema7Definition
): GeminiPropertyType => {
  if (typeof schema === "boolean") {
    return { type: SchemaType.BOOLEAN };
  }

  if (!schema || typeof schema !== "object") {
    return { type: SchemaType.STRING };
  }

  const firstOneOfOption = getFirstValidOption(schema.oneOf);
  const firstAnyOfOption = getFirstValidOption(schema.anyOf);
  if (firstOneOfOption) {
    return mapPropertyType(firstOneOfOption);
  }
  if (firstAnyOfOption) {
    return mapPropertyType(firstAnyOfOption);
  }

  const schemaType = getSchemaType(schema);
  const properties: Record<
    string,
    GeminiPropertyType & { description: string }
  > = {};

  switch (schemaType) {
    case "boolean":
      return { type: SchemaType.BOOLEAN };
    case "number":
    case "integer":
      return { type: SchemaType.NUMBER };
    case "array":
      return {
        type: SchemaType.ARRAY,
        items: handleSchemaItems(schema.items),
      };
    case "object":
      if (!schema.properties) {
        return {
          type: SchemaType.OBJECT,
          properties: {
            _data: {
              type: SchemaType.STRING,
              description: "Generic data field for object",
            },
          },
        };
      }

      for (const [key, value] of Object.entries(schema.properties)) {
        if (isJSONSchema(value)) {
          // Special handling for auth properties to flatten the structure
          if (key === "auth" && value.properties) {
            const authProperties: Record<
              string,
              GeminiPropertyType & { description: string }
            > = {};
            const authProps = value.properties;
            for (const [authKey, authValue] of Object.entries(authProps)) {
              if (isJSONSchema(authValue)) {
                if (authKey === "token" && authValue.properties) {
                  // Flatten token properties
                  for (const [tokenKey, tokenValue] of Object.entries(
                    authValue.properties
                  )) {
                    if (isJSONSchema(tokenValue)) {
                      authProperties[safePropertyName(tokenKey)] = {
                        type: SchemaType.STRING,
                        description: tokenValue.description || "",
                      };
                    }
                  }
                } else if (!["basic", "cookie"].includes(authKey)) {
                  authProperties[safePropertyName(authKey)] = {
                    type: SchemaType.STRING,
                    description: authValue.description || "",
                  };
                }
              }
            }
            properties[key] = {
              type: SchemaType.OBJECT,
              properties: authProperties,
              description: value.description || "",
            };
          } else {
            const propertyType = mapPropertyType(value);
            properties[safePropertyName(key)] = {
              ...propertyType,
              description: value.description || "",
            };
          }
        }
      }

      return {
        type: SchemaType.OBJECT,
        properties,
      };
    default:
      return { type: SchemaType.STRING };
  }
};

const getRequiredFields = (schema: JSONSchema7): string[] => {
  if (schema.required && Array.isArray(schema.required)) {
    return schema.required;
  }

  if (schema.oneOf?.[0] && typeof schema.oneOf[0] === "object") {
    const firstOption = schema.oneOf[0] as JSONSchema7;
    if (firstOption.required && Array.isArray(firstOption.required)) {
      return firstOption.required;
    }
  }

  if (schema.anyOf?.[0] && typeof schema.anyOf[0] === "object") {
    const firstOption = schema.anyOf[0] as JSONSchema7;
    if (firstOption.required && Array.isArray(firstOption.required)) {
      return firstOption.required;
    }
  }

  return [];
};

export const createDefaultToolParameters = (tool: Tool) => ({
  name: sanitizeFunctionName(tool.name),
  description: tool.description || undefined,
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
});

export const mapToolProperties = (tool: Tool) => {
  if (
    !tool.inputSchema ||
    (!tool.inputSchema.properties &&
      !tool.inputSchema.oneOf &&
      !tool.inputSchema.anyOf)
  ) {
    return createDefaultToolParameters(tool);
  }

  const mappedSchema = mapPropertyType(tool.inputSchema as JSONSchema7);
  const properties = mappedSchema.properties || {};
  const required = getRequiredFields(tool.inputSchema as JSONSchema7);

  return {
    name: sanitizeFunctionName(tool.name),
    description: tool.description || undefined,
    parameters: {
      type: SchemaType.OBJECT,
      properties,
      required,
    },
  };
};

export const mapToolsToGeminiFormat = (tools: Tool[]) => {
  return tools.map(mapToolProperties);
};
