import React from "react";
import type {
  Prompt,
  GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
import { PromptModal } from "@/components/Modal/PromptModal";
import {
  createSchemaFromPromptArgs,
  useSchemaParameters,
} from "@/utils/useSchemaParameters";
import { useLogStore } from "@/stores/log-store";
import { getErrorMessage } from "../../utils/prompt-utils";

interface ViewPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: Prompt;
  onGetPromptDetails: (params: {
    name: string;
    arguments: Record<string, string>;
  }) => Promise<GetPromptResult>;
}

export function ViewPromptModal({
  isOpen,
  onClose,
  prompt,
  onGetPromptDetails,
}: ViewPromptModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<GetPromptResult>();
  const [error, setError] = React.useState<string>();
  const {
    values,
    errors: validationErrors,
    setValue,
    reset,
    createEmptyValues,
    setValues,
  } = useSchemaParameters();
  const { addLog } = useLogStore();

  React.useEffect(() => {
    if (prompt.arguments) {
      const schema = createSchemaFromPromptArgs(prompt.arguments);
      const emptyValues = createEmptyValues(schema);
      setValues(emptyValues);
    } else {
      reset();
    }
  }, [prompt, reset, createEmptyValues, setValues]);

  const handleViewPrompt = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const details = await onGetPromptDetails({
        name: prompt.name,
        arguments: Object.entries(values).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          },
          {}
        ),
      });

      setResult(details);
      addLog({
        type: "prompt",
        operation: "View Prompt",
        status: "success",
        name: prompt.name,
        params: values,
        result: details.messages,
      });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      addLog({
        type: "prompt",
        operation: "View Prompt",
        status: "error",
        name: prompt.name,
        params: values,
        error: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PromptModal
      isOpen={isOpen}
      onClose={onClose}
      title={prompt.name}
      description={prompt.description}
      icon="solar:document-text-line-duotone"
      parameters={createSchemaFromPromptArgs(prompt.arguments || [])}
      parameterValues={values}
      onParameterChange={setValue}
      validationErrors={validationErrors}
      requiredParameters={
        prompt.arguments
          ?.filter((arg) => arg.required)
          .map((arg) => arg.name) || []
      }
      primaryAction={{
        label: "View Prompt",
        loadingLabel: "Loading...",
        onClick: handleViewPrompt,
        isLoading,
      }}
      error={error}
      result={result ? JSON.stringify(result, null, 2) : undefined}
      size="2xl"
    />
  );
}
