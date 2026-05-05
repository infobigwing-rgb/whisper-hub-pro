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
import { Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/products")({
  component: Products,
  head: () => ({ meta: [{ title: "Products — ChatFlow" }] }),
});

interface Product { id: string; name: string; description: string | null; price: number; currency: string; is_active: boolean; }
const sb = supabase as any;

function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", price: "", currency: "USD" });

  const load = async () => {
    const { data } = await sb.from("products").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Product[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !draft.name) return;
    const { data, error } = await sb.from("products").insert({
      user_id: user.id, name: draft.name, description: draft.description || null,
      price: Number(draft.price) || 0, currency: draft.currency,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setItems((p) => [data as Product, ...p]);
    setOpen(false); setDraft({ name: "", description: "", price: "", currency: "USD" });
  };
  const del = async (id: string) => {
    setItems((p) => p.filter((c) => c.id !== id));
    await sb.from("products").delete().eq("id", id);
  };
  const toggle = async (id: string, val: boolean) => {
    setItems((p) => p.map(x => x.id === id ? { ...x, is_active: val } : x));
    await sb.from("products").update({ is_active: val }).eq("id", id);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">{items.length} products in catalog</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New product</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <Textarea placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Price" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
                <Input placeholder="Currency" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
              </div>
              <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Card key={p.id} className="p-4 shadow-elegant">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-semibold truncate">{p.name}</span></div>
                {p.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</div>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-base font-semibold">${Number(p.price).toLocaleString()} <span className="text-xs text-muted-foreground">{p.currency}</span></div>
              <Badge variant={p.is_active ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => toggle(p.id, !p.is_active)}>{p.is_active ? "Active" : "Inactive"}</Badge>
            </div>
          </Card>
        ))}
        {items.length === 0 && <div className="col-span-full rounded-md border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No products yet.</div>}
      </div>
    </div>
  );
}
