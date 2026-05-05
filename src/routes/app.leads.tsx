import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/leads")({
  component: Leads,
  head: () => ({ meta: [{ title: "Sales Funnel — ChatFlow" }] }),
});

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "mql", label: "MQL" },
  { id: "sql", label: "SQL" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

interface Lead { id: string; name: string; email: string | null; company: string | null; stage: string; ai_score: number; notes: string | null; }

function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", company: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data ?? []) as Lead[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !draft.name) return;
    const { data, error } = await supabase.from("leads").insert({ user_id: user.id, ...draft }).select().single();
    if (error) { toast.error(error.message); return; }
    setLeads((p) => [data as Lead, ...p]); setOpen(false); setDraft({ name: "", email: "", company: "", notes: "" });
  };
  const move = async (id: string, stage: string) => {
    setLeads((p) => p.map((l) => l.id === id ? { ...l, stage } : l));
    await supabase.from("leads").update({ stage }).eq("id", id);
  };
  const del = async (id: string) => {
    setLeads((p) => p.filter((l) => l.id !== id));
    await supabase.from("leads").delete().eq("id", id);
  };
  const convert = async (l: Lead) => {
    if (!user) return;
    const sb = supabase as any;
    const { data: existing } = await sb.from("customers").select("id").eq("lead_id", l.id).maybeSingle();
    if (existing) { toast.success("Customer already exists"); return; }
    const { error } = await sb.from("customers").insert({
      user_id: user.id, lead_id: l.id, name: l.name, email: l.email, company: l.company, notes: l.notes,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${l.name} converted to customer`);
  };

  const scoreColor = (s: number) => s >= 75 ? "bg-success/15 text-success border-success/30" : s >= 40 ? "bg-warning/15 text-warning border-warning/30" : "bg-muted text-muted-foreground";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Funnel</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads · drag to move stages</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New lead</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <Input placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <Input placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
              <Textarea placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((col) => {
          const items = leads.filter((l) => l.stage === col.id);
          return (
            <div key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("id"); if (id) move(id, col.id); }}
              className="rounded-xl border border-border bg-card/40 p-2.5"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</h3>
                <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <Card key={l.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", l.id)}
                    className="cursor-grab p-2.5 shadow-elegant active:cursor-grabbing">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{l.name}</div>
                        {l.company && <div className="truncate text-xs text-muted-foreground">{l.company}</div>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Convert to customer" onClick={() => convert(l)}><UserCheck className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del(l.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <Badge variant="outline" className={`mt-2 ${scoreColor(l.ai_score)}`}>Score {l.ai_score}</Badge>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
