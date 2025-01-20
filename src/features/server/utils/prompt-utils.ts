import type { JSONSchema7 } from "json-schema";
import type {
  Prompt,
  GetPromptResult,
  PromptMessage,
  JSONRPCError,
} from "@modelcontextprotocol/sdk/types.js";
import { LogType } from "@/stores/log-store";
import Ajv from "ajv";

const ajv = new Ajv();

export interface ValidationError {
  path: string[];
  message: string;
}

export interface PromptLogEntry {
  type: LogType;
  operation: string;
  status: "success" | "error";
  name: string;
  params?: Record<string, unknown>;
  result?: PromptMessage[];
  error?: string;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "error" in error) {
    const rpcError = error as JSONRPCError;
    return rpcError.error.message;
  }
  return "An unexpected error occurred";
}

export function validatePromptParameters(
  schema: JSONSchema7,
  values: Record<string, unknown>
): ValidationError[] {
  const validate = ajv.compile(schema);
  const isValid = validate(values);

  if (!isValid && validate.errors) {
    return validate.errors.map((err) => ({
      path: err.schemaPath.split("/").filter(Boolean),
      message: err.message || "Invalid value",
    }));
  }

  return [];
}
