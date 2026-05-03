import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Mail, Zap, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/sales")({
  component: SalesAutomation,
  head: () => ({ meta: [{ title: "Sales Automation — ChatFlow" }] }),
});

interface EmailSequence {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  step_count: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

function SalesAutomation() {
  const { user } = useAuth();
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSequence, setNewSequence] = useState({ name: "", description: "", trigger_type: "new_lead" });
  const [newRule, setNewRule] = useState({ name: "", description: "" });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load email sequences
      const { data: seqs } = await supabase
        .from("email_sequences")
        .select("id, name, description, is_active, trigger_type")
        .eq("user_id", user!.id);

      setSequences(seqs || []);

      // Load automation rules
      const { data: rls } = await supabase
        .from("automation_rules")
        .select("id, name, description, is_active")
        .eq("user_id", user!.id);

      setRules(rls || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createSequence = async () => {
    if (!newSequence.name) return;

    try {
      const { error } = await supabase.from("email_sequences").insert({
        user_id: user!.id,
        ...newSequence,
      });

      if (!error) {
        setNewSequence({ name: "", description: "", trigger_type: "new_lead" });
        loadData();
      }
    } catch (error) {
      console.error("Error creating sequence:", error);
    }
  };

  const createRule = async () => {
    if (!newRule.name) return;

    try {
      const { error } = await supabase.from("automation_rules").insert({
        user_id: user!.id,
        ...newRule,
        trigger: JSON.stringify({}),
        actions: JSON.stringify([]),
      });

      if (!error) {
        setNewRule({ name: "", description: "" });
        loadData();
      }
    } catch (error) {
      console.error("Error creating rule:", error);
    }
  };

  const toggleSequence = async (id: string, current: boolean) => {
    try {
      await supabase.from("email_sequences").update({ is_active: !current }).eq("id", id);
      loadData();
    } catch (error) {
      console.error("Error toggling sequence:", error);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading automation settings...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Automation</h1>
        <p className="text-sm text-gray-500">Configure agent workflows</p>
      </div>

      <Tabs defaultValue="sequences" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sequences">Email Sequences</TabsTrigger>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="settings">Agent Settings</TabsTrigger>
        </TabsList>

        {/* Email Sequences Tab */}
        <TabsContent value="sequences" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" /> Email Sequences
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> New Sequence
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Email Sequence</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="e.g., New Lead Welcome"
                        value={newSequence.name}
                        onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="What is this sequence for?"
                        value={newSequence.description}
                        onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Trigger</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={newSequence.trigger_type}
                        onChange={(e) => setNewSequence({ ...newSequence, trigger_type: e.target.value })}
                      >
                        <option value="new_lead">New Lead</option>
                        <option value="no_contact_3d">No Contact (3 days)</option>
                        <option value="no_contact_7d">No Contact (7 days)</option>
                        <option value="stalled_deal">Stalled Deal</option>
                        <option value="manual">Manual Trigger</option>
                      </select>
                    </div>
                    <Button onClick={createSequence} className="w-full">
                      Create Sequence
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sequences.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6">No sequences created yet</p>
                ) : (
                  sequences.map((seq) => (
                    <div key={seq.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{seq.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {seq.trigger_type.replace(/_/g, " ")}
                          </Badge>
                          {seq.is_active && <Badge className="text-xs bg-green-600">Active</Badge>}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={seq.is_active ? "destructive" : "outline"}
                        onClick={() => toggleSequence(seq.id, seq.is_active)}
                      >
                        {seq.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Pre-Built Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-600">Start with these proven templates</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Lead Welcome Series",
                  "No-Response Follow-up",
                  "Deal Closure Sprint",
                  "Customer Onboarding",
                ].map((template) => (
                  <Button key={template} variant="outline" size="sm">
                    Use {template}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" /> Automation Rules
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> New Rule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Automation Rule</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Rule Name</label>
                      <Input
                        placeholder="e.g., Auto-score high-engagement leads"
                        value={newRule.name}
                        onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="What should this rule do?"
                        value={newRule.description}
                        onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      />
                    </div>
                    <Button onClick={createRule} className="w-full">
                      Create Rule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6">No rules created yet</p>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" /> Agent Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Agent Name</label>
                <Input placeholder="e.g., ChatFlow Sales Bot" defaultValue="ChatFlow Agent" />
              </div>
              <div>
                <label className="text-sm font-medium">AI Model</label>
                <select className="w-full p-2 border rounded">
                  <option>Claude 3 Haiku (Fast & Efficient)</option>
                  <option>Claude 3 Sonnet (Balanced)</option>
                  <option>GPT-4 (Most Capable)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Max Daily Actions</label>
                <Input placeholder="100" type="number" defaultValue="100" />
              </div>
              <div>
                <label className="text-sm font-medium">Response Tone</label>
                <select className="w-full p-2 border rounded">
                  <option>Professional</option>
                  <option>Friendly</option>
                  <option>Formal</option>
                  <option>Casual</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked /> Enable Auto Follow-up
                </label>
              </div>
              <Button className="w-full">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
