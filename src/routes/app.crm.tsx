import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/app/crm")({
  component: CRMDashboard,
  head: () => ({ meta: [{ title: "CRM — ChatFlow" }] }),
});

interface PipelineStats {
  stage: string;
  count: number;
  value: number;
}

interface LeadMetrics {
  totalLeads: number;
  highScore: number;
  mediumScore: number;
  lowScore: number;
  avgScore: number;
}

const COLORS = ["#0ea5e9", "#06b6d4", "#14b8a6", "#f59e0b"];

function CRMDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<LeadMetrics>({
    totalLeads: 0,
    highScore: 0,
    mediumScore: 0,
    lowScore: 0,
    avgScore: 0,
  });
  const [pipelineData, setPipelineData] = useState<PipelineStats[]>([]);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadMetrics();
  }, [user]);

  const loadMetrics = async () => {
    try {
      // Get leads with scores
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id);

      if (!leads) {
        setLoading(false);
        return;
      }

      // Calculate metrics
      const highScore = leads.filter((l) => l.ai_score >= 70).length;
      const mediumScore = leads.filter((l) => l.ai_score >= 40 && l.ai_score < 70).length;
      const lowScore = leads.filter((l) => l.ai_score < 40).length;
      const avgScore = leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (l.ai_score || 0), 0) / leads.length) : 0;

      setMetrics({
        totalLeads: leads.length,
        highScore,
        mediumScore,
        lowScore,
        avgScore,
      });

      // Get pipeline distribution
      const stages = new Map<string, { count: number; value: number }>();
      leads.forEach((lead) => {
        const stage = lead.stage || "prospect";
        const existing = stages.get(stage) || { count: 0, value: 0 };
        stages.set(stage, {
          count: existing.count + 1,
          value: existing.value,
        });
      });

      const pipelineStats = Array.from(stages.entries()).map(([stage, data]) => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: data.count,
        value: Math.round(data.value),
      }));

      setPipelineData(pipelineStats);

      setScoreHistory([]);
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading CRM metrics...</div>;
  }

  const scoreDistribution = [
    { name: "High (70+)", value: metrics.highScore, color: COLORS[0] },
    { name: "Medium (40-69)", value: metrics.mediumScore, color: COLORS[1] },
    { name: "Low (<40)", value: metrics.lowScore, color: COLORS[2] },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-sm text-gray-500">Agent-Powered Sales Pipeline</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Users className="h-4 w-4" /> Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.totalLeads}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Target className="h-4 w-4" /> High Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{metrics.highScore}</p>
            <p className="text-xs text-gray-500 mt-1">Ready to close</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Zap className="h-4 w-4" /> Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{metrics.avgScore}</p>
            <p className="text-xs text-gray-500 mt-1">Portfolio health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-orange-600">
              <TrendingUp className="h-4 w-4" /> Medium Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{metrics.mediumScore}</p>
            <p className="text-xs text-gray-500 mt-1">Nurture these</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Distribution by Score</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={scoreDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Score Trends */}
      {scoreHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Score Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreHistory.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="created_at" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ai_score" stroke="#0ea5e9" name="AI Score" dot={false} />
                <Line type="monotone" dataKey="engagement_score" stroke="#06b6d4" name="Engagement" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="actions" className="w-full">
            <TabsList>
              <TabsTrigger value="actions">Next Actions</TabsTrigger>
              <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>
            <TabsContent value="actions" className="space-y-3">
              <p className="text-sm text-gray-600">AI-powered recommendations for immediate actions</p>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-sm">Follow up with high-score leads</p>
                  <p className="text-xs text-gray-600 mt-1">{metrics.highScore} qualified leads ready for engagement</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="risks" className="space-y-3">
              <p className="text-sm text-gray-600">Detect at-risk deals</p>
              <div className="space-y-2">
                <div className="p-3 bg-red-50 rounded border border-red-200">
                  <p className="font-medium text-sm">Stalled opportunities</p>
                  <p className="text-xs text-gray-600 mt-1">{metrics.lowScore} leads show declining engagement</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="opportunities" className="space-y-3">
              <p className="text-sm text-gray-600">Growth opportunities</p>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <p className="font-medium text-sm">Expansion upsells</p>
                  <p className="text-xs text-gray-600 mt-1">Identify cross-sell opportunities in your pipeline</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
