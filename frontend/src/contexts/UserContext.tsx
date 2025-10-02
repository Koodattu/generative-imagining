"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, userApi, cookieManager } from "@/utils/api";

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  initializeUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for existing GUID in cookies
      const existingGuid = cookieManager.getUserGuid();

      // Call identify - backend will return existing user or create new one
      const userData = await userApi.identifyUser(existingGuid);

      // Store the GUID in cookie if we got a new one
      if (userData.guid !== existingGuid) {
        cookieManager.setUserGuid(userData.guid);
      }

      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize user");
      console.error("User initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeUser();
  }, []);

  return <UserContext.Provider value={{ user, loading, error, initializeUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
