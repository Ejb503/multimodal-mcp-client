import { Content, GenerativeContentBlob, Part } from "@google/generative-ai";
import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";
import {
  ClientContentMessage,
  isInterrupted,
  isModelTurn,
  isServerContentMessage,
  isSetupCompleteMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isTurnComplete,
  LiveIncomingMessage,
  ModelTurn,
  RealtimeInputMessage,
  ServerContent,
  SetupMessage,
  ToolCall,
  ToolCallCancellation,
  ToolResponseMessage,
  type LiveConfig,
} from "../../../types/multimodal-live-types";
import { blobToJSON, base64ToArrayBuffer } from "./utils";
import { useLogStore } from "@/stores/log-store";

/**
 * the events that this client will emit
 */
interface MultimodalLiveClientEventTypes {
  open: () => void;
  close: (event: CloseEvent) => void;
  audio: (data: ArrayBuffer) => void;
  content: (data: ServerContent) => void;
  interrupted: () => void;
  setupcomplete: () => void;
  turncomplete: () => void;
  toolcall: (toolCall: ToolCall) => void;
  toolcallcancellation: (toolcallCancellation: ToolCallCancellation) => void;
}

export type MultimodalLiveAPIClientConnection = {
  url: string;
};

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
export class MultimodalLiveClient extends EventEmitter<MultimodalLiveClientEventTypes> {
  public ws: WebSocket | null = null;
  protected config: LiveConfig | null = null;
  public url: string = "";
  private logStore = useLogStore.getState();

  public getConfig() {
    return { ...this.config };
  }

  constructor({ url }: MultimodalLiveAPIClientConnection) {
    super();
    this.url = url;
    this.send = this.send.bind(this);
  }

  log(
    operation: string,
    message: unknown,
    status: "success" | "error" | "info" | "warning" = "info"
  ) {
    this.logStore.addLog({
      type: "multimodal",
      operation,
      status,
      name: "Multimodal Client",
      message: message ? JSON.stringify(message) : undefined,
    });
  }

  connect(config: LiveConfig): Promise<boolean> {
    this.config = config;

    const ws = new WebSocket(this.url);
    ws.addEventListener("message", async (evt: MessageEvent) => {
      if (evt.data instanceof Blob) {
        this.receive(evt.data);
      }
    });
    return new Promise((resolve, reject) => {
      const onError = () => {
        this.disconnect(ws);
        const message = `Could not connect to "${this.url}"`;
        this.log("Connection Error", message, "error");
        reject(new Error(message));
      };
      ws.addEventListener("error", onError);
      ws.addEventListener("open", () => {
        if (!this.config) {
          reject("Invalid config sent to `connect(config)`");
          return;
        }
        this.log("Connection Open", `connected to socket`, "success");
        this.emit("open");

        this.ws = ws;

        const setupMessage: SetupMessage = {
          setup: this.config,
        };
        this._sendDirect(setupMessage);
        this.log("Setup", setupMessage);

        ws.removeEventListener("error", onError);
        ws.addEventListener("close", (ev: CloseEvent) => {
          this.disconnect(ws);
          let reason = ev.reason || "";
          if (reason.toLowerCase().includes("error")) {
            const prelude = "ERROR]";
            const preludeIndex = reason.indexOf(prelude);
            if (preludeIndex > 0) {
              reason = reason.slice(
                preludeIndex + prelude.length + 1,
                Infinity
              );
            }
          }
          this.log(
            "Connection Close",
            `disconnected ${reason ? `with reason: ${reason}` : ``}`,
            reason ? "error" : "info"
          );
          this.emit("close", ev);
        });
        resolve(true);
      });
    });
  }

  disconnect(ws?: WebSocket) {
    // could be that this is an old websocket and theres already a new instance
    // only close it if its still the correct reference
    if ((!ws || this.ws === ws) && this.ws) {
      this.ws.close();
      this.ws = null;
      this.log("Disconnect", "Disconnected");
      return true;
    }
    return false;
  }

  protected async receive(blob: Blob) {
    try {
      const response: LiveIncomingMessage = (await blobToJSON(
        blob
      )) as LiveIncomingMessage;

      if (isToolCallMessage(response)) {
        this.log("Tool Call", response, "info");
        this.emit("toolcall", response.toolCall);
        return;
      }

      if (isToolCallCancellationMessage(response)) {
        this.log("Tool Call Cancellation", response, "warning");
        this.emit("toolcallcancellation", response.toolCallCancellation);
        return;
      }

      if (isSetupCompleteMessage(response)) {
        this.log("Setup Complete", response, "success");
        this.emit("setupcomplete");
        return;
      }

      if (isServerContentMessage(response)) {
        const { serverContent } = response;

        if (isModelTurn(serverContent)) {
          let parts: Part[] = serverContent.modelTurn.parts;

          const audioParts = parts.filter(
            (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")
          );

          const base64s = audioParts.map((p) => p.inlineData?.data);
          const otherParts = difference(parts, audioParts);

          base64s.forEach((b64) => {
            if (b64) {
              const data = base64ToArrayBuffer(b64);
              this.emit("audio", data);
            }
          });

          if (!otherParts.length) {
            return;
          }

          parts = otherParts;
          const content: ModelTurn = { modelTurn: { parts } };
          this.emit("content", content);
          this.log("Server Content", response);
        }

        if (isInterrupted(serverContent)) {
          this.log("Interrupted", response, "warning");
          this.emit("interrupted");
          return;
        }
        if (isTurnComplete(serverContent)) {
          this.log("Turn Complete", response, "success");
          this.emit("turncomplete");
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
      this.log("Message Processing Error", error, "error");
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: GenerativeContentBlob[]) {
    let hasAudio = false;
    let hasVideo = false;
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      if (ch.mimeType.includes("audio")) {
        hasAudio = true;
      }
      if (ch.mimeType.includes("image")) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
    }

    const data: RealtimeInputMessage = {
      realtimeInput: {
        mediaChunks: chunks,
      },
    };
    this._sendDirect(data);
    this.log(
      "Realtime Input",
      hasAudio && hasVideo ? "audio + video" : hasAudio ? "audio" : "video"
    );
  }

  /**
   *  send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: ToolResponseMessage["toolResponse"]) {
    const message: ToolResponseMessage = {
      toolResponse,
    };

    this._sendDirect(message);
    this.log("Tool Response", message);
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: Part | Part[], turnComplete: boolean = true) {
    parts = Array.isArray(parts) ? parts : [parts];
    const content: Content = {
      role: "user",
      parts,
    };

    const clientContentRequest: ClientContentMessage = {
      clientContent: {
        turns: [content],
        turnComplete,
      },
    };

    this._sendDirect(clientContentRequest);
    this.log("Client Content", clientContentRequest);
  }

  /**
   *  used internally to send all messages
   *  don't use directly unless trying to send an unsupported message type
   */
  _sendDirect(request: object) {
    if (!this.ws) {
      throw new Error("WebSocket is not connected");
    }
    const str = JSON.stringify(request);
    this.ws.send(str);
  }
}

export default MultimodalLiveClient;
