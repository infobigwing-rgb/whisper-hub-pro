import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, BellOff, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const KEYS = {
  reminders: "notify_reminders",
  events: "notify_events",
  browser: "notify_browser",
} as const;

function getBool(k: string, d = true) {
  if (typeof window === "undefined") return d;
  const v = localStorage.getItem(k);
  return v === null ? d : v === "1";
}
function setBool(k: string, v: boolean) {
  localStorage.setItem(k, v ? "1" : "0");
}

function SettingsPage() {
  const [reminders, setReminders] = useState(true);
  const [events, setEvents] = useState(true);
  const [browser, setBrowser] = useState(true);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setReminders(getBool(KEYS.reminders));
    setEvents(getBool(KEYS.events));
    setBrowser(getBool(KEYS.browser));
    if (typeof window !== "undefined" && "Notification" in window) {
      setPerm(Notification.permission);
    } else setPerm("unsupported");
  }, []);

  const update = (k: string, v: boolean, set: (b: boolean) => void) => {
    setBool(k, v); set(v);
    toast.success("Saved");
  };

  const requestPerm = async () => {
    if (!("Notification" in window)) { toast.error("Browser does not support notifications"); return; }
    const r = await Notification.requestPermission();
    setPerm(r);
    if (r === "granted") toast.success("Notifications enabled");
    else toast.error("Permission " + r);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notification settings</h1>
        <p className="text-sm text-muted-foreground">Control which alerts ChatFlow shows you.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Browser permission</CardTitle>
          <CardDescription>Required for push alerts when the app is installed as a PWA / APK.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {perm === "granted" && <><Check className="h-4 w-4 text-emerald-500" /> Granted</>}
            {perm === "denied" && <><X className="h-4 w-4 text-destructive" /> Denied — enable in browser site settings</>}
            {perm === "default" && <><BellOff className="h-4 w-4 text-muted-foreground" /> Not requested</>}
            {perm === "unsupported" && <span className="text-muted-foreground">Unsupported</span>}
          </div>
          <Button onClick={requestPerm} disabled={perm === "granted" || perm === "unsupported"}>
            {perm === "granted" ? "Enabled" : "Request permission"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alert types</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Row label="Reminder due alerts" desc="Toast + push when a reminder hits its due time." checked={reminders} onChange={(v) => update(KEYS.reminders, v, setReminders)} />
          <Row label="Event starting soon" desc="Notify 15 minutes before a calendar event starts." checked={events} onChange={(v) => update(KEYS.events, v, setEvents)} />
          <Row label="Browser push notifications" desc="Show OS-level notifications (in addition to in-app toasts)." checked={browser} onChange={(v) => update(KEYS.browser, v, setBrowser)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
