import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function readStoredTheme(): ThemeMode | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): ThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getCurrentTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const current = document.documentElement.dataset.theme;
  if (isThemeMode(current)) return current;
  return readStoredTheme() ?? getSystemTheme();
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  for (const listener of listeners) listener();
}

/** Applies and persists an explicit user choice. */
export function setTheme(theme: ThemeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (privacy mode); the choice lasts for the page.
  }
  applyTheme(theme);
}

/** Follows the OS theme until the user makes an explicit choice. */
export function followSystemTheme(): () => void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => applyTheme(readStoredTheme() ?? getSystemTheme());
  sync();
  mediaQuery.addEventListener("change", sync);
  return () => mediaQuery.removeEventListener("change", sync);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getCurrentTheme,
    getCurrentTheme,
  );
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  return { theme, toggleTheme } as const;
}
