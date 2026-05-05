import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { BookOpen, X } from "lucide-react";
import { Card } from "@/components/ui/card";

const KEY = "show_user_guide";

const TIPS = [
  { title: "WhatsApp Import", body: "Export a chat as .txt/.csv and upload — AI categorises every message into tasks, notes, emails or calendar events." },
  { title: "Voice & Text Commands", body: "Press the mic in the top bar and say things like 'kal 3pm Rima ke call koro' — preview before saving." },
  { title: "Leads → Customers", body: "Move a lead to 'Won' and a Customer + onboarding checklist is created automatically." },
  { title: "Deals Pipeline", body: "Drag deal cards across stages. Totals update per column." },
  { title: "Global Search", body: "Press ⌘K (or Ctrl+K) to search across tasks, notes, leads, deals and messages." },
];

export function UserGuide() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    setEnabled(v === "1");
  }, []);

  const toggle = (v: boolean) => {
    setEnabled(v);
    localStorage.setItem(KEY, v ? "1" : "0");
    if (v) setOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-md border border-sidebar-border/60 px-3 py-2 text-xs">
        <button className="flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground" onClick={() => enabled && setOpen(true)}>
          <BookOpen className="h-3.5 w-3.5" /> Show User Guide
        </button>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      {open && enabled && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setOpen(false)}>
          <Card className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold"><BookOpen className="h-4 w-4" /> Quick Guide</h2>
            <div className="space-y-3">
              {TIPS.map((t) => (
                <div key={t.title} className="rounded-md border border-border/60 p-3">
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.body}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
