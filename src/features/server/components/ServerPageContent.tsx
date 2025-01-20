import { ServerCapabilities } from "./sections/ServerCapabilities";
import { ToolsSection } from "./sections/ToolsSection";
import { PromptsSection } from "./sections/PromptsSection";
import { ResourcesSection } from "./sections/ResourcesSection";
import { ServerHeader } from "./sections/ServerHeader";
import { CollapsibleSection } from "@/components/Layout/CollapsibleSection";
import { useServer } from "../hooks/useServer";

interface ServerPageContentProps {
  serverId: string;
  serverName: string;
}

export function ServerPageContent({
  serverId,
  serverName,
}: ServerPageContentProps) {
  const { state, actions } = useServer({ serverId });
  const {
    isConnected,
    isConnecting,
    hasError,
    tools,
    prompts,
    resources,
    hasListToolsCapability,
    hasListPromptsCapability,
    hasListResourcesCapability,
    serverInfo,
  } = state;

  return (
    <div className="p-6 mx-auto">
      <div className="space-y-6">
        <ServerHeader
          serverName={serverName}
          serverId={serverId}
          isConnected={isConnected}
          isConnecting={isConnecting}
          hasError={hasError}
          onConnect={actions.connect}
          onDisconnect={actions.disconnect}
        />

        <ServerCapabilities info={serverInfo} />

        {/* Resources Section */}
        <div className="space-y-4">
          <CollapsibleSection title="Tools" defaultExpanded={false}>
            <ToolsSection
              tools={tools}
              onExecuteTool={actions.executeTool}
              isLoading={isConnecting}
              onFetchTools={actions.fetchTools}
              hasListToolsCapability={hasListToolsCapability}
              error={hasError}
            />
          </CollapsibleSection>

          {hasListPromptsCapability && (
            <CollapsibleSection title="Prompts" defaultExpanded={false}>
              <PromptsSection
                prompts={prompts}
                onExecutePrompt={async (params) => {
                  try {
                    const response = await actions.executePrompt(
                      params.name,
                      params.arguments || {}
                    );
                    return { response };
                  } catch (error) {
                    return {
                      response: "",
                      error:
                        error instanceof Error ? error.message : String(error),
                    };
                  }
                }}
                onGetPromptDetails={actions.getPromptDetails}
                isConnected={isConnected}
                error={hasError ? "Failed to connect to server" : undefined}
              />
            </CollapsibleSection>
          )}

          {hasListResourcesCapability && (
            <CollapsibleSection title="Resources" defaultExpanded={false}>
              <ResourcesSection
                resources={resources}
                onReadResource={actions.readResource}
                isLoading={isConnecting}
                onFetchResources={actions.fetchResources}
                hasListResourcesCapability={hasListResourcesCapability}
                error={hasError}
              />
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
