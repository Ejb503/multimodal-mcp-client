import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

export interface ValidationResult {
  data?: unknown;
  error?: string;
}

/**
 * Extracts JSON from a text response, handling various formats
 */
function extractJson(text: string): string {
  // Try to find JSON content between markers
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in response");
  }

  // Return the first complete JSON object found
  return jsonMatch[0];
}

/**
 * Validates JSON data against a schema using AJV
 */
export function validateAgainstSchema(
  data: unknown,
  schema: Record<string, unknown>
): ValidationResult {
  const validate = ajv.compile(schema);

  if (validate(data)) {
    return { data };
  }

  const errors = validate.errors
    ?.map((error) => {
      const path = error.dataPath || error.schemaPath || "";
      const msg = error.message || "Invalid";
      return `${path} ${msg}`;
    })
    .join("; ");

  return { error: `JSON validation failed: ${errors}` };
}

/**
 * Attempts to parse and validate JSON response against a schema
 */
export function parseAndValidateJson(
  text: string,
  schema: Record<string, unknown>
): ValidationResult {
  try {
    // First try to extract JSON content from the response
    const jsonContent = extractJson(text);

    // Then parse the extracted JSON
    const parsed = JSON.parse(jsonContent);
    return validateAgainstSchema(parsed, schema);
  } catch (error) {
    return {
      error: `Failed to parse JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
