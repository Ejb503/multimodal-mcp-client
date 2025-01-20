import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ToolsSection } from "../components/sections/ToolsSection";
import "@testing-library/jest-dom";
import { useLogStore } from "../../../stores/log-store";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const mockTools: Tool[] = [
  {
    name: "testTool",
    description: "A test tool",
    inputSchema: {
      type: "object" as const,
      properties: {
        param1: { type: "string", description: "Test parameter" },
      },
      required: ["param1"],
    },
  },
];

// Mock NextUI components
vi.mock("@nextui-org/react", async () => {
  return {
    Card: vi.fn(({ children, "data-testid": testId, className, ...props }) => {
      // Add execution-history-card test ID if it's the history card
      const isHistoryCard = className?.includes("execution-history");
      const finalTestId = isHistoryCard
        ? "execution-history-card"
        : testId || "card";
      return (
        <div data-testid={finalTestId} {...props} className={className}>
          {children}
        </div>
      );
    }),
    CardHeader: vi.fn(({ children }) => (
      <div data-testid="card-header">{children}</div>
    )),
    CardBody: vi.fn(({ children }) => (
      <div data-testid="card-body">{children}</div>
    )),
    Chip: vi.fn(({ children }) => <div data-testid="chip">{children}</div>),
    Tooltip: vi.fn(({ children }) => (
      <div data-testid="tooltip">{children}</div>
    )),
    Button: vi.fn(({ children, onPress }) => (
      <button onClick={onPress}>{children}</button>
    )),
    Modal: vi.fn(({ children, isOpen, onClose }) => {
      return isOpen ? (
        <div data-testid="modal">
          {typeof children === "function" ? children(onClose) : children}
        </div>
      ) : null;
    }),
    ModalContent: vi.fn(({ children }) => (
      <div data-testid="modal-content">
        {typeof children === "function" ? children() : children}
      </div>
    )),
    ModalHeader: vi.fn(({ children }) => (
      <div data-testid="modal-header">{children}</div>
    )),
    ModalBody: vi.fn(({ children }) => (
      <div data-testid="modal-body">{children}</div>
    )),
    ModalFooter: vi.fn(({ children }) => (
      <div data-testid="modal-footer">
        {typeof children === "function"
          ? children({ onClose: vi.fn() })
          : children}
      </div>
    )),
    Input: vi.fn(
      ({
        label,
        "data-testid": testId,
        isRequired,
        errorMessage,
        isInvalid,
        ...props
      }) => {
        const attrs = {
          "data-testid": testId || `input-${label?.toLowerCase()}`,
          "aria-label": label,
          ...props,
        };
        if (isRequired) attrs["aria-required"] = "true";
        if (errorMessage) attrs["aria-errormessage"] = errorMessage;
        if (isInvalid) attrs["aria-invalid"] = "true";
        return <input {...attrs} />;
      }
    ),
    useDisclosure: vi.fn(() => ({
      isOpen: true,
      onOpen: vi.fn(),
      onClose: vi.fn(),
    })),
  };
});

// Mock the Icon component
vi.mock("@iconify/react", () => ({
  Icon: vi.fn(() => <span />),
}));

// Mock the shared components
vi.mock("@/components/Button", () => ({
  Button: vi.fn(({ children, onPress }) => (
    <button onClick={onPress}>{children}</button>
  )),
  ExecuteButton: vi.fn(({ onPress, children, variant }) => (
    <button
      onClick={onPress}
      data-testid={
        variant === "flat" ? "tool-card-execute-button" : "modal-execute-button"
      }
    >
      {children || "Execute Tool"}
    </button>
  )),
  RefreshButton: vi.fn(({ onPress }) => (
    <button onClick={onPress}>Refresh</button>
  )),
}));

vi.mock("@/components/StatusIndicator/StatusIndicator", () => ({
  StatusIndicator: vi.fn(({ title, description }) => (
    <div data-testid="status-indicator">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  )),
}));

describe("ToolsSection", () => {
  const mockExecuteTool = vi.fn();
  const mockFetchTools = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useLogStore.getState().clearLogs();
  });

  it("renders tools correctly", () => {
    render(
      <ToolsSection
        tools={mockTools}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
      />
    );

    expect(screen.getByText("testTool")).toBeInTheDocument();
    expect(screen.getByText("A test tool")).toBeInTheDocument();
  });

  it("handles empty tools state", () => {
    render(
      <ToolsSection
        tools={[]}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
      />
    );

    expect(screen.getByText("No tools loaded")).toBeInTheDocument();
  });

  it("shows error state correctly", () => {
    render(
      <ToolsSection
        tools={[]}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
        error={true}
      />
    );

    expect(screen.getByText("Connection Error")).toBeInTheDocument();
    expect(
      screen.getByText("Failed to connect to server. Tools are unavailable.")
    ).toBeInTheDocument();
  });

  it("executes tool with parameters", async () => {
    mockExecuteTool.mockResolvedValue({ success: true });

    render(
      <ToolsSection
        tools={mockTools}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
      />
    );

    // Open the execution modal
    const executeButton = screen.getByTestId("tool-card-execute-button");
    fireEvent.click(executeButton);

    // Fill in parameters
    const input = screen.getByTestId("tool-param1-input");
    fireEvent.change(input, { target: { value: "test value" } });

    // Execute the tool
    const modalExecuteButton = screen.getByTestId("modal-execute-button");
    fireEvent.click(modalExecuteButton);

    await waitFor(() => {
      expect(mockExecuteTool).toHaveBeenCalledWith("testTool", {
        param1: "test value",
      });
    });
  });

  it("shows execution history after successful execution", async () => {
    mockExecuteTool.mockResolvedValue({ result: "success" });

    render(
      <ToolsSection
        tools={mockTools}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
      />
    );

    // Execute tool
    const executeButton = screen.getByTestId("tool-card-execute-button");
    fireEvent.click(executeButton);
    const input = screen.getByTestId("tool-param1-input");
    fireEvent.change(input, { target: { value: "test value" } });
    const modalExecuteButton = screen.getByTestId("modal-execute-button");
    fireEvent.click(modalExecuteButton);

    // Wait for the execution history to appear and verify its contents
    await waitFor(() => {
      // Verify the log entry exists
      const logEntry = screen.getByTestId("execution-log-entry");
      expect(logEntry).toBeInTheDocument();

      // Then verify the contents of the log entry
      const logName = within(logEntry).getByTestId("execution-log-name");
      expect(logName).toHaveTextContent("testTool");

      const logOperation = within(logEntry).getByTestId(
        "execution-log-operation"
      );
      expect(logOperation).toHaveTextContent("Execute Tool");

      const paramsSection = within(logEntry).getByTestId(
        "execution-log-params"
      );
      expect(paramsSection).toBeInTheDocument();
      expect(paramsSection).toHaveTextContent(/test value/);

      const resultSection = within(logEntry).getByTestId(
        "execution-log-result"
      );
      expect(resultSection).toBeInTheDocument();
      expect(resultSection).toHaveTextContent(/success/);
    });
  });

  it("handles tool execution errors", async () => {
    mockExecuteTool.mockRejectedValue(new Error("Test error"));

    render(
      <ToolsSection
        tools={mockTools}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
      />
    );

    // Execute tool
    const executeButton = screen.getByTestId("tool-card-execute-button");
    fireEvent.click(executeButton);
    const input = screen.getByTestId("tool-param1-input");
    fireEvent.change(input, { target: { value: "test value" } });
    const modalExecuteButton = screen.getByTestId("modal-execute-button");
    fireEvent.click(modalExecuteButton);

    // Wait for the error message in the execution history
    await waitFor(() => {
      const historyCard = screen.getByTestId("execution-history-card");
      expect(historyCard).toBeInTheDocument();

      const errorSection = within(historyCard).getByTestId(
        "execution-log-error"
      );
      expect(errorSection).toBeInTheDocument();
      expect(within(errorSection).getByText("Error")).toBeInTheDocument();
      expect(within(errorSection).getByText("Test error")).toBeInTheDocument();
    });
  });

  it("validates required parameters", async () => {
    render(
      <ToolsSection
        tools={mockTools}
        onExecuteTool={mockExecuteTool}
        onFetchTools={mockFetchTools}
        hasListToolsCapability={true}
      />
    );

    // Execute tool
    const executeButton = screen.getByTestId("tool-card-execute-button");
    fireEvent.click(executeButton);

    // Try to execute without filling required parameters
    const modalExecuteButton = screen.getByTestId("modal-execute-button");
    fireEvent.click(modalExecuteButton);

    await waitFor(() => {
      expect(screen.getByText("Validation Errors")).toBeInTheDocument();
      const errorMessage = screen.getByText((content) =>
        content.includes("param1: This field is required")
      );
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
