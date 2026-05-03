import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/emails")({
  component: Emails,
  head: () => ({ meta: [{ title: "Email Drafts — ChatFlow" }] }),
});

interface Draft { id: string; to_email: string | null; subject: string | null; body_markdown: string | null; }

function Emails() {
  const { user } = useAuth();
  const [items, setItems] = useState<Draft[]>([]);
  const [active, setActive] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ to_email: "", subject: "", body_markdown: "" });

  const load = async () => {
    const { data } = await supabase.from("email_drafts").select("*").order("updated_at", { ascending: false });
    setItems((data ?? []) as Draft[]);
    if (data?.[0] && !active) setActive(data[0] as Draft);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("email_drafts").insert({ user_id: user.id, ...draft }).select().single();
    if (error) { toast.error(error.message); return; }
    setItems((p) => [data as Draft, ...p]); setActive(data as Draft); setOpen(false); setDraft({ to_email: "", subject: "", body_markdown: "" });
  };
  const save = async (d: Draft) => {
    setActive(d); setItems((p) => p.map((x) => x.id === d.id ? d : x));
    await supabase.from("email_drafts").update({ to_email: d.to_email, subject: d.subject, body_markdown: d.body_markdown }).eq("id", d.id);
  };
  const del = async (id: string) => {
    await supabase.from("email_drafts").delete().eq("id", id);
    setItems((p) => p.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  };
  const copy = (d: Draft) => {
    const text = `To: ${d.to_email ?? ""}\nSubject: ${d.subject ?? ""}\n\n${d.body_markdown ?? ""}`;
    navigator.clipboard.writeText(text); toast.success("Copied to clipboard");
  };

  return (
    <div className="mx-auto grid h-[calc(100vh-3.5rem)] max-w-7xl grid-cols-[300px_1fr] gap-0 md:h-screen">
      <aside className="flex flex-col border-r border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h2 className="text-sm font-semibold">Email drafts</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New draft</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="To" value={draft.to_email} onChange={(e) => setDraft({ ...draft, to_email: e.target.value })} />
                <Input placeholder="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                <Textarea placeholder="Body (markdown)" rows={6} value={draft.body_markdown} onChange={(e) => setDraft({ ...draft, body_markdown: e.target.value })} />
                <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.map((d) => (
            <button key={d.id} onClick={() => setActive(d)}
              className={`group flex w-full items-start gap-2 border-b border-border/50 px-3 py-2.5 text-left text-sm hover:bg-accent ${active?.id === d.id ? "bg-accent" : ""}`}>
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.subject || "(no subject)"}</div>
                <div className="truncate text-xs text-muted-foreground">{d.to_email || "no recipient"}</div>
              </div>
            </button>
          ))}
          {items.length === 0 && <p className="p-4 text-xs text-muted-foreground">No drafts yet.</p>}
        </div>
      </aside>
      <main className="flex flex-col overflow-hidden">
        {active ? (
          <Card className="m-4 flex flex-1 flex-col p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Draft · copy & paste into your email client</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(active)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
                <Button size="sm" variant="ghost" onClick={() => del(active.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <Input className="mt-3" placeholder="To" value={active.to_email ?? ""} onChange={(e) => save({ ...active, to_email: e.target.value })} />
            <Input className="mt-2" placeholder="Subject" value={active.subject ?? ""} onChange={(e) => save({ ...active, subject: e.target.value })} />
            <Textarea className="mt-2 flex-1 resize-none font-mono text-sm" value={active.body_markdown ?? ""} onChange={(e) => save({ ...active, body_markdown: e.target.value })} />
          </Card>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">Select a draft</div>
        )}
      </main>
    </div>
  );
}
