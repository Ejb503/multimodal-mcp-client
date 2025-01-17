import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { McpProvider } from "../../../../contexts/McpProvider";
import { useContext } from "react";
import { McpContext } from "../../../../contexts/McpContext";
import React from "react";

const TestComponent = () => {
  const context = useContext(McpContext);
  if (!context) return null;
  return (
    <div>
      <div>Active Clients: {context.activeClients.join(", ")}</div>
      <div>
        Connection Status: {context.clients.testServer?.connectionStatus}
      </div>
    </div>
  );
};

// Mock the hooks used by McpProvider
vi.mock("../../../../hooks/useMcpClient", () => ({
  useMcpClient: () => ({
    clients: {},
    activeClients: [],
    updateClientState: vi.fn(),
    setupClientNotifications: vi.fn(),
  }),
}));

vi.mock("../../../../hooks/useMcpConnection", () => ({
  useMcpConnection: () => ({
    connectServer: vi.fn(),
    disconnectServer: vi.fn(),
  }),
}));

describe("McpProvider", () => {
  it("renders children", () => {
    render(
      <McpProvider>
        <div>Test Child</div>
      </McpProvider>
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("initializes with empty state", () => {
    render(
      <McpProvider>
        <TestComponent />
      </McpProvider>
    );

    expect(screen.getByText(/^Active Clients:$/)).toBeInTheDocument();
    expect(screen.getByText(/^Connection Status:$/)).toBeInTheDocument();
  });
});
