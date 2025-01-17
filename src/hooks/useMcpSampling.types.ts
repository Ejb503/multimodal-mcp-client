import type {
  CreateMessageRequest,
  CreateMessageResult,
  ProgressToken,
} from "@modelcontextprotocol/sdk/types.js";

export interface SamplingProgress {
  progressToken: ProgressToken;
  progress: number;
  total: number;
  status?: string;
}

export interface PendingSampleRequest {
  id: number;
  serverId: string;
  request: CreateMessageRequest["params"];
  resolve: (result: CreateMessageResult) => void;
  reject: (error: Error) => void;
  progress?: (status: string) => void;
}

export interface SamplingHookState {
  pendingSampleRequests: PendingSampleRequest[];
}

export interface SamplingHookActions {
  requestSampling: (
    serverId: string,
    request: CreateMessageRequest["params"],
    progress?: (status: string) => void
  ) => Promise<CreateMessageResult>;
  handleApproveSampling: (
    id: number,
    response: CreateMessageResult
  ) => Promise<void>;
  handleRejectSampling: (id: number) => void;
}

export type SamplingHookReturn = SamplingHookState & SamplingHookActions;

export interface SamplingErrorType extends Error {
  code: string;
}

export const createSamplingError = (
  message: string,
  code: string
): SamplingErrorType => {
  const error = new Error(message) as SamplingErrorType;
  error.name = "SamplingError";
  error.code = code;
  return error;
};
