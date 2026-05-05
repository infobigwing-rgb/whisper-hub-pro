import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Globe, Lock, Edit2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — ChatFlow" }] }),
});

const sb = supabase as any;

function ProfilePage() {
  const { user } = useAuth();
  const [edit, setEdit] = useState(false);
  const [profile, setProfile] = useState({ display_name: "", phone: "", timezone: "UTC", role: "user" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }: any) => {
      if (data) setProfile({
        display_name: data.display_name ?? "",
        phone: data.phone ?? "",
        timezone: data.timezone ?? "UTC",
        role: data.role ?? "user",
      });
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await sb.from("profiles").update({
      display_name: profile.display_name,
      phone: profile.phone,
      timezone: profile.timezone,
    }).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message); else { toast.success("Profile saved"); setEdit(false); }
  };

  const changePwd = async () => {
    if (pwd.next.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (pwd.next !== pwd.confirm) { toast.error("Passwords do not match"); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPwd({ current: "", next: "", confirm: "" }); }
  };

  const initial = (profile.display_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      </div>

      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
        <CardContent className="-mt-12 space-y-5">
          <div className="flex items-end justify-between">
            <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-background bg-muted text-3xl font-semibold">{initial}</div>
            <Button variant={edit ? "default" : "outline"} size="sm" onClick={() => edit ? save() : setEdit(true)} disabled={loading}>
              <Edit2 className="mr-2 h-3 w-3" />{edit ? "Save" : "Edit Profile"}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field icon={User} label="Full Name">
              <Input value={profile.display_name} disabled={!edit} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
            </Field>
            <Field icon={Mail} label="Email Address">
              <Input value={user?.email ?? ""} disabled />
            </Field>
            <Field icon={Phone} label="Phone Number">
              <Input value={profile.phone} disabled={!edit} placeholder="+1 (555) 000-0000" onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Field icon={Globe} label="Timezone">
              <Input value={profile.timezone} disabled={!edit} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} />
            </Field>
            <Field icon={Shield} label="Role">
              <div><Badge variant="secondary">{profile.role}</Badge></div>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Security</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label className="text-xs">New password</Label><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Confirm password</Label><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></div>
          <Button onClick={changePwd} className="md:col-span-2">Change Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3 w-3" />{label}</Label>
      {children}
    </div>
  );
}
