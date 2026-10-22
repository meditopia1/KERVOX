'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const APPEARANCE_STORAGE_KEY = 'kervox.appearance.theme';

export type AppTheme = 'claude' | 'black' | 'blue' | 'red';

const themes: AppTheme[] = ['claude', 'black', 'blue', 'red'];

export function isAppTheme(value: string | null): value is AppTheme {
  return themes.some((theme) => theme === value);
}

function normalizeTheme(value: string | null): AppTheme {
  return value === 'green' ? 'red' : isAppTheme(value) ? value : 'claude';
}

type AppearanceContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('claude');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
      const next = normalizeTheme(saved);
      setThemeState(next);
      document.documentElement.dataset.kervoxTheme = next;
      if (saved === 'green') window.localStorage.setItem(APPEARANCE_STORAGE_KEY, 'red');
    } catch {
      // The current session can still change theme when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY) {
        const next = normalizeTheme(event.newValue);
        setThemeState(next);
        document.documentElement.dataset.kervoxTheme = next;
        if (event.newValue === 'green') {
          try {
            window.localStorage.setItem(APPEARANCE_STORAGE_KEY, 'red');
          } catch {
            // The in-memory preference still updates if storage is blocked.
          }
        }
      }
    };
    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    document.documentElement.dataset.kervoxTheme = next;
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      // Keep the preference for this session when storage is unavailable.
    }
  }, []);

  return <AppearanceContext.Provider value={{ theme, setTheme }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside AppearanceProvider');
  return context;
}
