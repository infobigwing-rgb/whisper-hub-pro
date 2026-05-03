import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Sparkles, Loader2 } from "lucide-react";
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

export function CommandBar({ onOpenSearch }: { onOpenSearch: (q: string) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
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

  const submit = async () => {
    if (!text.trim() || !user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("command-parse", {
        body: { text, current_iso: new Date().toISOString() },
      });
      if (error) throw error;
      const a = data?.action;
      if (!a) throw new Error("Could not parse command");

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
          setOpen(false);
          onOpenSearch(a.query ?? a.title);
          break;
        }
      }
      setText("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Command</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>AI Command</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Try: "remind me to call Rima kal 3pm", "add task fix bug priority high", "lead Kabir from TechSolutions"…</p>
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Type or speak a command…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          {supportsVoice && (
            <Button type="button" variant={listening ? "destructive" : "outline"} size="icon" onClick={listening ? stopVoice : startVoice}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Button onClick={submit} disabled={busy || !text.trim()} className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
