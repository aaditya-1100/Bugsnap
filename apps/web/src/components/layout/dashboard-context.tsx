"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { api, clearStoredToken } from "@/lib/api";
import type { User, Workspace } from "@/lib/types";

interface DashboardContextValue {
  user: User | null;
  workspaces: Workspace[];
  loading: boolean;
  refreshWorkspaces: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  user: null,
  workspaces: [],
  loading: true,
  refreshWorkspaces: async () => {},
  refreshUser: async () => {},
});

export function DashboardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = useCallback(async () => {
    const ws = await api.getWorkspaces();
    setWorkspaces(ws);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.getMe();
    setUser(me);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([api.getMe(), api.getWorkspaces()])
      .then(([me, ws]) => {
        if (!active) return;
        setUser(me);
        setWorkspaces(ws);
      })
      .catch(() => {
        clearStoredToken();
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <DashboardContext.Provider
      value={{ user, workspaces, loading, refreshWorkspaces, refreshUser }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
