import { OpenAPIV3 } from "openapi-client-axios";

export interface ValidationError {
  path: string[];
  message: string;
}

export function validateSchema(
  schema: OpenAPIV3.SchemaObject,
  data: unknown,
  path: string[] = []
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (
        data === undefined ||
        data === null ||
        !isRecord(data) ||
        !(requiredField in data)
      ) {
        errors.push({
          path: [...path, requiredField],
          message: "This field is required",
        });
      }
    }
  }

  if (schema.oneOf) {
    const validSchemas = schema.oneOf.filter((subSchema) => {
      const subErrors = validateSchema(
        subSchema as OpenAPIV3.SchemaObject,
        data,
        path
      );
      return subErrors.length === 0;
    });

    if (validSchemas.length === 0) {
      errors.push({
        path,
        message: "Data does not match any of the allowed schemas",
      });
    }
  }

  if (schema.properties && isRecord(data)) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const propErrors = validateSchema(
          propSchema as OpenAPIV3.SchemaObject,
          data[key],
          [...path, key]
        );
        errors.push(...propErrors);
      }
    }
  }

  if (schema.enum) {
    if (data !== undefined && !schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Must be one of: ${schema.enum.join(", ")}`,
      });
    }
  }

  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
