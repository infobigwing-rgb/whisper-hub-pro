import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calendar")({
  component: CalendarView,
  head: () => ({ meta: [{ title: "Calendar — ChatFlow" }] }),
});

interface Event { id: string; title: string; description: string | null; start_time: string; end_time: string | null; }

function CalendarView() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", start_time: "", end_time: "" });

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const load = async () => {
    const { data } = await supabase.from("calendar_events").select("*").order("start_time");
    setEvents((data ?? []) as Event[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const create = async () => {
    if (!user || !draft.title || !draft.start_time) return;
    const { data, error } = await supabase.from("calendar_events").insert({
      user_id: user.id, title: draft.title.slice(0, 200), description: draft.description || null,
      start_time: new Date(draft.start_time).toISOString(),
      end_time: draft.end_time ? new Date(draft.end_time).toISOString() : null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    setEvents((p) => [...p, data as Event].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setOpen(false); setDraft({ title: "", description: "", start_time: "", end_time: "" });
  };
  const del = async (id: string) => {
    await supabase.from("calendar_events").delete().eq("id", id);
    setEvents((p) => p.filter((e) => e.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">In-app calendar — no external sync.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-[140px] text-center text-sm font-medium">{format(month, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-gradient-brand text-primary-foreground hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> New event</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <Textarea placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                <Input type="datetime-local" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
                <Input type="datetime-local" value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} />
                <Button onClick={create} className="w-full bg-gradient-brand text-primary-foreground hover:opacity-90">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elegant">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), d));
            const inMonth = isSameMonth(d, month);
            const today = isSameDay(d, new Date());
            return (
              <div key={d.toISOString()} className={`min-h-[100px] border-b border-r border-border/50 p-1.5 ${inMonth ? "" : "bg-muted/20 opacity-50"}`}>
                <div className={`mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${today ? "bg-gradient-brand text-primary-foreground" : "text-foreground"}`}>{format(d, "d")}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div key={e.id} className="group flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                      <span className="truncate">{format(new Date(e.start_time), "HH:mm")} {e.title}</span>
                      <Trash2 className="h-2.5 w-2.5 cursor-pointer opacity-0 hover:text-destructive group-hover:opacity-100" onClick={() => del(e.id)} />
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
