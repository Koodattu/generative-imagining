"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PasswordContextType {
  password: string | null;
  setPassword: (password: string) => void;
  clearPassword: () => void;
  showPasswordDialog: boolean;
  setShowPasswordDialog: (show: boolean) => void;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export function PasswordProvider({ children }: { children: ReactNode }) {
  const [password, setPasswordState] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Load password from cookies on mount
  useEffect(() => {
    const savedPassword = document.cookie
      .split("; ")
      .find((row) => row.startsWith("app_password="))
      ?.split("=")[1];

    if (savedPassword) {
      setPasswordState(savedPassword);
    }
  }, []);

  const setPassword = (pwd: string) => {
    setPasswordState(pwd);
    // Save to cookie (expires in 7 days)
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    document.cookie = `app_password=${pwd}; expires=${expires.toUTCString()}; path=/`;
  };

  const clearPassword = () => {
    setPasswordState(null);
    document.cookie = "app_password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  return <PasswordContext.Provider value={{ password, setPassword, clearPassword, showPasswordDialog, setShowPasswordDialog }}>{children}</PasswordContext.Provider>;
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error("usePassword must be used within a PasswordProvider");
  }
  return context;
}
