import { useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Loader2, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type Action = {
  action: "reminder" | "task" | "note" | "event" | "lead" | "email" | "search";
  title: string;
  description?: string | null;
  due_iso?: string | null;
  start_iso?: string | null;
  end_iso?: string | null;
  priority?: "low" | "medium" | "high";
  to_email?: string | null;
  subject?: string | null;
  body?: string | null;
  lead_name?: string | null;
  company?: string | null;
  query?: string | null;
};

const ACTION_LABEL: Record<Action["action"], string> = {
  reminder: "Reminder",
  task: "Task",
  note: "Note",
  event: "Calendar event",
  lead: "Lead",
  email: "Email draft",
  search: "Search",
};

function fmt(iso?: string | null) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export function CommandBar({ onOpenSearch }: { onOpenSearch: (q: string) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [preview, setPreview] = useState<Action | null>(null);
  const recognitionRef = useRef<any>(null);

  const supportsVoice = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported on this browser"); return; }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setText(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };
  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  const parse = async () => {
    if (!text.trim() || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("command-parse", {
        body: { text, current_iso: new Date().toISOString() },
      });
      if (error) throw error;
      const a = data?.action as Action | undefined;
      if (!a) throw new Error("Could not parse command");
      setPreview(a);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview || !user) return;
    setBusy(true);
    try {
      const a = preview;
      switch (a.action) {
        case "reminder": {
          const due = a.due_iso || a.start_iso || new Date(Date.now() + 3600e3).toISOString();
          await supabase.from("reminders").insert({ user_id: user.id, message: a.title, due_time: due });
          toast.success("Reminder created");
          navigate({ to: "/app/reminders" }); break;
        }
        case "task": {
          await supabase.from("tasks").insert({ user_id: user.id, title: a.title, description: a.description ?? null, priority: a.priority ?? "medium", due_date: a.due_iso ?? null });
          toast.success("Task created");
          navigate({ to: "/app/tasks" }); break;
        }
        case "note": {
          await supabase.from("notes").insert({ user_id: user.id, title: a.title, content: a.description ?? a.title });
          toast.success("Note created");
          navigate({ to: "/app/notes" }); break;
        }
        case "event": {
          const start = a.start_iso || a.due_iso || new Date().toISOString();
          await supabase.from("calendar_events").insert({ user_id: user.id, title: a.title, description: a.description ?? null, start_time: start, end_time: a.end_iso ?? null });
          toast.success("Event scheduled");
          navigate({ to: "/app/calendar" }); break;
        }
        case "lead": {
          await supabase.from("leads").insert({ user_id: user.id, name: a.lead_name ?? a.title, company: a.company ?? null, notes: a.description ?? null });
          toast.success("Lead added");
          navigate({ to: "/app/leads" }); break;
        }
        case "email": {
          await supabase.from("email_drafts").insert({ user_id: user.id, to_email: a.to_email ?? null, subject: a.subject ?? a.title, body_markdown: a.body ?? "" });
          toast.success("Email draft created");
          navigate({ to: "/app/emails" }); break;
        }
        case "search": {
          setOpen(false); setPreview(null); setText("");
          onOpenSearch(a.query ?? a.title);
          return;
        }
      }
      setText(""); setPreview(null); setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPreview(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Command</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{preview ? "Confirm action" : "AI Command"}</DialogTitle></DialogHeader>

        {!preview && (
          <>
            <p className="text-xs text-muted-foreground">Try: "remind me to call Rima kal 3pm", "porshu Friday 2pm meeting with Kabir", "add task fix bug priority high"…</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                placeholder="Type or speak a command…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") parse(); }}
              />
              {supportsVoice && (
                <Button type="button" variant={listening ? "destructive" : "outline"} size="icon" onClick={listening ? stopVoice : startVoice}>
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button onClick={parse} disabled={busy || !text.trim()} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{ACTION_LABEL[preview.action]}</span>
              </div>
              <Field label="Title" value={preview.title} />
              {preview.description && <Field label="Details" value={preview.description} />}
              {preview.due_iso && <Field label="Due" value={fmt(preview.due_iso)!} />}
              {preview.start_iso && <Field label="Starts" value={fmt(preview.start_iso)!} />}
              {preview.end_iso && <Field label="Ends" value={fmt(preview.end_iso)!} />}
              {preview.priority && <Field label="Priority" value={preview.priority} />}
              {preview.lead_name && <Field label="Lead" value={preview.lead_name} />}
              {preview.company && <Field label="Company" value={preview.company} />}
              {preview.to_email && <Field label="To" value={preview.to_email} />}
              {preview.subject && <Field label="Subject" value={preview.subject} />}
              {preview.query && <Field label="Search" value={preview.query} />}
            </div>
            <p className="text-xs text-muted-foreground">Preview only — nothing has been saved yet.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)} disabled={busy}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Edit
              </Button>
              <Button onClick={confirm} disabled={busy} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                Confirm & save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  );
}
