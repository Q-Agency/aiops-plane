import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "am.theme";

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", t === "light");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved =
      (typeof window !== "undefined" && (localStorage.getItem(KEY) as Theme | null)) || "dark";
    setThemeState(saved);
    applyTheme(saved);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    if (typeof window !== "undefined") localStorage.setItem(KEY, t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      if (typeof window !== "undefined") localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle, mounted };
}
