import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Upload, Sparkles, CheckSquare, FileText, Calendar, Mail, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ChatFlow — Turn WhatsApp chats into action" },
      { name: "description", content: "Upload any WhatsApp chat. AI turns messages into tasks, notes, events, emails, and leads. Bengali & Banglish supported." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* nav */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand shadow-glow">
              <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight">ChatFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm" className="bg-gradient-brand text-primary-foreground hover:opacity-90">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-brand opacity-[0.08] blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> AI · Bengali · Banglish · English
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Turn your WhatsApp chats into{" "}
            <span className="text-gradient-brand">action</span>.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
            Upload any WhatsApp export. AI sorts every message into tasks, notes, calendar events, email drafts, and sales leads — automatically.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="bg-gradient-brand text-primary-foreground hover:opacity-90 shadow-glow">
              <Upload className="mr-2 h-4 w-4" /> Start free
            </Button></Link>
            <a href="#features"><Button size="lg" variant="outline">See how it works</Button></a>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card · Works offline as a PWA</p>
        </div>
      </section>

      {/* features grid */}
      <section id="features" className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Upload, title: "CSV upload", desc: "Drop a WhatsApp export. Up to 500 messages per batch." },
            { icon: Zap, title: "AI categorization", desc: "Understands short texts, Bengali, and Banglish (fb=facebook, janaiyen=let me know)." },
            { icon: CheckSquare, title: "Tasks & Kanban", desc: "Action verbs become tasks with priority and due dates." },
            { icon: FileText, title: "Smart notes", desc: "Decisions and recaps auto-saved with one-click summaries." },
            { icon: Calendar, title: "Calendar events", desc: "Time mentions become events on your in-app calendar." },
            { icon: Mail, title: "Email drafts", desc: "Markdown drafts ready to copy into Gmail or Outlook." },
            { icon: Users, title: "Sales funnel", desc: "Interest signals create scored leads in your pipeline." },
            { icon: Sparkles, title: "Privacy-first", desc: "All data stays in your account. No external syncs." },
            { icon: Zap, title: "Installable PWA", desc: "Add to home screen on Android or iOS — works offline." },
          ].map((f) => (
            <div key={f.title} className="group rounded-xl border border-border bg-card p-5 shadow-elegant transition-all hover:shadow-glow">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-gradient-brand group-hover:text-primary-foreground transition-colors">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-muted-foreground">
          <span>© ChatFlow 2026</span>
          <span>Built for teams that live in WhatsApp.</span>
        </div>
      </footer>
    </div>
  );
}
