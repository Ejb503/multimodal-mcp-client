"use client";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { NextUIProvider } from "@nextui-org/react";
import { LlmRegistryProvider } from "./features/llm-registry/contexts/LlmRegistryContext";
import { GeminiProvider } from "./providers/gemini/GeminiProvider";
import { GlobalLlmProvider } from "./contexts/LlmProviderContext";
import { McpDataProvider, useMcpData } from "./contexts/McpDataContext";
import { McpProvider } from "./contexts/McpProvider";
import { AgentRegistryProvider } from "./features/agent-registry";
import { LiveAPIProvider } from "./features/multimodal-agent/contexts/LiveAPIContext";
import Layout from "./components/Layout/Layout";
import SettingsPage from "./pages/SettingsPage";
import AgentEditorPage from "./pages/AgentEditorPage";
import AgentGalleryPage from "./pages/AgentGalleryPage";
import LoggerPage from "./pages/LoggerPage";
import { ServerPage } from "./pages/ServerPage";
import { AuthProvider } from "./contexts/AuthContext";
import AuthSplashPage from "./pages/AuthSplashPage";
import ControlPage from "./pages/ControlPage";

function AppContent() {
  const { state } = useMcpData();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <img
            src="/icon.svg"
            alt="Loading"
            className="w-12 h-12 mx-auto animate-pulse"
          />
          <p className="text-default-500">Loading MCP data...</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-danger">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-danger">
            Error loading MCP data: {state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <McpProvider>
      <AgentRegistryProvider>
        <LiveAPIProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/control" replace />} />
              <Route path="/control" element={<ControlPage />} />
              <Route path="/agents" element={<AgentGalleryPage />} />
              <Route path="/agent/create" element={<AgentEditorPage />} />
              <Route path="/agent/edit/:id" element={<AgentEditorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/logs" element={<LoggerPage />} />
              <Route path="/servers/:serverId" element={<ServerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </LiveAPIProvider>
      </AgentRegistryProvider>
    </McpProvider>
  );
}

export default function App() {
  return (
    <NextUIProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthSplashPage />} />
            <Route
              path="/*"
              element={
                <LlmRegistryProvider>
                  <GeminiProvider>
                    <GlobalLlmProvider>
                      <McpDataProvider>
                        <AppContent />
                      </McpDataProvider>
                    </GlobalLlmProvider>
                  </GeminiProvider>
                </LlmRegistryProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </NextUIProvider>
  );
}
