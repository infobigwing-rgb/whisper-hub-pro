import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FileText, Calendar, Bell, Mail, Users, Upload, ArrowRight } from "lucide-react";
import { format, isToday, isFuture } from "date-fns";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — ChatFlow" }] }),
});

interface Counts { tasks: number; notes: number; events: number; reminders: number; emails: number; leads: number; }

function Dashboard() {
  const { user } = useAuth();
  const [c, setC] = useState<Counts>({ tasks: 0, notes: 0, events: 0, reminders: 0, emails: 0, leads: 0 });
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [openTasks, setOpenTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const tables = ["tasks", "notes", "calendar_events", "reminders", "email_drafts", "leads"] as const;
      const counts = await Promise.all(tables.map((t) => supabase.from(t).select("*", { count: "exact", head: true })));
      setC({
        tasks: counts[0].count ?? 0, notes: counts[1].count ?? 0, events: counts[2].count ?? 0,
        reminders: counts[3].count ?? 0, emails: counts[4].count ?? 0, leads: counts[5].count ?? 0,
      });
      const { data: ev } = await supabase.from("calendar_events").select("*").order("start_time").limit(5);
      setTodayEvents(ev?.filter((e) => isToday(new Date(e.start_time)) || isFuture(new Date(e.start_time))) ?? []);
      const { data: tk } = await supabase.from("tasks").select("*").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(5);
      setOpenTasks(tk ?? []);
    })();
  }, [user]);

  const stats = [
    { label: "Tasks", value: c.tasks, icon: CheckSquare, to: "/app/tasks" },
    { label: "Notes", value: c.notes, icon: FileText, to: "/app/notes" },
    { label: "Events", value: c.events, icon: Calendar, to: "/app/calendar" },
    { label: "Reminders", value: c.reminders, icon: Bell, to: "/app/reminders" },
    { label: "Drafts", value: c.emails, icon: Mail, to: "/app/emails" },
    { label: "Leads", value: c.leads, icon: Users, to: "/app/leads" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {user?.email?.split("@")[0]}.</p>
        </div>
        <Link to="/app/whatsapp" className="inline-flex items-center gap-2 rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90">
          <Upload className="h-4 w-4" /> Import WhatsApp
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="rounded-xl border border-border bg-card p-4 shadow-elegant transition-colors hover:bg-accent">
            <s.icon className="h-4 w-4 text-primary" />
            <div className="mt-3 text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Open tasks</CardTitle><Link to="/app/tasks" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link></CardHeader>
          <CardContent className="space-y-2">
            {openTasks.length === 0 && <p className="text-sm text-muted-foreground">No open tasks. Import a chat to get started.</p>}
            {openTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/50 px-3 py-2">
                <span className="truncate text-sm">{t.title}</span>
                {t.due_date && <span className="text-xs text-muted-foreground">{format(new Date(t.due_date), "MMM d")}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Upcoming events</CardTitle><Link to="/app/calendar" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link></CardHeader>
          <CardContent className="space-y-2">
            {todayEvents.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
            {todayEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/50 px-3 py-2">
                <span className="truncate text-sm">{e.title}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(e.start_time), "MMM d, HH:mm")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
