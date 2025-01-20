export interface SystempromptPrompt {
  id?: string;
  instruction?: {
    static: string;
    dynamic: string;
    state: string;
  };
  input?: {
    name: string;
    description: string;
    schema: {
      type: string;
      required?: string[];
      properties?: Record<string, { type: string; description?: string }>;
      description?: string;
      additionalProperties?: boolean;
    };
    type: string[];
    reference: unknown[];
  };
  output?: {
    name: string;
    description: string;
    schema: {
      type: string;
      required?: string[];
      properties?: Record<string, { type: string; description?: string }>;
      description?: string;
      additionalProperties?: boolean;
    };
  };
  metadata?: {
    title: string;
    description: string;
    created: string;
    updated: string;
    version: number;
    status: string;
    tag: string[];
  };
}
