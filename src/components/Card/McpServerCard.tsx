import { ServerDetails } from "@/features/server/components/sections/ServerDetails";
import { useMcp } from "@/contexts/McpContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Chip } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import type { ServerControlData } from "@/types/server";
import { SystempromptModule } from "@/types/systemprompt";

interface McpServerCardProps {
  serverId: string;
  server: ServerControlData;
  availableInfo?: SystempromptModule;
  className?: string;
}

/**
 * McpServerCard displays MCP server information in a standardized card layout
 * It handles both server control (connection management) and display of server details
 */
export function McpServerCard({
  serverId,
  server,
  availableInfo,
  className = "",
}: McpServerCardProps) {
  const navigate = useNavigate();
  const { clients, connectServer, disconnectServer } = useMcp();
  const clientState = clients[serverId];
  const isConnected = clientState?.connectionStatus === "connected";
  const isConnecting = clientState?.connectionStatus === "pending";
  const [isExpanded, setIsExpanded] = useState(false);
  const isCustomModule = !availableInfo;

  const handleConnect = async () => {
    await connectServer(serverId);
  };

  const handleDisconnect = async () => {
    await disconnectServer(serverId);
  };

  const toggleExpand = () => {
    if (isCustomModule) return;
    setIsExpanded(!isExpanded);
  };

  const handleGoToServer = () => {
    navigate(`/servers/${serverId}`);
  };

  return (
    <div
      className={`${className} relative bg-content1 rounded-large shadow-small border border-divider transition-colors ${
        !isCustomModule ? "hover:border-primary" : ""
      }`}
    >
      <div className="flex justify-between items-start p-4">
        <div className="flex-grow">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-medium bg-default-100 ${
                isCustomModule ? "text-warning" : "text-primary"
              }`}
            >
              <Icon
                icon={
                  server.metadata?.icon ||
                  availableInfo?.icon ||
                  "solar:server-bold-duotone"
                }
                className="text-xl"
              />
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h3 className="text-lg ">{availableInfo?.title || serverId}</h3>
                <Chip
                  size="sm"
                  variant="flat"
                  color={isCustomModule ? "warning" : "success"}
                  className="h-5"
                >
                  {isCustomModule ? "Custom" : "Core"}
                </Chip>
              </div>
              <p className="text-sm text-default-500">{serverId}</p>
              {server.metadata?.description && (
                <p className="text-sm text-default-500 mt-1">
                  {server.metadata.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {!isCustomModule && (
            <Button
              isIconOnly
              variant="light"
              className="text-default-500"
              onClick={toggleExpand}
            >
              <Icon icon="solar:info-circle-bold-duotone" className="text-xl" />
            </Button>
          )}
          {isConnected ? (
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onClick={handleDisconnect}
              startContent={<Icon icon="solar:close-circle-bold-duotone" />}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              color="success"
              variant="flat"
              size="sm"
              onClick={handleConnect}
              isLoading={isConnecting}
              startContent={
                !isConnecting && <Icon icon="solar:play-circle-bold-duotone" />
              }
            >
              Connect
            </Button>
          )}
          <Button
            isIconOnly
            color="primary"
            variant="flat"
            size="sm"
            onClick={handleGoToServer}
            className="min-w-unit-8 w-unit-8 h-unit-8"
          >
            <Icon
              icon="solar:arrow-right-up-line-duotone"
              className="text-lg"
            />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && availableInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-divider">
              <ServerDetails {...availableInfo} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
