export interface SystempromptBlock {
  id: string;
  type: string;
  content: string;
  metadata: Metadata;
  prefix: string;
  _link: string;
}

export interface SystempromptAgent {
  id: string;
  type: string;
  content: string;
  metadata: Metadata;
  _link: string;
}

type Metadata = {
  title: string;
  description: string;
  created: string;
  updated: string;
  version: number;
  status: string;
  tag: string[];
};

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
  metadata: Metadata;
  _meta?: unknown[];
}

export interface SystempromptModule {
  id: string;
  type: string;
  title: string;
  description: string;
  environment_variables: string[];
  github_link: string;
  npm_link: string;
  icon: string;
  metadata: ServerMetadata;
  block: SystempromptBlock[];
  prompt: SystempromptPrompt[];
  agent: SystempromptAgent[];
  _link: string;
}

export interface SystempromptUser {
  user: {
    name: string;
    email: string;
    roles: string[];
  };
  billing: null;
  api_key: string;
}
