import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customers")({
  component: Customers,
  head: () => ({ meta: [{ title: "Customers — ChatFlow" }] }),
});

interface Customer { id: string; name: string; email: string | null; phone: string | null; company: string | null; status: string; lead_id: string | null; }
const sb = supabase as any;

function Customers() {
  const { user } = useAuth();
  const [items, setItems] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", email: "", phone: "", company: "", notes: "" });

  const load = async () => {
    const { data } = await sb.from("customers").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Customer[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !draft.name) return;
    const { data, error } = await sb.from("customers").insert({ user_id: user.id, ...draft }).select().single();
    if (error) { toast.error(error.message); return; }
    setItems((p) => [data as Customer, ...p]);
    setOpen(false); setDraft({ name: "", email: "", phone: "", company: "", notes: "" });
  };
  const del = async (id: string) => {
    setItems((p) => p.filter((c) => c.id !== id));
    await sb.from("customers").delete().eq("id", id);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{items.length} customers · auto-created when leads reach Won</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New customer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <Input placeholder="Email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              <Input placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              <Input placeholder="Company" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
              <Textarea placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <Card key={c.id} className="p-4 shadow-elegant">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{c.name}</div>
                {c.company && <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3 w-3" />{c.company}</div>}
              </div>
              <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {c.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</div>}
              {c.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</div>}
            </div>
            <div className="mt-3 flex justify-between">
              <Link to="/app/onboarding" className="text-xs text-primary hover:underline">Onboarding →</Link>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del(c.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <div className="col-span-full rounded-md border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No customers yet. Move a lead to "Won" to auto-create one.</div>}
      </div>
    </div>
  );
}
