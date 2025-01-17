export interface GeminiCandidate {
  content: {
    parts: Array<{
      text: string;
    }>;
    role: string;
  };
  finishReason: string;
  index: number;
  safetyRatings: Array<{
    category: string;
    probability: string;
  }>;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: string;
}

export interface LlmResponse {
  response: string;
  error?: string;
}

export interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  _meta?: {
    responseSchema?: Record<string, unknown>;
    complexResponseSchema?: Record<string, unknown>;
    callback?: string;
  };
}
