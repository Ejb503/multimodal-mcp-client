"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { MultimodalLiveAPIClientConnection } from "../lib/multimodal-live-client";
import MultimodalLiveClient from "../lib/multimodal-live-client";
import { ToolCall } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { useAgentRegistry } from "@/features/agent-registry";
import debounce from "lodash/debounce";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
  executeToolAction?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<unknown>;
};

export function useLiveAPI({
  url,
  executeToolAction,
}: MultimodalLiveAPIClientConnection & {
  executeToolAction?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<unknown>;
}): UseLiveAPIResults {
  const { config } = useAgentRegistry();
  const [connectionState, setConnectionState] = useState<{
    client: MultimodalLiveClient | null;
    connected: boolean;
    error: string | null;
  }>({
    client: null,
    connected: false,
    error: null,
  });

  const clientRef = useRef<MultimodalLiveClient | null>(null);
  const [volume, setVolume] = useState(0);

  // Memoize error response creation
  const createErrorResponse = useMemo(
    () => (toolCall: ToolCall, message: string) => ({
      functionResponses: toolCall.functionCalls.map((fc) => ({
        response: { error: message },
        id: fc.id,
      })),
    }),
    []
  );

  // Debounce volume updates
  const debouncedSetVolume = useMemo(
    () => debounce((value: number) => setVolume(value), 50),
    []
  );

  const handleToolCall = useCallback(
    async (toolCall: ToolCall) => {
      console.log(toolCall);
      const currentClient = clientRef.current;
      if (!currentClient) {
        console.error("Cannot execute tool call - no client");
        return;
      }

      if (!executeToolAction) {
        await currentClient.sendToolResponse(
          createErrorResponse(toolCall, "Tool execution not available")
        );
        return;
      }

      try {
        const responses = await Promise.all(
          toolCall.functionCalls.map(async (fc) => {
            const result = await executeToolAction(
              fc.name,
              fc.args as Record<string, unknown>
            );
            return {
              response: { result: JSON.stringify(result) },
              id: fc.id,
            };
          })
        );

        await currentClient.sendToolResponse({
          functionResponses: responses,
        });
      } catch (error) {
        console.error("Tool execution failed:", error);
        await currentClient.sendToolResponse(
          createErrorResponse(toolCall, "Tool execution failed")
        );
      }
    },
    [executeToolAction, createErrorResponse]
  );

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const processingAudioRef = useRef(false);

  // Process audio chunks in batches
  const processAudioQueue = useCallback(async () => {
    if (processingAudioRef.current || !audioStreamerRef.current) return;

    processingAudioRef.current = true;
    const chunks = audioQueueRef.current;
    audioQueueRef.current = [];

    try {
      for (const chunk of chunks) {
        await audioStreamerRef.current.addPCM16(chunk);
      }
    } finally {
      processingAudioRef.current = false;

      // Check if more chunks arrived while processing
      if (audioQueueRef.current.length > 0) {
        requestAnimationFrame(processAudioQueue);
      }
    }
  }, []);

  // Queue audio data instead of processing immediately
  const queueAudioData = useCallback(
    (data: ArrayBuffer) => {
      if (!audioStreamerRef.current) return;

      audioQueueRef.current.push(new Uint8Array(data));
      if (!processingAudioRef.current) {
        requestAnimationFrame(processAudioQueue);
      }
    },
    [processAudioQueue]
  );

  const setupClientListeners = useCallback(
    (client: MultimodalLiveClient) => {
      client
        .on("content", () => {
          // Content handler
        })
        .on("close", (error) => {
          console.error("WebSocket error:", error);
          setConnectionState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : "Connection error",
          }));
        })
        .on("close", () => {
          setConnectionState({
            client: null,
            connected: false,
            error: null,
          });
        })
        .on("toolcall", handleToolCall)
        .on("setupcomplete", () => {
          // Setup complete handler
        })
        .on("interrupted", () => {
          if (audioStreamerRef.current) {
            audioStreamerRef.current.stop();
            audioQueueRef.current = [];
            processingAudioRef.current = false;
          }
        })
        .on("audio", queueAudioData);

      return () => {
        client.removeAllListeners();
        audioQueueRef.current = [];
        processingAudioRef.current = false;
      };
    },
    [handleToolCall, queueAudioData]
  );

  // Clean up debounced function
  useEffect(() => {
    return () => {
      debouncedSetVolume.cancel();
    };
  }, [debouncedSetVolume]);

  const setConnectionStateAndRef = useCallback(
    (
      update: React.SetStateAction<{
        client: MultimodalLiveClient | null;
        connected: boolean;
        error: string | null;
      }>
    ) => {
      setConnectionState((prev) => {
        const newState = typeof update === "function" ? update(prev) : update;
        clientRef.current = newState.client;
        return newState;
      });
    },
    []
  );

  const disconnect = useCallback(async () => {
    const currentClient = clientRef.current;
    if (currentClient) {
      await currentClient.disconnect();
      setConnectionStateAndRef({
        client: null,
        connected: false,
        error: null,
      });
    }
  }, [setConnectionStateAndRef]);

  const connect = useCallback(async () => {
    if (!config) {
      setConnectionStateAndRef((prev) => ({
        ...prev,
        error: "Config has not been set",
      }));
      throw new Error("config has not been set");
    }

    try {
      await disconnect();

      // Resume audio context if it exists
      if (audioStreamerRef.current) {
        await audioStreamerRef.current.resume();
      }

      const newClient = new MultimodalLiveClient({ url });
      clientRef.current = newClient;

      // Set up listeners before connecting
      setupClientListeners(newClient);

      // Now connect
      await newClient.connect(config);

      setConnectionStateAndRef({
        client: newClient,
        connected: true,
        error: null,
      });
    } catch (error) {
      setConnectionStateAndRef({
        client: null,
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      });
      throw error;
    }
  }, [config, setupClientListeners, setConnectionStateAndRef]);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        const ctx = await audioContext();
        const streamer = new AudioStreamer(ctx);
        await streamer.addWorklet(
          "vol-meter",
          VolMeterWorket,
          (event: MessageEvent) => {
            if (event.data && typeof event.data.volume === "number") {
              debouncedSetVolume(event.data.volume);
            }
          }
        );
        await streamer.resume();
        audioStreamerRef.current = streamer;
      } catch (error) {
        console.error("Failed to set up audio:", error);
      }
    };

    setupAudio();

    return () => {
      audioQueueRef.current = [];
      processingAudioRef.current = false;
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
        audioStreamerRef.current = null;
      }
    };
  }, []);

  return {
    ...connectionState,
    connect,
    disconnect,
    volume,
    executeToolAction,
  };
}
