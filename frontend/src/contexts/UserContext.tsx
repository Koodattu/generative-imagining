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

      let userData: User;

      if (existingGuid) {
        // Try to verify existing GUID
        try {
          userData = await userApi.verifyUser(existingGuid);
        } catch {
          // If verification fails, identify user (will create new or find by IP)
          userData = await userApi.identifyUser();
          cookieManager.setUserGuid(userData.guid);
        }
      } else {
        // No existing GUID, identify user
        userData = await userApi.identifyUser();
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
