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
import { McpDataProvider } from "./contexts/McpDataContext";
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
                        <McpProvider>
                          <AgentRegistryProvider>
                            <LiveAPIProvider>
                              <Layout>
                                <Routes>
                                  <Route
                                    path="/"
                                    element={<Navigate to="/control" replace />}
                                  />
                                  <Route
                                    path="/control"
                                    element={<ControlPage />}
                                  />
                                  <Route
                                    path="/agents"
                                    element={<AgentGalleryPage />}
                                  />
                                  <Route
                                    path="/agent/create"
                                    element={<AgentEditorPage />}
                                  />
                                  <Route
                                    path="/agent/edit/:id"
                                    element={<AgentEditorPage />}
                                  />
                                  <Route
                                    path="/settings"
                                    element={<SettingsPage />}
                                  />
                                  <Route
                                    path="/logs"
                                    element={<LoggerPage />}
                                  />
                                  <Route
                                    path="/servers/:serverId"
                                    element={<ServerPage />}
                                  />
                                  <Route
                                    path="*"
                                    element={<Navigate to="/" replace />}
                                  />
                                </Routes>
                              </Layout>
                            </LiveAPIProvider>
                          </AgentRegistryProvider>
                        </McpProvider>
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
