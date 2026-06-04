import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { probeAgentFn, type ProbeResult } from "@/lib/api/connections.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/connections")({
  head: () => ({ meta: [{ title: "Connections · Agency OS" }] }),
  component: ConnectionsPage,
});

type StoredSystem = { id: string; label: string; baseUrl: string; apiKey?: string; project?: string };

const COOKIE = "aiops_systems";

function readCookie(): StoredSystem[] {
  if (typeof document === "undefined") return [];
  const m = document.cookie.match(/(?:^|;\s*)aiops_systems=([^;]+)/);
  if (!m) return [];
  for (const c of [m[1], safeDecode(m[1])]) {
    try {
      const v = JSON.parse(c);
      if (Array.isArray(v)) return v as StoredSystem[];
    } catch {
      /* try next */
    }
  }
  return [];
}
function writeCookie(list: StoredSystem[]) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(list))}; path=/; max-age=${60 * 60 * 24 * 365}`;
}
function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
}
function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ConnectionsPage() {
  const [list, setList] = useState<StoredSystem[]>([]);
  const [probes, setProbes] = useState<Record<string, ProbeResult | "loading">>({});
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const initial = readCookie();
    setList(initial);
    initial.forEach((s) => void testOne(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function testOne(s: StoredSystem) {
    setProbes((p) => ({ ...p, [s.id]: "loading" }));
    try {
      const r = await probeAgentFn({ data: { url: s.baseUrl, apiKey: s.apiKey } });
      setProbes((p) => ({ ...p, [s.id]: r }));
    } catch {
      setProbes((p) => ({ ...p, [s.id]: { reachable: false, hasCard: false, error: "probe failed" } }));
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const u = url.trim();
    if (!u || adding) return;
    setAdding(true);

    let probe: ProbeResult | null = null;
    try {
      probe = await probeAgentFn({ data: { url: u, apiKey: apiKey.trim() || undefined } });
    } catch {
      /* best-effort; add anyway */
    }

    const base = probe?.id || slugify(name) || slugify(hostOf(u)) || "agent";
    const ids = new Set(list.map((s) => s.id));
    let id = base;
    let n = 1;
    while (ids.has(id)) id = `${base}-${++n}`;

    const entry: StoredSystem = {
      id,
      label: name.trim() || probe?.name || hostOf(u),
      baseUrl: u.replace(/\/+$/, ""),
      apiKey: apiKey.trim() || undefined,
      project: project.trim() || undefined,
    };
    const next = [...list, entry];
    writeCookie(next);
    setList(next);
    if (probe) setProbes((p) => ({ ...p, [id]: probe! }));
    setUrl("");
    setName("");
    setProject("");
    setApiKey("");
    setAdding(false);
  }

  function onRemove(id: string) {
    const next = list.filter((s) => s.id !== id);
    writeCookie(next);
    setList(next);
  }

  return (
    <div className="max-w-3xl space-y-6 p-4 lg:p-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register agent URLs to federate into the live workspace. Stored in a cookie in this
          browser (throwaway) and read server-side by the real-mode views. The API key is optional.
        </p>
      </header>

      <form onSubmit={onAdd} className="glass-panel space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="url">Agent URL</Label>
            <Input
              id="url"
              placeholder="http://localhost:8000"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="name"
              placeholder="auto-discovered from the agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project">
              Project <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="project" placeholder="—" value={project} onChange={(e) => setProject(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="key">
              API key <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="key"
              type="password"
              placeholder="not required yet"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={adding || !url.trim()}>
            {adding ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Adding…
              </>
            ) : (
              <>
                <Plus className="size-4" /> Add agent
              </>
            )}
          </Button>
        </div>
      </form>

      <section className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Connected agents ({list.length})
        </div>
        {list.length === 0 ? (
          <div className="glass-panel p-6 text-center text-sm text-muted-foreground">
            No agents added yet.
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((s) => {
              const pr = probes[s.id];
              return (
                <div key={s.id} className="glass-panel flex items-center gap-3 p-3">
                  <StatusDot pr={pr} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{s.label}</span>
                      {s.project && (
                        <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                          {s.project}
                        </span>
                      )}
                      <span className="rounded border border-border bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {s.id}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{s.baseUrl}</div>
                    <ProbeLine pr={pr} />
                  </div>
                  <button
                    onClick={() => testOne(s)}
                    title="Re-test"
                    className="grid size-8 place-items-center rounded-md border border-border bg-white/5 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={cn("size-3.5", pr === "loading" && "animate-spin")} />
                  </button>
                  <button
                    onClick={() => onRemove(s.id)}
                    title="Remove"
                    className="grid size-8 place-items-center rounded-md border border-border bg-white/5 text-muted-foreground transition-colors hover:border-status-error/50 hover:text-status-error"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusDot({ pr }: { pr?: ProbeResult | "loading" }) {
  if (pr === "loading") return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
  if (!pr) return <span className="size-2.5 shrink-0 rounded-full bg-status-idle" />;
  return pr.reachable ? (
    <CheckCircle2 className="size-4 shrink-0 text-status-done" />
  ) : (
    <XCircle className="size-4 shrink-0 text-status-error" />
  );
}

function ProbeLine({ pr }: { pr?: ProbeResult | "loading" }) {
  if (!pr || pr === "loading") return null;
  if (pr.reachable) {
    return (
      <div className="text-[10px] text-status-done">
        reachable{pr.hasCard ? " · agent card found" : " · health ok (no card yet)"}
      </div>
    );
  }
  return (
    <div className="text-[10px] text-status-error">unreachable{pr.error ? ` · ${pr.error}` : ""}</div>
  );
}
