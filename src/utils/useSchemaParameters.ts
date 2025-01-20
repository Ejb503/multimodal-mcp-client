import { useState, useCallback } from "react";
import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import type { PromptArgument } from "@modelcontextprotocol/sdk/types.js";

export interface ValidationError {
  path: string[];
  message: string;
  type: "required" | "type" | "format" | "custom";
}

export interface SchemaParameter {
  type: string;
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  default?: unknown;
}

export interface UseSchemaParametersOptions {
  validateOnChange?: boolean;
  customValidators?: Record<
    string,
    (value: unknown, schema: JSONSchema7Definition) => string | null
  >;
}

export interface UseSchemaParametersReturn {
  values: Record<string, unknown>;
  errors: ValidationError[];
  setValue: (key: string, value: unknown) => void;
  setValues: (values: Record<string, unknown>) => void;
  validate: (schema: JSONSchema7) => boolean;
  reset: () => void;
  createEmptyValues: (schema: JSONSchema7) => Record<string, unknown>;
  getRequiredFields: (schema: JSONSchema7) => string[];
}

export function createSchemaFromPromptArgs(
  args: PromptArgument[]
): JSONSchema7 {
  if (!args?.length) return { type: "object", properties: {} };

  return {
    type: "object",
    properties: args.reduce<Record<string, JSONSchema7Definition>>(
      (acc, arg) => ({
        ...acc,
        [arg.name]: {
          description: arg.description,
          ...(arg.schema && typeof arg.schema === "object" ? arg.schema : {}),
        } as JSONSchema7Definition,
      }),
      {}
    ),
    required: args.filter((arg) => arg.required).map((arg) => arg.name),
    additionalProperties: false,
  };
}

export function useSchemaParameters(
  options: UseSchemaParametersOptions = {}
): UseSchemaParametersReturn {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateValue = useCallback(
    (
      key: string,
      value: unknown,
      schema: JSONSchema7Definition
    ): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (typeof schema === "boolean") return errors;

      // Required validation is handled separately in validate()
      if (value === undefined || value === "") return errors;

      // Type validation
      if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        const valueType = typeof value;
        if (!types.some((type) => type === valueType)) {
          errors.push({
            path: [key],
            message: `${key} must be of type ${types.join(" or ")}`,
            type: "type",
          });
        }
      }

      // Format validation
      if (schema.format && options.customValidators?.[schema.format]) {
        const error = options.customValidators[schema.format](value, schema);
        if (error) {
          errors.push({
            path: [key],
            message: error,
            type: "format",
          });
        }
      }

      // Pattern validation for strings
      if (schema.pattern && typeof value === "string") {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path: [key],
            message: `${key} does not match required pattern`,
            type: "format",
          });
        }
      }

      return errors;
    },
    [options.customValidators]
  );

  const setValue = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => prev.filter((error) => error.path[0] !== key));
  }, []);

  const setMultipleValues = useCallback(
    (newValues: Record<string, unknown>) => {
      setValues((prev) => ({ ...prev, ...newValues }));
      setErrors((prev) =>
        prev.filter((error) => !Object.keys(newValues).includes(error.path[0]))
      );
    },
    []
  );

  const validate = useCallback(
    (schema: JSONSchema7): boolean => {
      if (typeof schema === "boolean") return true;

      const newErrors: ValidationError[] = [];

      // Required field validation
      if (schema.required) {
        schema.required.forEach((key) => {
          if (
            values[key] === undefined ||
            values[key] === null ||
            values[key] === ""
          ) {
            newErrors.push({
              path: [key],
              message: `${key} is required`,
              type: "required",
            });
          }
        });
      }

      // Property validation
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          if (values[key] !== undefined) {
            const propErrors = validateValue(key, values[key], propSchema);
            newErrors.push(...propErrors);
          }
        });
      }

      setErrors(newErrors);
      return newErrors.length === 0;
    },
    [values, validateValue]
  );

  const reset = useCallback(() => {
    setValues({});
    setErrors([]);
  }, []);

  const createEmptyValues = useCallback((schema: JSONSchema7) => {
    if (typeof schema === "boolean" || !schema.properties) return {};

    return Object.entries(schema.properties).reduce(
      (acc, [key, prop]) => ({
        ...acc,
        [key]:
          typeof prop === "object" && "default" in prop ? prop.default : "",
      }),
      {}
    );
  }, []);

  const getRequiredFields = useCallback((schema: JSONSchema7): string[] => {
    return Array.isArray(schema.required) ? schema.required : [];
  }, []);

  return {
    values,
    errors,
    setValue,
    setValues: setMultipleValues,
    validate,
    reset,
    createEmptyValues,
    getRequiredFields,
  };
}
