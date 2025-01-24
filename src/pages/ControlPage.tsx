import { Spinner } from "@nextui-org/react";
import { useMcpData } from "../contexts/McpDataContext";
import { UserInfoCard } from "../components/Card/UserInfoCard";
import { McpServerCard } from "../components/Card/McpServerCard";
import { AvailableServerCard } from "../components/Card/AvailableServerCard";
import { StatusCard } from "../components/Card/StatusCard";
import { GridLayout } from "../components/Layout/GridLayout";
import { Card, CardBody } from "@nextui-org/react";
import { ServerConfig } from "@/types/server.types";

export default function ControlPage() {
  const { state } = useMcpData();
  const user = state.status === "success" ? state.user : null;
  const mcpData = state.status === "success" ? state.mcpData : null;

  if (state.status === "loading") {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (state.status === "error") {
    console.error("ControlPage error:", state.error);
    return (
      <div className="p-6">
        <StatusCard
          status="danger"
          title="Error Loading Data"
          description={state.error.message}
          icon="solar:shield-warning-bold-duotone"
        />
      </div>
    );
  }

  if (!user || !mcpData) {
    return null;
  }

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(user.api_key);
  };

  // All active servers from mcpServers
  const activeServers = Object.entries(mcpData.mcpServers)
    .sort(([keyA], [keyB]) => {
      // Sort by whether they are core servers (have info in available)
      const isCoreA = keyA in mcpData.available;
      const isCoreB = keyB in mcpData.available;
      if (isCoreA === isCoreB) {
        return keyA.localeCompare(keyB);
      }
      // Core servers first
      return isCoreB ? 1 : -1;
    })
    .map(([key, server]) => [
      key,
      {
        command: server.command,
        args: server.args || [],
        env: server.env || {},
        metadata: {
          ...server.metadata,
          serverType: key in mcpData.available ? "core" : "custom",
        },
      },
    ]) as [string, ServerConfig][];

  // Get all available servers that aren't already installed
  const availableServers = Object.entries(mcpData.available)
    .filter(([key]) => !(key in mcpData.mcpServers))
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return (
    <div className="flex flex-col space-y-6">
      <div className="w-full mx-auto p-6">
        <h1 className="text-2xl text-foreground mb-6">MCP Control Center</h1>
        <UserInfoCard
          userId={user.user.name}
          email={user.user.email}
          apiKey={user.api_key}
          roles={user.user.roles}
          onCopyApiKey={handleCopyApiKey}
        />
      </div>

      <div className="mx-auto w-full px-6 space-y-6">
        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Active Servers</h2>
              <span className="text-default-500">
                {activeServers.length} servers active
              </span>
            </div>

            {activeServers.length === 0 ? (
              <StatusCard
                status="warning"
                title="No Active Servers"
                description="There are currently no active MCP servers."
                icon="solar:server-square-line-duotone"
              />
            ) : (
              <div className="flex flex-col space-y-4">
                {activeServers.map(([key, server]) => (
                  <McpServerCard
                    key={key}
                    serverId={key}
                    server={server}
                    availableInfo={mcpData.available[key]}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium">Available Servers</h2>
              <span className="text-default-500">
                {availableServers.length} servers available
              </span>
            </div>
            {availableServers.length === 0 ? (
              <StatusCard
                status="warning"
                title="No Available Servers"
                description="There are currently no available MCP servers."
                icon="solar:server-square-line-duotone"
              />
            ) : (
              <GridLayout
                cols={1}
                gap={4}
                responsive={{
                  md: { cols: 2 },
                  lg: { cols: 3 },
                }}
              >
                {availableServers.map(([key, server]) => (
                  <AvailableServerCard
                    key={key}
                    serverId={key}
                    id={server.id}
                    title={server.title}
                    description={server.description}
                    icon={server.icon}
                    environmentVariables={server.environment_variables}
                    githubLink={server.github_link}
                    npmLink={server.npm_link}
                    isInstalled={false}
                  />
                ))}
              </GridLayout>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center justify-center text-center py-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-6xl">
                <i className="solar:discord-bold-duotone" />
              </div>
              <h2 className="text-xl font-medium">
                Want More Extensions? Having Trouble?
              </h2>
              <div className="space-y-2">
                <p className="text-default-500">
                  Join our Discord community to request extensions, get help,
                  and discuss new features!
                </p>
                <p className="text-default-500">
                  Love the client? See potential? Support our open source
                  development by starring us on GitHub and sharing with others!
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="https://discord.com/invite/wkAbSuPWpr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
                >
                  Join Discord
                </a>
                <a
                  href="https://github.com/Ejb503/multimodal-mcp-client"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-default-100 hover:bg-default-200 px-4 py-2 rounded-lg transition-colors"
                >
                  ⭐ Star on GitHub
                </a>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
