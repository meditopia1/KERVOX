'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'kervox.sidebar.collapsed';

type SidebarPreference = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
};

const SidebarPreferenceContext = createContext<SidebarPreference | null>(null);

export function SidebarPreferenceProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    try {
      setCollapsedState(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true');
    } catch {
      // The sidebar remains usable when browser storage is unavailable.
    }
  }, []);

  const setCollapsed = useCallback((nextCollapsed: boolean) => {
    setCollapsedState(nextCollapsed);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(nextCollapsed));
    } catch {
      // Keep the in-memory preference even when browser storage is unavailable.
    }
  }, []);

  return (
    <SidebarPreferenceContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarPreferenceContext.Provider>
  );
}

export function useSidebarPreference() {
  return useContext(SidebarPreferenceContext);
}
