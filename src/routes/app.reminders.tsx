import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Bell } from "lucide-react";
import { format, isPast } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reminders")({
  component: Reminders,
  head: () => ({ meta: [{ title: "Reminders — ChatFlow" }] }),
});

interface Reminder { id: string; message: string; due_time: string; is_done: boolean; }

function Reminders() {
  const { user } = useAuth();
  const [items, setItems] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ message: "", due_time: "" });

  const load = async () => {
    const { data } = await supabase.from("reminders").select("*").order("due_time");
    setItems((data ?? []) as Reminder[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !draft.message || !draft.due_time) return;
    const { data, error } = await supabase.from("reminders").insert({ user_id: user.id, message: draft.message.slice(0, 500), due_time: new Date(draft.due_time).toISOString() }).select().single();
    if (error) { toast.error(error.message); return; }
    setItems((p) => [...p, data as Reminder].sort((a, b) => a.due_time.localeCompare(b.due_time)));
    setOpen(false); setDraft({ message: "", due_time: "" });
  };
  const toggle = async (r: Reminder) => {
    const next = !r.is_done;
    setItems((p) => p.map((x) => x.id === r.id ? { ...x, is_done: next } : x));
    await supabase.from("reminders").update({ is_done: next }).eq("id", r.id);
  };
  const del = async (id: string) => {
    setItems((p) => p.filter((x) => x.id !== id));
    await supabase.from("reminders").delete().eq("id", id);
  };

  const overdue = items.filter((r) => !r.is_done && isPast(new Date(r.due_time))).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reminders</h1>
          <p className="text-sm text-muted-foreground">{overdue > 0 ? `${overdue} overdue` : "All caught up"}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New reminder</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New reminder</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="What should I remind you about?" value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
              <Input type="datetime-local" value={draft.due_time} onChange={(e) => setDraft({ ...draft, due_time: e.target.value })} />
              <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {items.map((r) => {
          const od = !r.is_done && isPast(new Date(r.due_time));
          return (
            <Card key={r.id} className={`flex items-center gap-3 p-3 ${od ? "border-destructive/40" : ""}`}>
              <Checkbox checked={r.is_done} onCheckedChange={() => toggle(r)} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${r.is_done ? "line-through text-muted-foreground" : ""}`}>{r.message}</div>
                <div className={`text-xs ${od ? "text-destructive" : "text-muted-foreground"}`}>{format(new Date(r.due_time), "EEE, MMM d HH:mm")}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          );
        })}
        {items.length === 0 && (
          <div className="grid place-items-center rounded-xl border border-dashed border-border p-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No reminders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
