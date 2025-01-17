import { ReactNode } from "react";

export interface AuthContextType {
  isAuthenticated: boolean;
  apiKey: string | null;
  setApiKey: (key: string) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}
