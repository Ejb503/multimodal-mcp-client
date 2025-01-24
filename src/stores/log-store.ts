import { create } from "zustand";
import { JSONSchema7 } from "json-schema";

export type LogType = "tool" | "prompt" | "multimodal" | "system";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  operation: string;
  status: "success" | "error" | "info" | "warning";
  name: string;
  params?: JSONSchema7;
  result?: unknown;
  error?: string;
  message?: string;
  count?: number;
}

interface LogStore {
  maxLogs: number;
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  clearLogs: (type?: LogType) => void;
  setMaxLogs: (n: number) => void;
}

const areDuplicateLogs = (
  a: LogEntry,
  b: Omit<LogEntry, "id" | "timestamp">
) => {
  return (
    a.type === b.type &&
    a.operation === b.operation &&
    a.message === b.message &&
    a.name === b.name &&
    JSON.stringify(a.params) === JSON.stringify(b.params)
  );
};

export const useLogStore = create<LogStore>((set) => ({
  maxLogs: 500,
  logs: [],
  addLog: (logEntry) => {
    set((state) => {
      const newLog: LogEntry = {
        ...logEntry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };

      // Find any existing duplicate log
      const duplicateIndex = state.logs.findIndex((log) =>
        areDuplicateLogs(log, logEntry)
      );

      if (duplicateIndex !== -1) {
        // Remove the duplicate and add an updated version at the end
        const existingLog = state.logs[duplicateIndex];
        const updatedLogs = [
          ...state.logs.slice(0, duplicateIndex),
          ...state.logs.slice(duplicateIndex + 1),
          {
            ...existingLog,
            count: (existingLog.count || 1) + 1,
            timestamp: newLog.timestamp,
          },
        ];

        if (updatedLogs.length > state.maxLogs) {
          return { logs: updatedLogs.slice(1) };
        }
        return { logs: updatedLogs };
      }

      const updatedLogs = [...state.logs, newLog];
      if (updatedLogs.length > state.maxLogs) {
        return { logs: updatedLogs.slice(1) };
      }
      return { logs: updatedLogs };
    });
  },
  clearLogs: (type?: LogType) =>
    set((state) => ({
      logs: type ? state.logs.filter((log) => log.type !== type) : [],
    })),
  setMaxLogs: (n: number) =>
    set((state) => {
      if (state.logs.length <= n) {
        return { maxLogs: n };
      }
      return {
        maxLogs: n,
        logs: state.logs.slice(state.logs.length - n),
      };
    }),
}));
