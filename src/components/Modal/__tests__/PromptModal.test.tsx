import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptModal } from "../PromptModal";
import type { JSONSchema7 } from "json-schema";
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("PromptModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Test Modal",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Enter your name",
        },
        age: {
          type: "number",
          description: "Enter your age",
        },
      },
      required: ["name"],
    } as JSONSchema7,
    parameterValues: {},
    onParameterChange: vi.fn(),
    requiredParameters: ["name"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders basic modal with title and description", () => {
    render(<PromptModal {...defaultProps} description="Test Description" />);

    expect(screen.getByTestId("prompt-modal")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-modal-title")).toHaveTextContent(
      "Test Modal"
    );
    expect(screen.getByTestId("prompt-modal-description")).toHaveTextContent(
      "Test Description"
    );
  });

  it("renders input fields based on parameters", () => {
    render(<PromptModal {...defaultProps} />);

    expect(screen.getByTestId("prompt-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-age-input")).toBeInTheDocument();
  });

  it("marks required fields with asterisk", () => {
    render(<PromptModal {...defaultProps} />);

    const nameLabel = screen.getByText("name *");
    const ageLabel = screen.getByText("age");

    expect(nameLabel).toBeInTheDocument();
    expect(ageLabel).toBeInTheDocument();
  });

  it("handles parameter changes", () => {
    const onParameterChange = vi.fn();
    render(
      <PromptModal {...defaultProps} onParameterChange={onParameterChange} />
    );

    const nameInput = screen.getByTestId("prompt-name-input");
    fireEvent.change(nameInput, { target: { value: "John" } });

    expect(onParameterChange).toHaveBeenCalledWith("name", "John");
  });

  it("displays validation errors", () => {
    const validationErrors = [{ path: ["name"], message: "Name is required" }];

    render(
      <PromptModal {...defaultProps} validationErrors={validationErrors} />
    );

    expect(screen.getByText("Validation Errors")).toBeInTheDocument();
    expect(screen.getByText("name: Name is required")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<PromptModal {...defaultProps} error="Something went wrong" />);

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders preview content", () => {
    const previewContent = "Test preview content";
    render(<PromptModal {...defaultProps} previewContent={previewContent} />);

    expect(screen.getByTestId("prompt-result")).toHaveTextContent(
      previewContent
    );
  });

  it("renders result content", () => {
    const result = "Test result content";
    render(<PromptModal {...defaultProps} result={result} />);

    expect(screen.getByTestId("prompt-result")).toHaveTextContent(result);
  });

  it("handles primary action click", () => {
    const onClick = vi.fn();
    render(
      <PromptModal
        {...defaultProps}
        primaryAction={{
          label: "Submit",
          onClick,
          isLoading: false,
        }}
      />
    );

    const submitButton = screen.getByTestId("prompt-primary-button");
    fireEvent.click(submitButton);

    expect(onClick).toHaveBeenCalled();
  });

  it("disables primary action when there are validation errors", () => {
    const validationErrors = [{ path: ["name"], message: "Name is required" }];

    render(
      <PromptModal
        {...defaultProps}
        validationErrors={validationErrors}
        primaryAction={{
          label: "Submit",
          onClick: vi.fn(),
          isLoading: false,
        }}
      />
    );

    const submitButton = screen.getByTestId("prompt-primary-button");
    expect(submitButton).toBeDisabled();
  });

  it("handles cancel button click", () => {
    const onClose = vi.fn();
    render(<PromptModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByTestId("prompt-cancel-button");
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("shows loading state for primary action", () => {
    render(
      <PromptModal
        {...defaultProps}
        primaryAction={{
          label: "Submit",
          loadingLabel: "Submitting...",
          onClick: vi.fn(),
          isLoading: true,
        }}
      />
    );

    const button = screen.getByTestId("prompt-primary-button");
    expect(button).toHaveAttribute("label", "Submitting...");
  });
});
