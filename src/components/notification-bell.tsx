import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Notif { id: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string }

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
    setItems((data ?? []) as Notif[]);
  };

  // Generate notifications from due reminders / tasks / events on this client (every 60s).
  const scan = async () => {
    if (!user) return;
    const wantReminders = localStorage.getItem("notify_reminders") !== "0";
    const wantEvents = localStorage.getItem("notify_events") !== "0";
    const wantBrowser = localStorage.getItem("notify_browser") !== "0";
    const now = new Date().toISOString();
    const in15 = new Date(Date.now() + 15 * 60_000).toISOString();
    const [rems, evs] = await Promise.all([
      wantReminders
        ? supabase.from("reminders").select("id,message,due_time").lte("due_time", now).eq("is_done", false)
        : Promise.resolve({ data: [] as any[] }),
      wantEvents
        ? supabase.from("calendar_events").select("id,title,start_time").gte("start_time", now).lte("start_time", in15)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const seen = new Set(items.map((i) => i.title));
    const toInsert: any[] = [];
    rems.data?.forEach((r: any) => {
      const t = `Reminder: ${r.message}`;
      if (!seen.has(t)) toInsert.push({ user_id: user.id, title: t, link: "/app/reminders" });
    });
    evs.data?.forEach((e: any) => {
      const t = `Event soon: ${e.title}`;
      if (!seen.has(t)) toInsert.push({ user_id: user.id, title: t, body: new Date(e.start_time).toLocaleString(), link: "/app/calendar" });
    });
    if (toInsert.length) {
      await supabase.from("notifications").insert(toInsert);
      toInsert.forEach((n) => toast(n.title, { description: n.body ?? undefined }));
      // Browser notifications (PWA / installed APK)
      if (wantBrowser && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        toInsert.forEach((n) => new Notification(n.title, { body: n.body ?? "", icon: "/icon-192.png" }));
      }
      load();
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    scan();
    const id = setInterval(scan, 60_000);
    const ch = supabase.channel("notif").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load()).subscribe();
    return () => { clearInterval(id); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unread = items.filter((i) => !i.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={async () => { await supabase.from("notifications").update({ is_read: true }).eq("is_read", false); load(); }}>
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No notifications</p>}
          {items.map((n) => (
            <button key={n.id} onClick={() => { if (n.link) navigate({ to: n.link as any }); }} className={`block w-full border-b px-3 py-2 text-left text-sm hover:bg-accent ${n.is_read ? "" : "bg-accent/30"}`}>
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
