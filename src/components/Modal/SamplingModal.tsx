import { ContentModal } from "./ContentModal";
import type {
  CreateMessageRequest,
  CreateMessageResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { useState } from "react";
import { useLlmPrompt } from "@/features/server/hooks/useLlmPrompt";

interface SamplingModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CreateMessageRequest["params"];
  onApprove: (response: CreateMessageResult) => void;
  onReject: () => void;
}

export function SamplingModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
}: SamplingModalProps) {
  const { execute, isLoading } = useLlmPrompt();
  const [progress] = useState<string>("");
  const [response, setResponse] = useState<CreateMessageResult>({
    role: "assistant",
    content: {
      type: "text",
      text: "",
    } as TextContent,
    model: "",
  });

  const handleSubmit = async () => {
    console.log("Request in SamplingModal:", request);
    try {
      const params: Record<string, string> = {};

      if (typeof request.temperature === "number") {
        params.temperature = request.temperature.toString();
      }
      if (typeof request.maxTokens === "number") {
        params.maxTokens = request.maxTokens.toString();
      }
      if (request.stopSequences?.length) {
        params.stopSequences = request.stopSequences.join(",");
      }

      const result = await execute(
        {
          name: "sampling",
          messages: request.messages,
          _meta: {
            ...request._meta,
            progress: true,
          },
        },
        params
      );

      const updatedResponse: CreateMessageResult = {
        role: "assistant",
        content: {
          type: "text",
          text: result as string,
        },
        model: response.model,
      };

      setResponse(updatedResponse);
      onApprove(updatedResponse);
      onClose();
    } catch (error) {
      console.error("Failed to execute sampling:", error);
    }
  };

  const handleModalClose = () => {
    onReject();
    onClose();
  };

  const sections = [
    {
      title: "Messages",
      content: {
        messages: request.messages.map((msg) => ({
          role: msg.role,
          text: "text" in msg.content ? msg.content.text : "",
        })),
      },
    },
    {
      title: "Parameters",
      content: {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stopSequences: request.stopSequences?.join(", "),
        responseSchema: request._meta?.responseSchema
          ? JSON.stringify(request._meta.responseSchema, null, 2)
          : undefined,
      },
    },
    {
      title: "Response",
      content: {
        text: (response.content as TextContent).text,
        model: response.model,
      },
      isForm: true,
      onValueChange: (key: string, value: unknown) => {
        if (key === "text") {
          setResponse((prev) => ({
            ...prev,
            content: {
              type: "text",
              text: value as string,
            },
          }));
        } else if (key === "model") {
          setResponse((prev) => ({
            ...prev,
            model: value as string,
          }));
        }
      },
      values: {
        text: (response.content as TextContent).text,
        model: response.model,
      },
    },
    {
      title: "Status",
      content: {
        progress: progress || "Waiting for execution...",
      },
    },
  ];

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Sampling Request"
      sections={sections}
      primaryAction={{
        label: "Execute",
        loadingLabel: "Executing...",
        onClick: handleSubmit,
        isLoading: isLoading,
      }}
    />
  );
}
