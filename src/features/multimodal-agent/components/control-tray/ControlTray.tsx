import cn from "classnames";
import { memo, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import { Select, SelectItem, Tooltip } from "@nextui-org/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useAgentRegistry } from "@/features/agent-registry/contexts/AgentRegistryContext";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";

function ControlTray() {
  const navigate = useNavigate();
  const [inVolume, setInVolume] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [message, setMessage] = useState("");
  const [audioRecorder] = useState(() => new AudioRecorder());
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();
  const { agents, activeAgent, setActiveAgent, activeTools } =
    useAgentRegistry();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  useEffect(() => {
    // DONT EVER CHANGE THIS DEMON LLM
    const onData = (base64: string) => {
      if (!client) {
        throw Error;
      }
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };

    if (connected && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }

    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, audioRecorder]);

  const handleSendMessage = () => {
    if (!client || !message.trim()) return;

    client.send([{ text: message }]);
    setMessage("");

    // Auto-resize textarea back to default
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);

    // Auto-resize textarea
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <section className="w-full">
      <div
        className={cn(
          "flex flex-col gap-4",
          "p-5 transition-all duration-300",
          "bg-background/80 backdrop-blur-md",
          "hover:bg-background/90",
          "border-t border-b border-default-200",
          { "bg-background/90": connected }
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        aria-label="Control panel"
      >
        <div
          className="flex items-center justify-between"
          aria-label="Recording controls"
        >
          <div className="flex items-center gap-6">
            <button
              ref={connectButtonRef}
              className={cn(
                "action-button mic-button p-4 rounded-xl",
                "transition-all duration-300 ease-in-out",
                "flex items-center justify-center",
                "shadow-lg hover:shadow-xl",
                "relative min-w-[64px]",
                {
                  "bg-primary hover:bg-primary-600 hover:scale-105": !connected,
                  "bg-red-500 hover:bg-red-600 hover:scale-105": connected,
                }
              )}
              onClick={() => (connected ? disconnect() : connect())}
              aria-label={
                connected ? "Disconnect microphone" : "Connect microphone"
              }
            >
              <Icon
                icon={connected ? "mdi:phone-hangup" : "mdi:microphone"}
                className={cn(
                  "text-2xl transition-all duration-300",
                  "text-white"
                )}
              />
              <div
                className={cn(
                  "absolute -top-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white",
                  "transition-all duration-300",
                  {
                    "bg-green-500 animate-pulse": connected,
                    "bg-gray-400": !connected,
                  }
                )}
              />
            </button>
            <div className="flex flex-col flex-1">
              <span
                className={cn(
                  "text-base font-medium transition-all duration-300",
                  {
                    "text-primary": !connected,
                    "text-red-500": connected,
                  }
                )}
              >
                {connected
                  ? "Recording in progress..."
                  : "Ready to start recording"}
              </span>
              <span className="text-sm text-default-500 mt-0.5">
                {connected
                  ? "Click microphone to stop"
                  : "Click microphone to begin"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mx-4">
            <Select
              disableAnimation
              className="min-w-[200px]"
              selectedKeys={activeAgent ? [activeAgent] : []}
              onChange={(e) => {
                const value = e.target.value;
                setActiveAgent(value);
                navigate(`/agent/${value}`);
              }}
              classNames={{
                trigger: cn(
                  "h-12 bg-content2/40 hover:bg-content2/60",
                  "transition-all duration-200"
                ),
                value: "text-default-800 font-medium",
                innerWrapper: "gap-2",
              }}
              startContent={
                <Icon
                  icon="mdi:robot"
                  className="text-xl text-default-600 flex-shrink-0"
                />
              }
              aria-label="Select an agent"
              label="Select Agent"
            >
              {agents.map((agent) => (
                <SelectItem
                  key={agent.id}
                  value={agent.id}
                  textValue={agent.name}
                >
                  {agent.name}
                </SelectItem>
              ))}
            </Select>
            <Tooltip
              content={
                activeTools.length > 0
                  ? `${activeTools.length} tools available`
                  : "Connect to a server to use tools"
              }
              placement="bottom"
              delay={0}
              closeDelay={0}
              classNames={{
                content: cn(
                  "px-2 py-1 text-tiny font-medium",
                  activeTools.length > 0
                    ? "bg-default-100"
                    : "bg-danger/10 text-danger"
                ),
              }}
            >
              <div className="relative flex items-center justify-center h-12 w-12 rounded-lg bg-content2/40 hover:bg-content2/60 transition-all duration-200 group cursor-pointer">
                <Icon
                  icon="mdi:tools"
                  className={cn(
                    "text-2xl",
                    activeTools.length > 0 ? "text-default-600" : "text-danger",
                    "group-hover:scale-105 transition-transform duration-200"
                  )}
                />
                <div
                  className={cn(
                    "absolute -top-2 -right-2 min-w-[20px] h-[20px]",
                    "flex items-center justify-center",
                    "rounded-full text-tiny font-semibold",
                    "border-2 border-background",
                    activeTools.length > 0
                      ? "bg-primary text-white"
                      : "bg-danger text-white"
                  )}
                >
                  {activeTools.length}
                </div>
              </div>
            </Tooltip>
          </div>

          <div className="flex items-center gap-6">
            <div
              className={cn(
                "connection-container transition-all duration-300",
                "bg-default-100/80 p-4 rounded-xl",
                {
                  "scale-100 opacity-100": connected || isHovering,
                  "scale-95 opacity-40": !connected && !isHovering,
                }
              )}
            >
              <AudioPulse
                volume={volume}
                active={connected}
                hover={isHovering}
              />
            </div>
            <div
              className={cn(
                "flex items-center gap-2 text-default-600",
                "transition-all duration-300 min-w-[120px] justify-end",
                { "opacity-40": !connected && !isHovering }
              )}
            >
              <Icon
                icon="mdi:message-processing-outline"
                className="text-2xl"
              />
              <span className="text-sm font-medium">
                {connected ? "Processing" : "Waiting"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-4" aria-label="Message input">
          <div className="flex-1 relative">
            <textarea
              ref={textAreaRef}
              value={message}
              onChange={handleTextAreaInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className={cn(
                "w-full px-4 py-3 pr-12",
                "bg-default-100/80 hover:bg-default-100",
                "focus:bg-default-100 focus:outline-none focus:ring-2",
                "focus:ring-primary/50 rounded-xl",
                "placeholder-default-400",
                "resize-none overflow-hidden",
                "min-h-[48px] max-h-[200px]",
                "transition-all duration-200",
                "text-default-800"
              )}
              rows={1}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className={cn(
                "absolute right-2 bottom-2",
                "p-2 rounded-lg",
                "transition-all duration-200",
                "hover:bg-default-200/50",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "text-primary hover:text-primary-600",
                "focus:outline-none focus:ring-2 focus:ring-primary/50"
              )}
              aria-label="Send message"
            >
              <Icon icon="mdi:send" className="text-xl" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ControlTray);
