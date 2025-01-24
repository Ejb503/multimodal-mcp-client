import type {
  Content,
  FunctionCall,
  GenerationConfig,
  GenerativeContentBlob,
  Part,
  Tool,
} from "@google/generative-ai";

/**
 * this module contains type-definitions and Type-Guards
 */

// Type-definitions

/* outgoing types */

/**
 * the config to initiate the session
 */
export type LiveConfig = {
  model: string;
  systemInstruction?: { parts: Part[] };
  generationConfig?: Partial<LiveGenerationConfig>;
  tools?: Array<Tool | { googleSearch: {} } | { codeExecution: {} }>;
};

export type LiveGenerationConfig = GenerationConfig & {
  responseModalities: "text" | "audio" | "image";
  speechConfig?: {
    voiceConfig?: {
      prebuiltVoiceConfig?: {
        voiceName: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede" | string;
      };
    };
  };
};

export type LiveOutgoingMessage =
  | SetupMessage
  | ClientContentMessage
  | RealtimeInputMessage
  | ToolResponseMessage;

export type SetupMessage = {
  setup: LiveConfig;
};

export type ClientContentMessage = {
  clientContent: {
    turns: Content[];
    turnComplete: boolean;
  };
};

export type RealtimeInputMessage = {
  realtimeInput: {
    mediaChunks: GenerativeContentBlob[];
  };
};

export type ToolResponseMessage = {
  toolResponse: {
    functionResponses: LiveFunctionResponse[];
  };
};

export type ToolResponse = ToolResponseMessage["toolResponse"];

export type LiveFunctionResponse = {
  response: object;
  id: string;
};

/** Incoming types */

export type LiveIncomingMessage =
  | ToolCallCancellationMessage
  | ToolCallMessage
  | ServerContentMessage
  | SetupCompleteMessage;

export type SetupCompleteMessage = { setupComplete: {} };

export type ServerContentMessage = {
  serverContent: ServerContent;
};

export type ServerContent = ModelTurn | TurnComplete | Interrupted;

export type ModelTurn = {
  modelTurn: {
    parts: Part[];
  };
};

export type TurnComplete = { turnComplete: boolean };

export type Interrupted = { interrupted: true };

export type ToolCallCancellationMessage = {
  toolCallCancellation: {
    ids: string[];
  };
};

export type ToolCallCancellation =
  ToolCallCancellationMessage["toolCallCancellation"];

export type ToolCallMessage = {
  toolCall: ToolCall;
};

export type LiveFunctionCall = FunctionCall & {
  id: string;
};

/**
 * A `toolCall` message
 */
export type ToolCall = {
  functionCalls: LiveFunctionCall[];
};

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message: string | LiveOutgoingMessage | LiveIncomingMessage;
};

// Type-Guards

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function hasProperty(obj: unknown, prop: string): boolean {
  return isObject(obj) && prop in obj;
}

// outgoing messages
export const isSetupMessage = (a: unknown): a is SetupMessage =>
  hasProperty(a, "setup");

export const isClientContentMessage = (a: unknown): a is ClientContentMessage =>
  hasProperty(a, "clientContent");

export const isRealtimeInputMessage = (a: unknown): a is RealtimeInputMessage =>
  hasProperty(a, "realtimeInput");

export const isToolResponseMessage = (a: unknown): a is ToolResponseMessage =>
  hasProperty(a, "toolResponse");

// incoming messages
export const isSetupCompleteMessage = (a: unknown): a is SetupCompleteMessage =>
  hasProperty(a, "setupComplete");

export const isServerContentMessage = (a: unknown): a is ServerContentMessage =>
  hasProperty(a, "serverContent");

export const isToolCallMessage = (a: unknown): a is ToolCallMessage =>
  hasProperty(a, "toolCall");

export const isToolCallCancellationMessage = (
  a: unknown
): a is ToolCallCancellationMessage =>
  hasProperty(a, "toolCallCancellation") &&
  isToolCallCancellation((a as Record<string, unknown>).toolCallCancellation);

export const isModelTurn = (a: unknown): a is ModelTurn =>
  hasProperty(a, "modelTurn");

export const isTurnComplete = (a: unknown): a is TurnComplete =>
  hasProperty(a, "turnComplete");

export const isInterrupted = (a: unknown): a is Interrupted =>
  hasProperty(a, "interrupted");

export function isToolCall(value: unknown): value is ToolCall {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.functionCalls) &&
    candidate.functionCalls.every((call) => isLiveFunctionCall(call))
  );
}

export function isToolResponse(value: unknown): value is ToolResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.functionResponses) &&
    candidate.functionResponses.every((resp) => isLiveFunctionResponse(resp))
  );
}

export function isLiveFunctionCall(value: unknown): value is LiveFunctionCall {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.id === "string" &&
    typeof candidate.args === "object" &&
    candidate.args !== null
  );
}

export function isLiveFunctionResponse(
  value: unknown
): value is LiveFunctionResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.response === "object" && typeof candidate.id === "string"
  );
}

export const isToolCallCancellation = (
  a: unknown
): a is ToolCallCancellationMessage["toolCallCancellation"] =>
  typeof a === "object" && Array.isArray((a as any).ids);
