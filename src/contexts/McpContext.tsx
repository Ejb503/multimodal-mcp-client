/**
 * This file defines the MCP (Model Context Protocol) React context.
 * The actual implementation is in McpProvider.tsx.
 *
 * @see McpProvider.tsx for the implementation
 */
import { createContext, useContext } from "react";
import type { McpContextType } from "../types/McpContext.types";

// Re-export the types
export type { McpContextType };

// Create the context with a helpful error message if used outside provider
export const McpContext = createContext<McpContextType | null>(null);

/**
 * Hook to access the MCP context.
 * Must be used within an McpProvider.
 *
 * @throws {Error} If used outside of an McpProvider
 */
export function useMcp() {
  const context = useContext(McpContext);
  if (!context) {
    throw new Error(
      "useMcp must be used within McpProvider. " +
        "Make sure you have wrapped your app with <McpProvider>."
    );
  }
  return context;
}

// Re-export the provider from its implementation file
export { McpProvider } from "./McpProvider";
