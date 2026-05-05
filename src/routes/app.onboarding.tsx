import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Onboarding — ChatFlow" }] }),
});

interface Customer { id: string; name: string; company: string | null; }
interface Step { id: string; customer_id: string; title: string; status: string; step_order: number; due_date: string | null; }
const sb = supabase as any;

function Onboarding() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newStep, setNewStep] = useState<Record<string, string>>({});

  const load = async () => {
    const [c, s] = await Promise.all([
      sb.from("customers").select("id,name,company").order("created_at", { ascending: false }),
      sb.from("onboarding_steps").select("*").order("step_order", { ascending: true }),
    ]);
    setCustomers((c.data ?? []) as Customer[]);
    setSteps((s.data ?? []) as Step[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const toggle = async (step: Step) => {
    const next = step.status === "completed" ? "pending" : "completed";
    setSteps((p) => p.map((x) => x.id === step.id ? { ...x, status: next } : x));
    await sb.from("onboarding_steps").update({ status: next, completed_at: next === "completed" ? new Date().toISOString() : null }).eq("id", step.id);
  };
  const addStep = async (customerId: string) => {
    const title = (newStep[customerId] || "").trim(); if (!title || !user) return;
    const order = steps.filter(s => s.customer_id === customerId).length + 1;
    const { data, error } = await sb.from("onboarding_steps").insert({ user_id: user.id, customer_id: customerId, title, step_order: order }).select().single();
    if (error) { toast.error(error.message); return; }
    setSteps((p) => [...p, data as Step]);
    setNewStep((p) => ({ ...p, [customerId]: "" }));
  };
  const delStep = async (id: string) => {
    setSteps((p) => p.filter((s) => s.id !== id));
    await sb.from("onboarding_steps").delete().eq("id", id);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer Onboarding</h1>
        <p className="text-sm text-muted-foreground">Track onboarding progress for each customer</p>
      </div>

      <div className="space-y-3">
        {customers.map((c) => {
          const cSteps = steps.filter((s) => s.customer_id === c.id);
          const done = cSteps.filter((s) => s.status === "completed").length;
          const pct = cSteps.length ? Math.round((done / cSteps.length) * 100) : 0;
          const open = openId === c.id;
          return (
            <Card key={c.id} className="p-4 shadow-elegant">
              <div className="flex cursor-pointer items-center gap-3" onClick={() => setOpenId(open ? null : c.id)}>
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.name}</div>
                  {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                </div>
                <Badge variant="outline">{done}/{cSteps.length}</Badge>
                <div className="w-32"><Progress value={pct} /></div>
              </div>
              {open && (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  {cSteps.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-md border border-border/60 p-2">
                      <Checkbox checked={s.status === "completed"} onCheckedChange={() => toggle(s)} />
                      <span className={"flex-1 text-sm " + (s.status === "completed" ? "text-muted-foreground line-through" : "")}>{s.title}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delStep(s.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input placeholder="Add step…" value={newStep[c.id] || ""} onChange={(e) => setNewStep((p) => ({ ...p, [c.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addStep(c.id)} />
                    <Button size="sm" onClick={() => addStep(c.id)}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {customers.length === 0 && <div className="rounded-md border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No customers yet.</div>}
      </div>
    </div>
  );
}
