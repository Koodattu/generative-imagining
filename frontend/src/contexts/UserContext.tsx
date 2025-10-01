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
      let existingGuid = cookieManager.getUserGuid();

      // If no GUID exists, generate a new one
      if (!existingGuid) {
        // Generate a new GUID client-side
        existingGuid = crypto.randomUUID();
        cookieManager.setUserGuid(existingGuid);
      }

      // Verify the GUID with the backend (or create user if it doesn't exist)
      try {
        const userData = await userApi.verifyUser(existingGuid);
        setUser(userData);
      } catch {
        // If verification fails, try to identify/create user with this GUID
        try {
          const userData = await userApi.identifyUser(existingGuid);
          setUser(userData);
        } catch (createError) {
          // If both fail, generate a completely new GUID and try again
          const newGuid = crypto.randomUUID();
          cookieManager.setUserGuid(newGuid);
          const userData = await userApi.identifyUser(newGuid);
          setUser(userData);
        }
      }
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
