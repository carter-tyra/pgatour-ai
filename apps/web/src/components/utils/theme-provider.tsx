"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeName = "light" | "dark" | "system";
type ThemeAttribute = "class" | `data-${string}`;

type ThemeProviderProps = {
  attribute?: ThemeAttribute | ThemeAttribute[];
  children: ReactNode;
  defaultTheme?: ThemeName;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  enableSystem?: boolean;
  forcedTheme?: ThemeName;
  storageKey?: string;
  themes?: ThemeName[];
  value?: Partial<Record<ThemeName, string>>;
};

type ThemeContextValue = {
  forcedTheme?: ThemeName | undefined;
  resolvedTheme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<ThemeName>>;
  systemTheme?: "light" | "dark";
  theme: ThemeName;
  themes: ThemeName[];
};

const DEFAULT_THEMES: ThemeName[] = ["light", "dark"];
const DEFAULT_CONTEXT: ThemeContextValue = {
  resolvedTheme: "dark",
  setTheme: () => undefined,
  theme: "dark",
  themes: DEFAULT_THEMES,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_CONTEXT);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function withoutTransition(callback: () => void) {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;animation:none!important}",
    ),
  );
  document.head.appendChild(style);
  callback();
  window.getComputedStyle(document.body);
  window.setTimeout(() => style.remove(), 1);
}

export function ThemeProvider({
  attribute = "class",
  children,
  defaultTheme = "dark",
  disableTransitionOnChange = false,
  enableColorScheme = true,
  enableSystem = true,
  forcedTheme,
  storageKey = "theme",
  themes = DEFAULT_THEMES,
  value,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");

  const resolvedTheme =
    (forcedTheme ?? theme) === "system" && enableSystem ? systemTheme : (forcedTheme ?? theme);
  const activeTheme = resolvedTheme === "system" ? "dark" : resolvedTheme;

  const setTheme = useCallback<Dispatch<SetStateAction<ThemeName>>>(
    (nextTheme) => {
      setThemeState((currentTheme) => {
        const nextValue = typeof nextTheme === "function" ? nextTheme(currentTheme) : nextTheme;

        try {
          window.localStorage.setItem(storageKey, nextValue);
        } catch {
          // Ignore private-mode storage failures; the in-memory theme still updates.
        }

        return nextValue;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    setSystemTheme(getSystemTheme());

    try {
      const storedTheme = window.localStorage.getItem(storageKey) as ThemeName | null;
      if (storedTheme && [...themes, "system"].includes(storedTheme)) {
        setThemeState(storedTheme);
      }
    } catch {
      // Ignore private-mode storage failures.
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(getSystemTheme());
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [storageKey, themes]);

  useEffect(() => {
    const root = document.documentElement;
    const themeValues = themes.map((themeName) => value?.[themeName] ?? themeName);
    const nextValue = value?.[activeTheme] ?? activeTheme;
    const attributes = Array.isArray(attribute) ? attribute : [attribute];

    const applyTheme = () => {
      for (const nextAttribute of attributes) {
        if (nextAttribute === "class") {
          root.classList.remove(...themeValues);
          root.classList.add(nextValue);
          continue;
        }

        root.setAttribute(nextAttribute, nextValue);
      }

      if (enableColorScheme) {
        root.style.colorScheme = activeTheme;
      }
    };

    if (disableTransitionOnChange) {
      withoutTransition(applyTheme);
      return;
    }

    applyTheme();
  }, [activeTheme, attribute, disableTransitionOnChange, enableColorScheme, themes, value]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      forcedTheme,
      resolvedTheme: activeTheme,
      setTheme,
      systemTheme,
      theme,
      themes: enableSystem ? [...themes, "system"] : themes,
    }),
    [activeTheme, enableSystem, forcedTheme, setTheme, systemTheme, theme, themes],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
