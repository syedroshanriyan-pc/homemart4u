"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface UserAddress {
  id: string;
  label: string;
  addressLine: string;
  locality: string;
  city: string;
  postalCode?: string | null;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN" | "DELIVERY_AGENT" | "ORDER_MANAGER";
  addresses?: UserAddress[];
  deliveryProfile?: any;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isNetworkError: boolean;
  selectedAddress: UserAddress | null;
  setSelectedAddress: (addr: UserAddress | null) => void;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  register: (data: any) => Promise<{ success: boolean; error?: string; user?: any }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isNetworkError: false,
  selectedAddress: null,
  setSelectedAddress: () => {},
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  deleteAccount: async () => ({ success: false }),
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);

  // In-flight guard: prevent concurrent duplicate refreshUser requests
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);

  const refreshUser = useCallback(async () => {
    if (inFlightPromiseRef.current) {
      return inFlightPromiseRef.current;
    }

    const task = (async () => {
      try {
        const data = await apiClient.get<{ user: UserProfile | null }>("/api/auth/me", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        setUser(data.user || null);
        setIsNetworkError(false);
        if (data.user?.addresses?.length) {
          const defaultAddr =
            data.user.addresses.find((a: UserAddress) => a.isDefault) || data.user.addresses[0];
          setSelectedAddress((prev) => prev || defaultAddr);
        }
      } catch (err: any) {
        if (err.status === 401) {
          // Confirmed unauthenticated session
          setUser(null);
          setIsNetworkError(false);
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("fc_token");
            } catch {}
          }
        } else {
          // 5xx Server error or network error: preserve current user session, mark network issue
          console.warn("Session check network interruption:", err);
          setIsNetworkError(true);
        }
      } finally {
        setLoading(false);
        inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = task;
    return task;
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("fc_token");
        if (stored && !document.cookie.includes("fc_token=")) {
          const isHttps = window.location.protocol === "https:";
          document.cookie = `fc_token=${stored}; path=/; max-age=604800; SameSite=Lax; ${isHttps ? "Secure;" : ""}`;
        }
      } catch {}
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, pass: string) => {
    try {
      const data = await apiClient.post("/api/auth/login", { identifier, password: pass });
      setUser(data.user);
      setIsNetworkError(false);
      if (data.token && typeof window !== "undefined") {
        try {
          localStorage.setItem("fc_token", data.token);
          const isHttps = window.location.protocol === "https:";
          document.cookie = `fc_token=${data.token}; path=/; max-age=604800; SameSite=Lax; ${isHttps ? "Secure;" : ""}`;
        } catch {}
      }
      if (data.user?.addresses?.length) {
        setSelectedAddress(data.user.addresses[0]);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "Login failed" };
    }
  };

  const register = async (regData: any) => {
    try {
      const data = await apiClient.post("/api/auth/register", regData);
      setUser(data.user);
      setIsNetworkError(false);
      if (data.token && typeof window !== "undefined") {
        try {
          localStorage.setItem("fc_token", data.token);
          const isHttps = window.location.protocol === "https:";
          document.cookie = `fc_token=${data.token}; path=/; max-age=604800; SameSite=Lax; ${isHttps ? "Secure;" : ""}`;
        } catch {}
      }
      if (data.user?.addresses?.length) {
        setSelectedAddress(data.user.addresses[0]);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || "Registration failed" };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Ignore network failure on logout
    } finally {
      setUser(null);
      setSelectedAddress(null);
      setIsNetworkError(false);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("fc_token");
          document.cookie = "fc_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
        } catch {}
      }
    }
  };

  const deleteAccount = async () => {
    try {
      await apiClient.delete("/api/auth/delete-account");
      setUser(null);
      setSelectedAddress(null);
      setIsNetworkError(false);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("fc_token");
          localStorage.removeItem("fresh-chicken-cart-v1");
          localStorage.removeItem("fc_user_session");
        } catch {}
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error during account deletion." };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isNetworkError,
        selectedAddress,
        setSelectedAddress,
        login,
        register,
        logout,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
