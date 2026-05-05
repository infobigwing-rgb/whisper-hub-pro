import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Home, Upload, CheckSquare, FileText, Calendar, Bell, Mail, Users, LogOut, Menu, Settings, TrendingUp, Zap, DollarSign, UserCircle, Briefcase, Package, Rocket } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CommandBar } from "@/components/command-bar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { UserGuide } from "@/components/user-guide";

const nav = [
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/deals", label: "Deals", icon: DollarSign },
  { to: "/app/customers", label: "Customers", icon: UserCircle },
  { to: "/app/onboarding", label: "Onboarding", icon: Rocket },
  { to: "/app/products", label: "Products", icon: Package },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/app/notes", label: "Notes", icon: FileText },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/reminders", label: "Reminders", icon: Bell },
  { to: "/app/emails", label: "Email Drafts", icon: Mail },
  { to: "/app/whatsapp", label: "WhatsApp Import", icon: Upload },
  { to: "/app/crm", label: "CRM Dashboard", icon: TrendingUp },
  { to: "/app/sales", label: "Sales Automation", icon: Zap },
  { to: "/app/profile", label: "Profile", icon: Briefcase },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchSignal, setSearchSignal] = useState({ q: "", n: 0 });

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
          <CheckSquare className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-base font-semibold tracking-tight">ChatFlow</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== "/app" && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-sidebar-border p-3">
        <UserGuide />
        <div className="px-2 text-xs text-muted-foreground truncate">{user?.email}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div className="relative h-full w-64" onClick={(e) => e.stopPropagation()}>{Sidebar}</div>
        </div>
      )}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <span className="font-semibold md:hidden">ChatFlow</span>
          <div className="ml-auto flex items-center gap-2">
            <CommandBar onOpenSearch={(q) => setSearchSignal({ q, n: Date.now() })} />
            <GlobalSearch openSignal={searchSignal} />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
