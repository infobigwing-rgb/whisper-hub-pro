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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/app/tasks")({
  component: Tasks,
  head: () => ({ meta: [{ title: "Tasks — ChatFlow" }] }),
});

const STATUSES = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
] as const;

const PRIO_COLORS: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground",
};

interface Task { id: string; title: string; description: string | null; status: string; priority: string; due_date: string | null; assignee: string | null; labels: string[] | null; source_message_id: string | null; }

function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", priority: "medium", due_date: "" });

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    setTasks((data ?? []) as Task[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const move = async (id: string, status: string) => {
    setTasks((p) => p.map((t) => t.id === id ? { ...t, status } : t));
    await supabase.from("tasks").update({ status }).eq("id", id);
  };
  const del = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };
  const create = async () => {
    if (!user || !draft.title.trim()) return;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: user.id, title: draft.title.trim().slice(0, 200), description: draft.description || null,
      priority: draft.priority, due_date: draft.due_date ? new Date(draft.due_date).toISOString() : null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setTasks((p) => [data as Task, ...p]); setOpen(false); setDraft({ title: "", description: "", priority: "medium", due_date: "" });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} total</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New task</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Textarea placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                </Select>
                <Input type="datetime-local" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} />
              </div>
              <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((col) => {
          const items = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("id"); if (id) move(id, col.id); }}
              className="rounded-xl border border-border bg-card/40 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-medium">{col.label}</h3>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <Card key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", t.id)}
                    className="cursor-grab p-3 shadow-elegant active:cursor-grabbing">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug">{t.title}</div>
                        {t.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</div>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={PRIO_COLORS[t.priority]}>{t.priority}</Badge>
                      {t.due_date && <Badge variant="outline">{format(new Date(t.due_date), "MMM d")}</Badge>}
                      {t.source_message_id && <Badge variant="outline" className="gap-1"><MessageSquare className="h-2.5 w-2.5" /> WhatsApp</Badge>}
                    </div>
                  </Card>
                ))}
                {items.length === 0 && <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">Drop tasks here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
