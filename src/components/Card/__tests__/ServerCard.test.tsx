import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ServerCard } from "../ServerCard";

// Mock the Icon component
vi.mock("@iconify/react", () => ({
  Icon: ({
    icon,
    className,
    "data-testid": testId,
  }: {
    icon: string;
    className?: string;
    "data-testid"?: string;
  }) => (
    <div data-testid={testId} className={className} data-icon={icon}>
      {icon}
    </div>
  ),
}));

describe("ServerCard", () => {
  const defaultProps = {
    serverName: "Test Server",
    serverId: "test-123",
    isConnected: true,
  };

  it("renders server name and ID", () => {
    render(<ServerCard {...defaultProps} />);
    expect(screen.getByText("Test Server")).toBeInTheDocument();
    expect(screen.getByText("test-123")).toBeInTheDocument();
  });

  it("shows connected status with primary color", () => {
    render(<ServerCard {...defaultProps} />);
    const icon = screen.getByTestId("server-icon-connected");
    const iconContainer = icon.closest("div.p-2");
    expect(icon).toBeInTheDocument();
    expect(iconContainer).toHaveClass("text-primary");
    expect(icon).toHaveAttribute("data-icon", "solar:server-line-duotone");
  });

  it("shows disconnected status with default color", () => {
    render(<ServerCard {...defaultProps} isConnected={false} />);
    const icon = screen.getByTestId("server-icon-disconnected");
    const iconContainer = icon.closest("div.p-2");
    expect(icon).toBeInTheDocument();
    expect(iconContainer).toHaveClass("text-default-400");
    expect(icon).toHaveAttribute("data-icon", "solar:server-line-duotone");
  });

  it("renders children content", () => {
    render(
      <ServerCard {...defaultProps}>
        <div>Test Content</div>
      </ServerCard>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });
});
