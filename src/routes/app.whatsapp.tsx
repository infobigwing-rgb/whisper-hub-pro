import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/whatsapp")({
  component: WhatsappImport,
  head: () => ({ meta: [{ title: "WhatsApp Import — ChatFlow" }] }),
});

interface ParsedRow { sender: string; sent_at: string | null; text: string; }
interface AIResult {
  index: number; category: "task" | "note" | "email" | "event" | "lead" | "skip";
  title: string; description?: string; due_date?: string | null; priority?: "low" | "medium" | "high";
  to_email?: string | null; subject?: string | null; body?: string | null;
  start_time?: string | null; end_time?: string | null; lead_name?: string | null; score?: number | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  task: "bg-info/15 text-info border-info/30",
  note: "bg-muted text-muted-foreground border-border",
  email: "bg-warning/15 text-warning border-warning/30",
  event: "bg-primary/15 text-primary border-primary/30",
  lead: "bg-success/15 text-success border-success/30",
  skip: "bg-muted/40 text-muted-foreground/60 border-border",
};

function parseTimestamp(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  // try whatsapp formats e.g. "12/05/2024, 14:30" or "12/05/24 14:30"
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[,\s]+(\d{1,2}):(\d{2})/);
  if (m) {
    const [, dd, mm, yy, hh, mi] = m;
    const year = yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy);
    const dt = new Date(year, parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(mi));
    if (!isNaN(dt.getTime())) return dt.toISOString();
  }
  return null;
}

function WhatsappImport() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [filename, setFilename] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AIResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = (file: File) => {
    setFilename(file.name);
    setResults([]); setDone(false);
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: ParsedRow[] = data.slice(0, 500).map((r) => {
          const keys = Object.keys(r).reduce<Record<string, string>>((a, k) => { a[k.toLowerCase().trim()] = r[k]; return a; }, {});
          const sender = keys.sender || keys.from || keys.author || keys.name || "Unknown";
          const ts = keys.timestamp || keys.date || keys.time || keys.datetime || "";
          const text = keys.message || keys.text || keys.content || keys.msg || "";
          return { sender: String(sender).trim(), sent_at: parseTimestamp(String(ts)), text: String(text).trim() };
        }).filter((r) => r.text.length > 0);
        setRows(parsed);
        if (parsed.length === 0) toast.error("No messages found. CSV must have columns: Timestamp, Sender, Message.");
        else toast.success(`Parsed ${parsed.length} messages`);
      },
      error: (err) => toast.error(err.message),
    });
  };

  const analyze = async () => {
    if (!rows.length) return;
    setAnalyzing(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-analyze`;
      // chunk by 50
      const chunks: ParsedRow[][] = [];
      for (let i = 0; i < rows.length; i += 50) chunks.push(rows.slice(i, i + 50));
      const all: AIResult[] = [];
      let offset = 0;
      for (const chunk of chunks) {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ messages: chunk.map((m, i) => ({ id: String(offset + i), sender: m.sender, sent_at: m.sent_at, text: m.text })) }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          if (r.status === 429) { toast.error("Rate limit. Please wait a moment."); break; }
          if (r.status === 402) { toast.error(j.error || "AI credits exhausted."); break; }
          throw new Error(j.error || `Analyze failed: ${r.status}`);
        }
        const { results: chunkRes } = await r.json();
        for (const cr of chunkRes as AIResult[]) all.push({ ...cr, index: cr.index + offset });
        offset += chunk.length;
        setResults([...all]);
      }
      toast.success(`Categorized ${all.length} messages`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyze failed");
    } finally { setAnalyzing(false); }
  };

  const importAll = async () => {
    if (!user || !results.length) return;
    setImporting(true);
    try {
      const { data: upload, error: upErr } = await supabase
        .from("whatsapp_uploads")
        .insert({ user_id: user.id, filename, message_count: rows.length })
        .select().single();
      if (upErr) throw upErr;

      // insert all messages, get back ids
      const msgRows = rows.map((r, i) => {
        const ai = results.find((x) => x.index === i);
        return {
          user_id: user.id, upload_id: upload.id,
          sender: r.sender, sent_at: r.sent_at, original_text: r.text,
          ai_category: ai?.category ?? "skip", ai_extracted_data: (ai as any) ?? null, status: "imported",
        };
      });
      const { data: msgs, error: mErr } = await supabase.from("whatsapp_messages").insert(msgRows).select("id");
      if (mErr) throw mErr;

      const tasks: any[] = [], notes: any[] = [], events: any[] = [], emails: any[] = [], leads: any[] = [];
      results.forEach((ai) => {
        const msgId = msgs?.[ai.index]?.id;
        const base = { user_id: user.id, source_message_id: msgId };
        if (ai.category === "task") tasks.push({ ...base, title: ai.title.slice(0, 200), description: ai.description, priority: ai.priority || "medium", due_date: ai.due_date || null });
        else if (ai.category === "note") notes.push({ ...base, title: ai.title.slice(0, 200), content: ai.description || ai.title });
        else if (ai.category === "event" && ai.start_time) events.push({ ...base, title: ai.title.slice(0, 200), description: ai.description, start_time: ai.start_time, end_time: ai.end_time });
        else if (ai.category === "email") emails.push({ ...base, to_email: ai.to_email, subject: ai.subject || ai.title.slice(0, 200), body_markdown: ai.body || ai.description });
        else if (ai.category === "lead") leads.push({ user_id: user.id, name: ai.lead_name || ai.title.slice(0, 200), notes: ai.description, ai_score: ai.score ?? 50, stage: "lead" });
      });

      const ops: Promise<any>[] = [];
      if (tasks.length) ops.push(Promise.resolve(supabase.from("tasks").insert(tasks)));
      if (notes.length) ops.push(Promise.resolve(supabase.from("notes").insert(notes)));
      if (events.length) ops.push(Promise.resolve(supabase.from("calendar_events").insert(events)));
      if (emails.length) ops.push(Promise.resolve(supabase.from("email_drafts").insert(emails)));
      if (leads.length) ops.push(Promise.resolve(supabase.from("leads").insert(leads)));
      await Promise.all(ops);

      toast.success(`Imported: ${tasks.length} tasks · ${notes.length} notes · ${events.length} events · ${emails.length} emails · ${leads.length} leads`);
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally { setImporting(false); }
  };

  const summary = results.reduce<Record<string, number>>((a, r) => { a[r.category] = (a[r.category] ?? 0) + 1; return a; }, {});

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp Import</h1>
        <p className="text-sm text-muted-foreground">CSV columns supported: Timestamp/Date, Sender/From/Author, Message/Text. Up to 500 messages.</p>
      </div>

      <Card className="shadow-elegant">
        <CardContent className="p-6">
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onDragOver={(e) => e.preventDefault()}
            className="grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-background/50 px-6 py-10 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Drop your WhatsApp CSV here, or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Bengali, Banglish, and English supported</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          {filename && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate">{filename}</span>
                <Badge variant="secondary">{rows.length} msgs</Badge>
              </div>
              <Button size="sm" onClick={analyze} disabled={analyzing || !rows.length} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                {analyzing ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Analyzing</> : "Analyze with AI"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">AI categorization preview</CardTitle>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(summary).map(([k, v]) => (
                  <Badge key={k} variant="outline" className={CATEGORY_COLORS[k]}>{k}: {v}</Badge>
                ))}
              </div>
            </div>
            <Button onClick={importAll} disabled={importing || done} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
              {done ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Imported</> : importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing</> : "Confirm & Import"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] space-y-1 overflow-y-auto">
              {results.map((r) => {
                const orig = rows[r.index];
                if (!orig) return null;
                return (
                  <div key={r.index} className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-2.5 text-sm">
                    <Badge variant="outline" className={`${CATEGORY_COLORS[r.category]} shrink-0 capitalize`}>{r.category}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground truncate">[{orig.sender}] {orig.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
