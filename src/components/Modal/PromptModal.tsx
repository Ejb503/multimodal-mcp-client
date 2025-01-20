import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { StatusIndicator } from "@/components/StatusIndicator/StatusIndicator";
import { ExecuteButton } from "@/components/Button";
import type { JSONSchema7 } from "json-schema";

interface ValidationError {
  path: string[];
  message: string;
}

export interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: string;
  parameters: JSONSchema7;
  parameterValues: Record<string, unknown>;
  onParameterChange: (key: string, value: unknown) => void;
  validationErrors?: ValidationError[];
  requiredParameters?: string[];
  primaryAction?: {
    label: string;
    loadingLabel?: string;
    onClick: () => void;
    isLoading?: boolean;
  };
  previewContent?: string;
  result?: string;
  error?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function PromptModal({
  isOpen,
  onClose,
  title,
  description,
  icon = "solar:play-circle-line-duotone",
  parameters,
  parameterValues,
  onParameterChange,
  validationErrors = [],
  requiredParameters = [],
  primaryAction,
  previewContent,
  result,
  error,
  size = "lg",
}: PromptModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      role="dialog"
      scrollBehavior="inside"
      classNames={{
        body: "max-h-[60vh] overflow-y-auto",
      }}
      data-testid="prompt-modal"
    >
      <ModalContent>
        {(onModalClose) => (
          <>
            <ModalHeader>
              <div className="flex items-center gap-3">
                <Icon icon={icon} className="h-5 w-5 text-primary" />
                <div className="flex flex-col gap-1">
                  <h3 data-testid="prompt-modal-title">{title}</h3>
                  {description && (
                    <p
                      data-testid="prompt-modal-description"
                      className="text-sm text-default-500"
                    >
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col gap-4">
                {(validationErrors.length > 0 || error) && (
                  <StatusIndicator
                    type="danger"
                    title={
                      validationErrors.length > 0
                        ? "Validation Errors"
                        : "Error"
                    }
                    description={
                      error ||
                      validationErrors
                        .map(
                          (error) =>
                            `${
                              error.path.length > 0
                                ? `${error.path.join(".")}: `
                                : ""
                            }${error.message}`
                        )
                        .join(", ")
                    }
                  />
                )}

                {!previewContent &&
                  !result &&
                  parameters.properties &&
                  Object.entries(parameters.properties).map(([key, schema]) => {
                    const isRequired = requiredParameters.includes(key);
                    const error = validationErrors.find(
                      (e) => e.path[0] === key
                    );
                    const schemaObj = schema as JSONSchema7;

                    return (
                      <Input
                        key={key}
                        name={key}
                        label={`${key}${isRequired ? " *" : ""}`}
                        placeholder={schemaObj.description || `Enter ${key}`}
                        value={String(parameterValues[key] || "")}
                        type={schemaObj.type === "number" ? "number" : "text"}
                        isRequired={isRequired}
                        errorMessage={error?.message}
                        isInvalid={!!error}
                        onChange={(e) => onParameterChange(key, e.target.value)}
                        data-testid={`prompt-${key}-input`}
                      />
                    );
                  })}

                {(previewContent || result) && (
                  <pre
                    className="bg-default-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap"
                    data-testid="prompt-result"
                  >
                    {result || previewContent}
                  </pre>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="danger"
                variant="light"
                onPress={onModalClose}
                startContent={
                  <Icon
                    icon="solar:close-circle-line-duotone"
                    className="text-lg"
                  />
                }
                className="min-w-[100px]"
                data-testid="prompt-cancel-button"
              >
                Cancel
              </Button>
              {primaryAction && (
                <ExecuteButton
                  onPress={primaryAction.onClick}
                  loading={primaryAction.isLoading}
                  label={primaryAction.label}
                  loadingLabel={primaryAction.loadingLabel || "Loading..."}
                  className="min-w-[120px]"
                  disabled={validationErrors.length > 0}
                  data-testid="prompt-primary-button"
                  startContent={
                    !primaryAction.isLoading && (
                      <Icon
                        icon={
                          result
                            ? "solar:check-circle-line-duotone"
                            : "solar:play-circle-line-duotone"
                        }
                        className="text-lg"
                      />
                    )
                  }
                />
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
