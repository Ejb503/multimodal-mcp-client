import { useState, useRef, useContext, useCallback } from "react";
import { McpContext } from "../contexts/McpContext";
import { SamplingProgressManager } from "./useMcpSampling.utils";
import type {
  PendingSampleRequest,
  SamplingHookReturn,
} from "./useMcpSampling.types";
import type {
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/sdk/types.js";
import { createSamplingError } from "./useMcpSampling.types";

export function useMcpSampling(): SamplingHookReturn {
  const context = useContext(McpContext);
  if (!context) {
    throw new Error("useMcpSampling must be used within a McpProvider");
  }
  const { clients } = context;

  const [pendingSampleRequests, setPendingSampleRequests] = useState<
    PendingSampleRequest[]
  >([]);
  const nextRequestId = useRef(0);

  const requestSampling = useCallback(
    async (
      serverId: string,
      request: CreateMessageRequest["params"],
      progress?: (status: string) => void
    ): Promise<CreateMessageResult> => {
      const progressToken = nextRequestId.current;

      if (!clients[serverId]?.client) {
        throw createSamplingError(
          `No client available for server ${serverId}`,
          "NO_CLIENT"
        );
      }

      const requestWithProgress: CreateMessageRequest["params"] = {
        ...request,
        _meta: {
          ...request._meta,
          progressToken,
        },
      };

      return new Promise((resolve, reject) => {
        setPendingSampleRequests((prev) => [
          ...prev,
          {
            id: nextRequestId.current++,
            serverId,
            request: requestWithProgress,
            resolve,
            reject,
            progress,
          },
        ]);
      });
    },
    [clients]
  );

  const handleApproveSampling = useCallback(
    async (id: number, response: CreateMessageResult): Promise<void> => {
      const request = pendingSampleRequests.find((r) => r.id === id);
      if (!request) {
        throw createSamplingError(
          `No pending request found with id ${id}`,
          "REQUEST_NOT_FOUND"
        );
      }

      const clientState = clients[request.serverId];
      if (!clientState?.client) {
        throw createSamplingError(
          `Client not available for server ${request.serverId}`,
          "CLIENT_NOT_AVAILABLE"
        );
      }

      try {
        const progressManager = new SamplingProgressManager(
          clientState.client,
          id
        );

        await progressManager.start();
        await progressManager.update(50);
        await progressManager.complete();

        request.resolve(response);
      } catch (error) {
        const samplingError =
          error instanceof Error ? error : new Error(String(error));
        request.reject(samplingError);
      } finally {
        setPendingSampleRequests((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [clients, pendingSampleRequests]
  );

  const handleRejectSampling = useCallback(
    (id: number): void => {
      const request = pendingSampleRequests.find((r) => r.id === id);
      if (request) {
        const clientState = clients[request.serverId];
        if (clientState?.client) {
          const progressManager = new SamplingProgressManager(
            clientState.client,
            id
          );
          progressManager.reject();
        }
        request.reject(
          createSamplingError("Sampling request rejected", "REJECTED")
        );
        setPendingSampleRequests((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [clients, pendingSampleRequests]
  );

  return {
    pendingSampleRequests,
    requestSampling,
    handleApproveSampling,
    handleRejectSampling,
  };
}
