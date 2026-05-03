import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/app/notes")({
  component: Notes,
  head: () => ({ meta: [{ title: "Notes — ChatFlow" }] }),
});

interface Note { id: string; title: string; content: string; ai_summary: string | null; updated_at: string; }

function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
    setNotes((data ?? []) as Note[]);
    if (data?.[0] && !active) setActive(data[0] as Note);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("notes").insert({ user_id: user.id, title: "Untitled", content: "" }).select().single();
    if (error) { toast.error(error.message); return; }
    setNotes((p) => [data as Note, ...p]); setActive(data as Note);
  };
  const save = async (n: Note) => {
    setActive(n);
    setNotes((p) => p.map((x) => x.id === n.id ? n : x));
    await supabase.from("notes").update({ title: n.title, content: n.content }).eq("id", n.id);
  };
  const del = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((p) => p.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  };
  const summarize = async () => {
    if (!active) return;
    setSummarizing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-note`;
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: JSON.stringify({ content: active.content }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      const updated = { ...active, ai_summary: j.summary };
      setActive(updated);
      setNotes((p) => p.map((x) => x.id === updated.id ? updated : x));
      await supabase.from("notes").update({ ai_summary: j.summary }).eq("id", active.id);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSummarizing(false); }
  };

  return (
    <div className="mx-auto grid h-[calc(100vh-3.5rem)] max-w-7xl grid-cols-[280px_1fr] gap-0 md:h-screen">
      <aside className="flex flex-col border-r border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="text-sm font-semibold">Notes</h2>
          <Button size="icon" variant="ghost" onClick={create}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.map((n) => (
            <button key={n.id} onClick={() => setActive(n)}
              className={`group flex w-full items-start justify-between gap-2 border-b border-border/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${active?.id === n.id ? "bg-accent" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{n.title || "Untitled"}</div>
                <div className="truncate text-xs text-muted-foreground">{n.content.slice(0, 60) || "No content"}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{format(new Date(n.updated_at), "MMM d, HH:mm")}</div>
              </div>
              <Trash2 className="mt-0.5 h-3.5 w-3.5 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); del(n.id); }} />
            </button>
          ))}
          {notes.length === 0 && <p className="p-4 text-xs text-muted-foreground">No notes yet.</p>}
        </div>
      </aside>
      <main className="flex flex-col overflow-hidden">
        {active ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border p-3">
              <Input value={active.title} onChange={(e) => save({ ...active, title: e.target.value })} className="border-0 bg-transparent text-base font-semibold focus-visible:ring-0" />
              <Button size="sm" variant="outline" onClick={summarize} disabled={summarizing || !active.content}>
                {summarizing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />} Summarise
              </Button>
            </div>
            <div className="grid flex-1 grid-cols-2 overflow-hidden">
              <Textarea value={active.content} onChange={(e) => save({ ...active, content: e.target.value })}
                placeholder="Write in markdown…" className="resize-none rounded-none border-0 border-r border-border bg-background p-4 font-mono text-sm focus-visible:ring-0" />
              <div className="overflow-y-auto p-4 prose prose-sm prose-invert max-w-none dark:prose-invert">
                <ReactMarkdown>{active.content || "*Preview*"}</ReactMarkdown>
                {active.ai_summary && (
                  <Card className="mt-4 border-primary/30 bg-primary/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary"><Sparkles className="h-3 w-3" /> AI Summary</div>
                    <ReactMarkdown>{active.ai_summary}</ReactMarkdown>
                  </Card>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Select or create a note</div>
        )}
      </main>
    </div>
  );
}
