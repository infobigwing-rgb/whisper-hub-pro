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
import { Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/deals")({
  component: Deals,
  head: () => ({ meta: [{ title: "Deals — ChatFlow" }] }),
});

const STAGES = [
  { id: "qualification", label: "Qualification" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

interface Deal { id: string; title: string; stage: string; amount: number; currency: string; probability: number; expected_close_date: string | null; notes: string | null; lead_id: string | null; }

const sb = supabase as any;

function Deals() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", amount: "", expected_close_date: "", notes: "" });

  const load = async () => {
    const { data } = await sb.from("deals").select("*").order("created_at", { ascending: false });
    setDeals((data ?? []) as Deal[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const move = async (id: string, stage: string) => {
    setDeals((p) => p.map((d) => d.id === id ? { ...d, stage } : d));
    await sb.from("deals").update({ stage }).eq("id", id);
  };
  const del = async (id: string) => {
    setDeals((p) => p.filter((d) => d.id !== id));
    await sb.from("deals").delete().eq("id", id);
  };
  const create = async () => {
    if (!user || !draft.title.trim()) return;
    const { data, error } = await sb.from("deals").insert({
      user_id: user.id,
      title: draft.title.trim(),
      amount: Number(draft.amount) || 0,
      expected_close_date: draft.expected_close_date || null,
      notes: draft.notes || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setDeals((p) => [data as Deal, ...p]);
    setOpen(false);
    setDraft({ title: "", amount: "", expected_close_date: "", notes: "" });
  };

  const totalByStage = (s: string) => deals.filter(d => d.stage === s).reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">{deals.length} deals · ${deals.reduce((s, d) => s + Number(d.amount || 0), 0).toLocaleString()} total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New deal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New deal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Input type="number" placeholder="Amount" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              <Input type="date" value={draft.expected_close_date} onChange={(e) => setDraft({ ...draft, expected_close_date: e.target.value })} />
              <Textarea placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((col) => {
          const items = deals.filter((d) => d.stage === col.id);
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
              <div className="mb-2 px-1 text-xs text-muted-foreground">${totalByStage(col.id).toLocaleString()}</div>
              <div className="space-y-2">
                {items.map((d) => (
                  <Card key={d.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", d.id)}
                    className="cursor-grab p-2.5 shadow-elegant active:cursor-grabbing">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{d.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />{Number(d.amount).toLocaleString()} {d.currency}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del(d.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    {d.expected_close_date && <Badge variant="outline" className="mt-2 text-[10px]">{d.expected_close_date}</Badge>}
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
