import {
  GoogleGenerativeAI,
  ModelParams,
  GenerationConfig,
  GenerateContentRequest,
  GenerativeModel,
} from "@google/generative-ai";
import { PromptMessage } from "@modelcontextprotocol/sdk/types.js";
import { convertToGeminiSchema } from "./utils/schema";
import { GeminiConfig, LlmResponse } from "./types";
import { parseAndValidateJson } from "./utils/validation";

// Constants
const DEFAULT_MODEL = "gemini-2.0-flash-exp";
const ERRORS = {
  NO_CONTENT: "No valid content found in messages",
  NO_API_KEY: "Gemini API key not configured",
  NO_RESPONSE: "No response received from Gemini",
  VALIDATION_RETRY_FAILED: "JSON validation failed after retry attempt",
} as const;

// Types
type ResponseType =
  | { type: "text" }
  | { type: "schema"; schema: Record<string, unknown> }
  | { type: "complex_schema"; schema: Record<string, unknown> };

type GeminiConfigWithMeta = GeminiConfig & {
  responseSchema?: Record<string, unknown>;
  _meta?: {
    responseSchema?: Record<string, unknown>;
    complexResponseSchema?: Record<string, unknown>;
    callback?: string;
  };
};

interface GeminiMessage {
  role: "model" | "user";
  parts: Array<{ text: string }>;
}

// Service instance
let genAI: GoogleGenerativeAI | null = null;

/**
 * Initializes the Gemini API client with the provided API key
 */
export function initializeGemini(apiKey: string): void {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Ensures the Gemini client is initialized
 * @throws {Error} If API key is not configured
 */
function ensureInitialized(config: GeminiConfigWithMeta): void {
  if (!genAI) {
    if (!config.apiKey) {
      throw new Error(ERRORS.NO_API_KEY);
    }
    initializeGemini(config.apiKey);
  }
}

/**
 * Determines the type of response needed based on configuration
 */
function determineResponseType(config: GeminiConfigWithMeta): ResponseType {
  console.log("Config:", config);
  if (config._meta?.complexResponseSchema) {
    return {
      type: "complex_schema",
      schema: config._meta.complexResponseSchema,
    };
  }
  if (config._meta?.responseSchema || config.responseSchema) {
    return {
      type: "schema",
      schema: config._meta?.responseSchema || config.responseSchema!,
    };
  }
  return { type: "text" };
}

/**
 * Formats a single message into Gemini's expected format
 */
function formatMessage(msg: PromptMessage): GeminiMessage | null {
  let text = "";
  if (msg.content.type === "text" && msg.content.text) {
    text = msg.content.text;
  } else if (msg.content.type === "resource" && msg.content.resource) {
    text = `Resource ${msg.content.resource.uri}:\n${msg.content.resource.text}`;
  }

  if (!text) return null;

  return {
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text }],
  };
}

/**
 * Formats messages into Gemini's expected request format
 */
function formatMessages(messages: PromptMessage[]): GenerateContentRequest {
  const formattedMessages = messages
    .map(formatMessage)
    .filter((msg): msg is GeminiMessage => msg !== null);

  return { contents: formattedMessages };
}

/**
 * Creates model configuration based on response type
 */
function createModelConfig(
  config: GeminiConfigWithMeta,
  responseType: ResponseType
): ModelParams {
  const baseConfig: ModelParams = {
    model: config.model || DEFAULT_MODEL,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    } as GenerationConfig,
  };

  if (responseType.type === "schema") {
    const convertedSchema = convertToGeminiSchema(responseType.schema);
    return {
      ...baseConfig,
      generationConfig: {
        ...baseConfig.generationConfig,
        responseMimeType: "application/json",
        responseSchema: convertedSchema,
      } as GenerationConfig,
    };
  }

  return baseConfig;
}

/**
 * Appends schema instruction to messages for complex schema handling
 */
function appendSchemaInstruction(
  messages: GenerateContentRequest,
  schema: Record<string, unknown>
): GenerateContentRequest {
  const instruction = {
    role: "user" as const,
    parts: [
      {
        text: [
          "You must return your response as a valid JSON object that strictly conforms to this schema.",
          "Return ONLY the raw JSON without any markdown formatting, code blocks, or additional text.",
          "The response should start with '{' and end with '}':",
          JSON.stringify(schema, null, 2),
        ].join("\n"),
      },
    ],
  };

  return {
    contents: [...messages.contents, instruction],
  };
}

/**
 * Appends validation error feedback to messages
 */
function appendValidationFeedback(
  messages: GenerateContentRequest,
  error: string,
  response: string
): GenerateContentRequest {
  const feedback = {
    role: "user" as const,
    parts: [
      {
        text: [
          "The previous response failed JSON validation with the following error:",
          error,
          "\nHere was your previous response:",
          response,
          "\nPlease fix the validation errors and return a valid JSON object that conforms to the schema.",
          "Remember to return ONLY the raw JSON without any markdown or additional text.",
        ].join("\n"),
      },
    ],
  };

  return {
    contents: [...messages.contents, feedback],
  };
}

/**
 * Processes the response based on the response type
 */
async function processResponse(
  text: string,
  responseType: ResponseType,
  model: GenerativeModel,
  messages: GenerateContentRequest
): Promise<LlmResponse> {
  if (!text) {
    return { response: "", error: ERRORS.NO_RESPONSE };
  }

  switch (responseType.type) {
    case "complex_schema": {
      // First attempt
      const firstAttempt = parseAndValidateJson(text, responseType.schema);
      if (!firstAttempt.error) {
        console.log("First Attempt:", firstAttempt.data);
        return { response: JSON.stringify(firstAttempt.data) };
      }

      // Retry with validation error feedback
      const messagesWithFeedback = appendValidationFeedback(
        messages,
        firstAttempt.error,
        text
      );

      const retryResult = await model.generateContent(messagesWithFeedback);
      const retryText = retryResult.response.text().trim();

      const secondAttempt = parseAndValidateJson(
        retryText,
        responseType.schema
      );
      if (secondAttempt.error) {
        return {
          response: "",
          error: `${ERRORS.VALIDATION_RETRY_FAILED}: ${secondAttempt.error}`,
        };
      }
      console.log("Second Attempt:", secondAttempt.data);
      return { response: JSON.stringify(secondAttempt.data) };
    }
    case "schema":
    case "text":
      return { response: text };
  }
}

/**
 * Generates a response using the Gemini API
 */
export async function generateLlmResponse(
  messages: PromptMessage[],
  config: GeminiConfigWithMeta = {}
): Promise<LlmResponse> {
  try {
    if (!messages.length) {
      throw new Error(ERRORS.NO_CONTENT);
    }

    console.log(
      "Received config in generateLlmResponse:",
      JSON.stringify(config, null, 2)
    );
    ensureInitialized(config);

    const responseType = determineResponseType(config);
    console.log("Determined response type:", responseType);

    let formattedMessages = formatMessages(messages);
    const modelConfig = createModelConfig(config, responseType);

    if (responseType.type === "complex_schema") {
      console.log("Handling complex schema with:", responseType.schema);
      formattedMessages = appendSchemaInstruction(
        formattedMessages,
        responseType.schema
      );
    }

    if (!formattedMessages.contents.length) {
      throw new Error(ERRORS.NO_CONTENT);
    }

    const model = genAI!.getGenerativeModel(modelConfig);
    const result = await model.generateContent(formattedMessages);
    const response = await result.response;
    const text = response.text().trim();
    console.log("Gemini Response", text);

    return processResponse(text, responseType, model, formattedMessages);
  } catch (error) {
    console.error("Error in generateLlmResponse:", error);
    return {
      response: "",
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
}
