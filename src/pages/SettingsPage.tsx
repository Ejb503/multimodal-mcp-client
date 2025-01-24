import { Chip, Avatar, Divider } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { AccordionCard } from "@/components/Card/AccordionCard";
import { LlmSection } from "@/features/llm-registry/components/LlmSection";
import { useEffect, useState } from "react";
import { useAgentRegistry } from "@/features/agent-registry";

interface ServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  apiKey?: string;
  metadata?: {
    icon?: string;
    color?: string;
    description?: string;
  };
}

interface McpConfig {
  defaults: {
    serverTypes: Record<
      string,
      {
        icon: string;
        color: string;
        description: string;
      }
    >;
    unconnected: {
      icon: string;
      color: string;
      description: string;
    };
  };
  mcpServers: Record<string, ServerConfig>;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<McpConfig | null>(null);
  const { config: voiceConfig } = useAgentRegistry();

  useEffect(() => {
    // In a real implementation, this would be loaded from your config management system
    fetch("/config/mcp.config.json")
      .then((res) => res.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const renderServerCard = (
    name: string,
    config: ServerConfig,
    type: "mcp" | "sse"
  ) => {
    const getServerIcon = (config: ServerConfig) => {
      return config.metadata?.icon || "solar:server-line-duotone";
    };

    const getServerDescription = (config: ServerConfig) => {
      return config.metadata?.description || "Server configuration";
    };

    return (
      <div className="bg-default-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon={getServerIcon(config)} className="w-5 h-5 text-primary" />
          <div className="flex items-center gap-2 flex-1">
            <p className="text-sm ">{name}</p>
            <Chip
              size="sm"
              variant="flat"
              color={type === "mcp" ? "secondary" : "primary"}
            >
              {type.toUpperCase()}
            </Chip>
          </div>
        </div>
        <p className="text-sm text-default-500 mb-3">
          {getServerDescription(config)}
        </p>
        <div className="bg-default-100 p-3 rounded-md">
          <div className="flex flex-col gap-1">
            {config.command && (
              <>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="solar:command-square-line-duotone"
                    className="w-4 h-4 text-default-600"
                  />
                  <p className="text-xs text-default-600">Command:</p>
                  <code className="text-xs">{config.command}</code>
                </div>
                {config.args && config.args.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Icon
                      icon="solar:settings-line-duotone"
                      className="w-4 h-4 text-default-600 mt-1"
                    />
                    <p className="text-xs text-default-600">Args:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.args.map((arg, i) => (
                        <Chip
                          key={i}
                          size="sm"
                          variant="flat"
                          className="text-xs"
                        >
                          {arg}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {config.url && (
              <div className="flex items-center gap-2">
                <Icon
                  icon="solar:link-line-duotone"
                  className="w-4 h-4 text-default-600"
                />
                <p className="text-xs text-default-600">URL:</p>
                <code className="text-xs">{config.url}</code>
              </div>
            )}
            {config.env && Object.keys(config.env).length > 0 && (
              <div className="flex items-start gap-2 mt-1">
                <Icon
                  icon="solar:key-line-duotone"
                  className="w-4 h-4 text-default-600 mt-1"
                />
                <p className="text-xs text-default-600">Environment:</p>
                <div className="flex flex-col gap-1">
                  {Object.entries(config.env).map(([key, value]) => (
                    <Chip
                      key={key}
                      size="sm"
                      variant="flat"
                      className="text-xs"
                    >
                      {key}:{" "}
                      {key.toLowerCase().includes("token")
                        ? "•••••••••••••"
                        : value}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl ">Settings</h1>

      {/* Voice Config Section */}
      <AccordionCard
        header={
          <div className="flex items-center gap-3">
            <Icon
              icon="solar:microphone-3-line-duotone"
              className="w-6 h-6 text-primary"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-md ">Voice Configuration</p>
                <Chip size="sm" color="primary" variant="dot">
                  System
                </Chip>
              </div>
              <p className="text-small text-default-500">
                Configure voice input and output settings
              </p>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="bg-default-100 p-4 rounded-lg">
            <p className="text-sm">Current voice configuration settings:</p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-md  mb-2">Model Configuration</h3>
              <div className="bg-default-50 p-4 rounded-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="solar:cpu-line-duotone"
                      className="w-4 h-4 text-default-600"
                    />
                    <p className="text-sm ">Model:</p>
                    <code className="text-sm">{voiceConfig.model}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="solar:microphone-3-line-duotone"
                      className="w-4 h-4 text-default-600"
                    />
                    <p className="text-sm ">Voice:</p>
                    <code className="text-sm">
                      {voiceConfig?.generationConfig?.speechConfig?.voiceConfig
                        ?.prebuiltVoiceConfig?.voiceName || "Not configured"}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon
                      icon="solar:chat-square-code-line-duotone"
                      className="w-4 h-4 text-default-600"
                    />
                    <p className="text-sm ">Response Type:</p>
                    <code className="text-sm">
                      {voiceConfig?.generationConfig?.responseModalities ||
                        "Not configured"}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <Divider />

            <div>
              <h3 className="text-md  mb-2">System Instructions</h3>
              <div className="bg-default-50 p-4 rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {voiceConfig?.systemInstruction?.parts[0]?.text ||
                    "No system instructions configured"}
                </pre>
              </div>
            </div>

            <Divider />

            <div>
              <h3 className="text-md  mb-2">Available Tools</h3>
              <div className="bg-default-50 p-4 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {voiceConfig?.tools?.map((tool, index) => (
                    <div key={index} className="flex flex-col gap-1">
                      {Object.keys(tool).map((toolName) => (
                        <Chip
                          key={toolName}
                          size="sm"
                          variant="flat"
                          color="primary"
                        >
                          {toolName}
                        </Chip>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AccordionCard>

      {/* Server Configuration Section */}
      <AccordionCard
        header={
          <div className="flex items-center gap-3">
            <Icon
              icon="solar:server-line-duotone"
              className="w-6 h-6 text-primary"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-md ">Server Configuration</p>
                <Chip size="sm" color="primary" variant="dot">
                  System
                </Chip>
              </div>
              <p className="text-small text-default-500">
                Manage MCP servers and connections
              </p>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="bg-default-100 p-4 rounded-lg">
            <p className="text-sm">
              Server settings are configured in{" "}
              <code className="text-primary">config/mcp.config.json</code>. Edit
              this file to add or modify server configurations. Changes require
              an application restart.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-md  mb-2">Available Servers</h3>
              <div className="flex flex-col gap-2">
                {config &&
                  Object.entries(config.mcpServers).map(
                    ([name, serverConfig]) => (
                      <div key={`server-config-card-${name}`}>
                        {renderServerCard(name, serverConfig, "mcp")}
                      </div>
                    )
                  )}
                {!config && (
                  <div className="bg-default-50 p-4 rounded-lg">
                    <p className="text-sm text-default-500">
                      Loading server configurations...
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Divider />

            <div>
              <h3 className="text-md  mb-2">Server Configuration</h3>
              <p className="text-sm text-default-500 mb-4">
                To add or modify servers, edit the configuration file with your
                server details:
              </p>
              <div className="bg-default-50 p-4 rounded-lg font-mono text-sm">
                <pre className="whitespace-pre-wrap">
                  {`{
  "sse": {
    "serverName": {
      "url": "https://api.example.com",
      "apiKey": "your-api-key"
    }
  },
  "mcpServers": {
    "serverName": {
      "command": "path/to/command",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </AccordionCard>

      {/* LLM Provider Config Section */}
      <LlmSection />

      {/* User Settings Section */}
      <AccordionCard
        header={
          <div className="flex items-center gap-3">
            <Icon
              icon="solar:user-circle-line-duotone"
              className="w-6 h-6 text-primary"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-md ">User Settings</p>
                <Chip size="sm" color="primary" variant="dot">
                  Pro
                </Chip>
              </div>
              <p className="text-small text-default-500">
                Manage your profile and subscription
              </p>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="bg-default-100 p-4 rounded-lg">
            <div className="flex items-center gap-4">
              <Avatar
                isBordered
                size="lg"
                src="https://i.pravatar.cc/150?u=a04258114e29026708c"
              />
              <div className="flex flex-col gap-1">
                <p className="text-md ">John Doe</p>
                <p className="text-small text-default-500">
                  john.doe@example.com
                </p>
              </div>
            </div>
          </div>

          <Divider />

          <div>
            <h3 className="text-md  mb-2">Subscription</h3>
            <p className="text-sm text-default-500 mb-4">
              Manage your subscription plan and billing
            </p>
            <div className="bg-default-50 p-4 rounded-lg">
              <p className="text-sm">Pro Plan - Active</p>
            </div>
          </div>
        </div>
      </AccordionCard>
    </div>
  );
}
