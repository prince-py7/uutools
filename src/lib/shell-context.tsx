"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ShellContextValue = {
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  requestsOpen: boolean;
  openRequests: () => void;
  closeRequests: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);

  const openComposer = useCallback(() => setComposerOpen(true), []);
  const closeComposer = useCallback(() => setComposerOpen(false), []);
  const openRequests = useCallback(() => setRequestsOpen(true), []);
  const closeRequests = useCallback(() => setRequestsOpen(false), []);

  const value = useMemo(
    () => ({
      composerOpen,
      openComposer,
      closeComposer,
      requestsOpen,
      openRequests,
      closeRequests,
    }),
    [
      composerOpen,
      openComposer,
      closeComposer,
      requestsOpen,
      openRequests,
      closeRequests,
    ]
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within ShellProvider");
  return ctx;
}

export function useShellOptional() {
  return useContext(ShellContext);
}
