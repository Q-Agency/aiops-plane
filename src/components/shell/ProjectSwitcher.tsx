import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { getProjectsFn } from "@/lib/api/fleet.functions";

// Real-mode project switcher. Projects are DERIVED from the fleet's runs (no
// project registry). Selection is stored in the `aiops_project` cookie, read
// server-side by the gateway to scope runs.

const COOKIE = "aiops_project";
function readProjectCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)aiops_project=([^;]+)/);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
function writeProjectCookie(id: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

export function ProjectSwitcher() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const projects = useQuery({ queryKey: ["fleet", "projects"], queryFn: () => getProjectsFn() });

  useEffect(() => {
    setSelected(readProjectCookie());
  }, []);

  async function onChange(id: string) {
    setSelected(id);
    writeProjectCookie(id);
    await router.invalidate(); // re-run loaders → gateway re-reads the cookie
  }

  const opts = projects.data ?? [];

  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
      <select
        value={selected}
        onChange={(e) => void onChange(e.target.value)}
        title="Scope the workspace to a project"
        className="h-9 cursor-pointer appearance-none rounded-md border border-border bg-white/5 pl-7 pr-8 text-sm font-medium transition-colors hover:border-primary/40 focus:outline-none"
      >
        <option value="">All projects</option>
        {opts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.count}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
    </div>
  );
}
