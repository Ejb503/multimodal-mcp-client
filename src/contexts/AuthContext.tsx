import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContextType, AuthProviderProps } from "./AuthContext.types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return import.meta.env.VITE_SYSTEMPROMPT_API_KEY || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (apiKey) {
      setIsAuthenticated(true);
      if (location.pathname === "/auth") {
        navigate("/");
      }
    } else {
      setIsAuthenticated(false);
      if (location.pathname !== "/auth") {
        navigate("/auth");
      }
    }
  }, [apiKey, navigate, location.pathname]);

  const value: AuthContextType = {
    isAuthenticated,
    apiKey,
    setApiKey,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
