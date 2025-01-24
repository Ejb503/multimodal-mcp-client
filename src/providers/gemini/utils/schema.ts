import { SchemaType } from "@google/generative-ai";

/**
 * Converts a standard JSON schema type to Gemini's SchemaType enum
 */
function convertType(type: string): SchemaType {
  switch (type) {
    case "string":
      return SchemaType.STRING;
    case "number":
      return SchemaType.NUMBER;
    case "boolean":
      return SchemaType.BOOLEAN;
    case "array":
      return SchemaType.ARRAY;
    case "object":
      return SchemaType.OBJECT;
    default:
      return SchemaType.STRING;
  }
}

/**
 * Validates that a schema object has all required fields
 * @throws {Error} If schema validation fails
 */
function validateSchema(
  schema: Record<string, unknown>,
  path: string = ""
): void {
  if (!schema.type) {
    throw new Error(
      `Type must be specified for schema at path: ${path || "root"}`
    );
  }

  if (schema.type === "object" && schema.properties) {
    const properties = schema.properties as Record<string, unknown>;
    Object.entries(properties).forEach(([key, value]) => {
      validateSchema(
        value as Record<string, unknown>,
        path ? `${path}.${key}` : key
      );
    });
  }

  if (schema.type === "array" && schema.items) {
    validateSchema(schema.items as Record<string, unknown>, `${path}[items]`);
  }
}

function processSchema(s: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // First clean up unsupported keywords to prevent recursion
  const cleanSchema = { ...s };
  delete cleanSchema.additionalProperties;
  delete cleanSchema.definitions;

  // Handle allOf by flattening all schemas into one
  if (cleanSchema.allOf) {
    const schemas = cleanSchema.allOf as Record<string, unknown>[];
    const mergedSchema = schemas.reduce((acc, schema) => {
      const processed = processSchema(schema);
      return {
        ...acc,
        ...processed,
        properties: {
          ...(acc.properties || {}),
          ...(processed.properties || {}),
        },
        required: [
          ...(Array.isArray(acc.required) ? acc.required : []),
          ...(Array.isArray(processed.required) ? processed.required : []),
        ],
      };
    }, {});

    // Continue processing the rest of the schema with merged results
    cleanSchema.properties = {
      ...(cleanSchema.properties || {}),
      ...(mergedSchema.properties || {}),
    };
    cleanSchema.required = [
      ...(Array.isArray(cleanSchema.required) ? cleanSchema.required : []),
      ...(Array.isArray(mergedSchema.required) ? mergedSchema.required : []),
    ];
    delete cleanSchema.allOf;
  }

  // Handle oneOf by expanding into a single schema with all possible properties
  if (cleanSchema.oneOf) {
    const schemas = cleanSchema.oneOf as Record<string, unknown>[];
    const mergedSchema = schemas.reduce((acc, schema) => {
      const processed = processSchema(schema);
      return {
        ...acc,
        ...processed,
        properties: {
          ...(acc.properties || {}),
          ...(processed.properties || {}),
        },
      };
    }, {});

    // Continue processing the rest of the schema with merged results
    cleanSchema.properties = {
      ...(cleanSchema.properties || {}),
      ...(mergedSchema.properties || {}),
    };
    delete cleanSchema.oneOf;
  }

  // Handle if/then by merging them into a single schema
  if (cleanSchema.if && cleanSchema.then) {
    const ifSchema = cleanSchema.if as Record<string, unknown>;
    const thenSchema = cleanSchema.then as Record<string, unknown>;

    // Extract the condition property and its required value
    const conditionProp = Object.keys(ifSchema.properties || {})[0];
    const properties = ifSchema.properties as Record<
      string,
      { const?: unknown; type?: string }
    >;
    const conditionValue = properties?.[conditionProp]?.const;

    if (conditionProp && conditionValue) {
      // Create an enum for the condition property
      cleanSchema.properties = {
        ...(cleanSchema.properties || {}),
        [conditionProp]: {
          type: "string",
          enum: [conditionValue],
          description: `Must be '${conditionValue}'`,
        },
        ...((thenSchema.properties || {}) as Record<string, unknown>),
      };
      cleanSchema.required = [
        ...(Array.isArray(cleanSchema.required) ? cleanSchema.required : []),
        conditionProp,
      ];
    }
    delete cleanSchema.if;
    delete cleanSchema.then;
  }

  // Ensure type is always set
  result.type = cleanSchema.type
    ? convertType(cleanSchema.type as string)
    : SchemaType.STRING;

  if (cleanSchema.description) {
    result.description = cleanSchema.description;
  }

  if (
    cleanSchema.properties &&
    (cleanSchema.type === "object" || !cleanSchema.type)
  ) {
    result.type = SchemaType.OBJECT;
    result.properties = Object.entries(
      cleanSchema.properties as Record<string, unknown>
    ).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: processSchema(value as Record<string, unknown>),
      }),
      {}
    );

    // Ensure properties is never empty for OBJECT type
    if (
      Object.keys(result.properties as Record<string, unknown>).length === 0
    ) {
      delete result.properties;
      result.type = SchemaType.STRING;
    }
  }

  if (
    cleanSchema.items &&
    (cleanSchema.type === "array" || !cleanSchema.type)
  ) {
    result.type = SchemaType.ARRAY;
    result.items = processSchema(cleanSchema.items as Record<string, unknown>);
  }

  if (cleanSchema.required) {
    // Remove duplicates from required array
    result.required = [...new Set(cleanSchema.required as string[])];
  }

  // Convert const to enum with single value
  if (cleanSchema.const !== undefined) {
    result.enum = [cleanSchema.const];
  } else if (cleanSchema.enum) {
    result.enum = cleanSchema.enum;
  }

  return result;
}

/**
 * Converts a standard JSON schema to Gemini's schema format
 * @throws {Error} If schema validation fails
 */
export function convertToGeminiSchema(
  schema: Record<string, unknown>
): Record<string, unknown> {
  const processedSchema = processSchema(schema);
  validateSchema(processedSchema);
  return processedSchema;
}
