import React from "react";
import { Tooltip } from "@nextui-org/react";
import { BaseCard } from "@/components/Card";
import { StatusIndicator } from "@/components/StatusIndicator/StatusIndicator";
import { PromptCard } from "@/components/Card/PromptCard";
import { ExecutionHistoryCard } from "@/components/Card/ExecutionHistoryCard";
import { RefreshButton } from "@/components/Button";
import type {
  Prompt,
  GetPromptResult,
  GetPromptRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { PromptModal } from "@/components/Modal/PromptModal";
import { getErrorMessage } from "../../utils/prompt-utils";
import { useModal } from "../../hooks/useModal";
import { useSchemaParameters } from "@/utils/useSchemaParameters";
import { usePromptLogger } from "../../hooks/usePromptLogger";
import { createSchemaFromPromptArgs } from "@/utils/useSchemaParameters";
import type { LlmResponse } from "@/providers/gemini/types";

export interface PromptsSectionProps {
  prompts: Prompt[];
  onGetPromptDetails: (
    params: GetPromptRequest["params"]
  ) => Promise<GetPromptResult>;
  onExecutePrompt: (params: GetPromptRequest["params"]) => Promise<LlmResponse>;
  isConnected: boolean;
  error?: string;
}

export function PromptsSection({
  prompts,
  onGetPromptDetails,
  onExecutePrompt,
  isConnected,
  error,
}: PromptsSectionProps) {
  const { logSuccess, logError } = usePromptLogger();
  const {
    viewModalOpen,
    executeModalOpen,
    selectedPrompt,
    handleOpenViewModal,
    handleOpenExecuteModal,
    handleCloseViewModal,
    handleCloseExecuteModal,
  } = useModal<Prompt>();
  const {
    values,
    errors: validationErrors,
    setValue,
    reset,
    createEmptyValues,
    setValues,
    validate,
  } = useSchemaParameters();

  const [executeResult, setExecuteResult] = React.useState<string>();
  const [executeError, setExecuteError] = React.useState<string>();
  const [viewResult, setViewResult] = React.useState<GetPromptResult>();
  const [viewError, setViewError] = React.useState<string>();
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [isViewing, setIsViewing] = React.useState(false);

  React.useEffect(() => {
    if (selectedPrompt?.arguments) {
      const schema = createSchemaFromPromptArgs(selectedPrompt.arguments);
      const emptyValues = createEmptyValues(schema);
      setValues(emptyValues);
    } else {
      reset();
    }
    // Clear previous results when prompt changes
    setExecuteResult(undefined);
    setExecuteError(undefined);
    setViewResult(undefined);
    setViewError(undefined);
    setIsExecuting(false);
    setIsViewing(false);
  }, [selectedPrompt, reset, createEmptyValues, setValues]);

  const handlePromptView = async (prompt: Prompt) => {
    try {
      const schema = createSchemaFromPromptArgs(prompt.arguments || []);
      if (!validate(schema)) {
        return;
      }

      setIsViewing(true);
      setViewError(undefined);
      const result = await onGetPromptDetails({
        name: prompt.name,
        arguments: values as Record<string, string>,
      });
      setViewResult(result);
      logSuccess(
        "View Prompt",
        prompt.name,
        values as Record<string, string>,
        result
      );
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setViewError(errorMessage);
      logError(
        "View Prompt",
        prompt.name,
        errorMessage,
        values as Record<string, string>
      );
      throw error;
    } finally {
      setIsViewing(false);
    }
  };

  const handlePromptExecute = async (prompt: Prompt) => {
    try {
      const schema = createSchemaFromPromptArgs(prompt.arguments || []);
      if (!validate(schema)) {
        return;
      }

      setIsExecuting(true);
      setExecuteError(undefined);
      const result = await onExecutePrompt({
        name: prompt.name,
        arguments: values as Record<string, string>,
      });
      if (result.error) {
        setExecuteError(result.error);
        logError(
          "Execute Prompt",
          prompt.name,
          result.error,
          values as Record<string, string>
        );
        throw new Error(result.error);
      }
      setExecuteResult(result.response);
      logSuccess(
        "Execute Prompt",
        prompt.name,
        values as Record<string, string>,
        result
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setExecuteError(errorMessage);
      logError(
        "Execute Prompt",
        prompt.name,
        errorMessage,
        values as Record<string, string>
      );
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isConnected) {
    return (
      <BaseCard
        title="Available Prompts"
        subtitle="0 prompts available"
        icon="solar:document-text-line-duotone"
        isEmpty={false}
        headerAction={
          <div className="flex items-center gap-2">
            <StatusIndicator
              type="danger"
              title="Connection Error"
              description="Failed to connect to server. Prompts are unavailable."
            />
            <Tooltip content="Refresh available prompts">
              <RefreshButton
                onPress={() => {}}
                loading={false}
                aria-label="Refresh prompts list"
              />
            </Tooltip>
          </div>
        }
      >
        {null}
      </BaseCard>
    );
  }

  return (
    <BaseCard
      title="Available Prompts"
      subtitle={`${prompts.length} prompt${
        prompts.length === 1 ? "" : "s"
      } available`}
      icon="solar:document-text-line-duotone"
      isEmpty={prompts.length === 0 && !error}
      headerAction={
        <div className="flex items-center gap-2">
          {error && (
            <StatusIndicator
              type="danger"
              title="Connection Error"
              description={error}
            />
          )}
          <Tooltip content="Refresh available prompts">
            <RefreshButton
              onPress={() => {}}
              loading={false}
              aria-label="Refresh prompts list"
            />
          </Tooltip>
        </div>
      }
    >
      {prompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((prompt, index) => (
            <PromptCard
              key={`${prompt.name}-${index}`}
              prompt={prompt}
              onView={() => handleOpenViewModal(prompt)}
              onExecute={() => handleOpenExecuteModal(prompt)}
            />
          ))}
        </div>
      ) : null}

      {selectedPrompt && (
        <>
          <PromptModal
            isOpen={viewModalOpen}
            onClose={handleCloseViewModal}
            title={selectedPrompt.name}
            description={selectedPrompt.description}
            icon="solar:document-text-line-duotone"
            parameters={createSchemaFromPromptArgs(
              selectedPrompt.arguments || []
            )}
            parameterValues={values}
            onParameterChange={setValue}
            validationErrors={validationErrors}
            requiredParameters={
              selectedPrompt.arguments
                ?.filter((arg) => arg.required)
                .map((arg) => arg.name) || []
            }
            primaryAction={{
              label: viewResult ? "Close" : "View Prompt",
              loadingLabel: "Loading...",
              onClick: viewResult
                ? handleCloseViewModal
                : () => handlePromptView(selectedPrompt),
              isLoading: isViewing,
            }}
            error={viewError}
            result={
              viewResult ? JSON.stringify(viewResult, null, 2) : undefined
            }
            size="2xl"
          />

          <PromptModal
            isOpen={executeModalOpen}
            onClose={handleCloseExecuteModal}
            title={selectedPrompt.name}
            description={selectedPrompt.description}
            icon="solar:document-text-line-duotone"
            parameters={createSchemaFromPromptArgs(
              selectedPrompt.arguments || []
            )}
            parameterValues={values}
            onParameterChange={setValue}
            validationErrors={validationErrors}
            requiredParameters={
              selectedPrompt.arguments
                ?.filter((arg) => arg.required)
                .map((arg) => arg.name) || []
            }
            primaryAction={{
              label: executeResult ? "Close" : "Execute",
              loadingLabel: "Executing...",
              onClick: executeResult
                ? handleCloseExecuteModal
                : () => handlePromptExecute(selectedPrompt),
              isLoading: isExecuting,
            }}
            error={executeError}
            result={executeResult}
            size="2xl"
          />
        </>
      )}

      <ExecutionHistoryCard />
    </BaseCard>
  );
}
