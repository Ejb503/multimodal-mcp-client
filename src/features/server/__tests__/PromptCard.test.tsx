import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptCard } from "../../../components/Card/PromptCard";

describe("PromptCard", () => {
  const mockPrompt = {
    name: "Test Prompt",
    description: "A test prompt",
    type: "test",
  };

  const defaultProps = {
    prompt: mockPrompt,
    onExecute: vi.fn(),
    onView: vi.fn(),
    isLoading: false,
  };

  it("renders prompt information correctly", () => {
    render(<PromptCard {...defaultProps} />);
    expect(screen.getByText("Test Prompt")).toBeInTheDocument();
    expect(screen.getByText("A test prompt")).toBeInTheDocument();
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });

  it("calls onExecute when execute button is clicked", () => {
    render(<PromptCard {...defaultProps} />);
    const executeButton = screen.getByTestId("prompt-execute-Test Prompt");
    fireEvent.click(executeButton);
    expect(defaultProps.onExecute).toHaveBeenCalled();
  });

  it("calls onView when view button is clicked", () => {
    render(<PromptCard {...defaultProps} />);
    const viewButton = screen.getByRole("button", { name: /View Prompt/i });
    fireEvent.click(viewButton);
    expect(defaultProps.onView).toHaveBeenCalled();
  });

  it("disables execute button when loading", () => {
    render(<PromptCard {...defaultProps} isLoading={true} />);
    const executeButton = screen.getByTestId("prompt-execute-Test Prompt");
    expect(executeButton).toBeDisabled();
  });
});
