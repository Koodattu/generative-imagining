"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { passwordApi } from "@/utils/api";

interface PasswordContextType {
  password: string | null;
  setPassword: (password: string) => void;
  clearPassword: () => void;
  showPasswordDialog: boolean;
  setShowPasswordDialog: (show: boolean) => void;
  isValidatingPassword: boolean;
  prefillPassword: string | null;
  setPrefillPassword: (password: string | null) => void;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

export function PasswordProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [password, setPasswordState] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isValidatingPassword, setIsValidatingPassword] = useState(true);
  const [prefillPassword, setPrefillPassword] = useState<string | null>(null);

  // Load password from cookies on mount and validate against backend
  useEffect(() => {
    const validateSavedPassword = async () => {
      // Skip password validation for shared pages - they are always public
      if (pathname.startsWith("/shared")) {
        setIsValidatingPassword(false);
        return;
      }

      const savedPassword = document.cookie
        .split("; ")
        .find((row) => row.startsWith("app_password="))
        ?.split("=")[1];

      if (savedPassword) {
        try {
          const data = await passwordApi.validatePassword(savedPassword);
          if (data.valid) {
            setPasswordState(savedPassword);
          } else {
            // Password is no longer valid, clear it and show dialog
            document.cookie = "app_password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            setShowPasswordDialog(true);
          }
        } catch (error) {
          console.error("Error validating saved password:", error);
          // On error, clear and show dialog
          document.cookie = "app_password=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          setShowPasswordDialog(true);
        }
      } else {
        // No saved password, show dialog
        setShowPasswordDialog(true);
      }
      setIsValidatingPassword(false);
    };

    validateSavedPassword();
  }, [pathname]);

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

  return (
    <PasswordContext.Provider
      value={{
        password,
        setPassword,
        clearPassword,
        showPasswordDialog,
        setShowPasswordDialog,
        isValidatingPassword,
        prefillPassword,
        setPrefillPassword,
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (context === undefined) {
    throw new Error("usePassword must be used within a PasswordProvider");
  }
  return context;
}
