import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

interface Result { id: string; title: string; type: string; to: string; subtitle?: string }

export function GlobalSearch({ openSignal }: { openSignal: { q: string; n: number } }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (openSignal.n > 0) { setOpen(true); setQ(openSignal.q); }
  }, [openSignal]);

  const run = useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const term = `%${query.toLowerCase()}%`;
    try {
      const [tasks, notes, leads, events, emails, msgs] = await Promise.all([
        supabase.from("tasks").select("id,title,description").ilike("search_text", term).limit(5),
        supabase.from("notes").select("id,title,content").ilike("search_text", term).limit(5),
        supabase.from("leads").select("id,name,company").ilike("search_text", term).limit(5),
        supabase.from("calendar_events").select("id,title,start_time").ilike("search_text", term).limit(5),
        supabase.from("email_drafts").select("id,subject,to_email").ilike("search_text", term).limit(5),
        supabase.from("whatsapp_messages").select("id,original_text,sender").ilike("search_text", term).limit(5),
      ]);
      const r: Result[] = [];
      tasks.data?.forEach((t: any) => r.push({ id: t.id, title: t.title, subtitle: t.description ?? undefined, type: "Task", to: "/app/tasks" }));
      notes.data?.forEach((n: any) => r.push({ id: n.id, title: n.title, subtitle: n.content?.slice(0, 80), type: "Note", to: "/app/notes" }));
      leads.data?.forEach((l: any) => r.push({ id: l.id, title: l.name, subtitle: l.company ?? undefined, type: "Lead", to: "/app/leads" }));
      events.data?.forEach((e: any) => r.push({ id: e.id, title: e.title, subtitle: e.start_time, type: "Event", to: "/app/calendar" }));
      emails.data?.forEach((e: any) => r.push({ id: e.id, title: e.subject ?? "(no subject)", subtitle: e.to_email ?? undefined, type: "Email", to: "/app/emails" }));
      msgs.data?.forEach((m: any) => r.push({ id: m.id, title: m.original_text.slice(0, 80), subtitle: m.sender ?? undefined, type: "Message", to: "/app/whatsapp" }));
      setResults(r);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => run(q), 250); return () => clearTimeout(t); }, [q, run]);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search</span>
        <kbd className="ml-1 hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">⌘K</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Search everything</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Search tasks, notes, leads, messages… (Bengali / Banglish ok)" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {loading && <p className="text-xs text-muted-foreground">Searching…</p>}
            {!loading && q && results.length === 0 && <p className="text-xs text-muted-foreground">No results.</p>}
            {results.map((r) => (
              <button key={r.type + r.id} onClick={() => { setOpen(false); navigate({ to: r.to }); }}
                className="flex w-full items-start justify-between gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-2 text-left hover:bg-accent">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.title}</div>
                  {r.subtitle && <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>}
                </div>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{r.type}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
