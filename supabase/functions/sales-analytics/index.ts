import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

/**
 * Sales Analytics & Insights Engine
 * Generates insights about deals, pipeline health, and recommendations
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get all leads
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", userId);

    // Calculate pipeline statistics
    const stats = {
      total_leads: leads?.length || 0,
      high_score_leads: leads?.filter((l) => l.ai_score >= 70).length || 0,
      medium_score_leads: leads?.filter(
        (l) => l.ai_score >= 40 && l.ai_score < 70
      ).length || 0,
      low_score_leads: leads?.filter((l) => l.ai_score < 40).length || 0,
      avg_engagement: leads?.length
        ? Math.round(
            leads.reduce((sum, l) => sum + (l.engagement_score || 0), 0) /
              leads.length
          )
        : 0,
    };

    const insights = [];

    // Insight 1: High-value leads need attention
    const highValueLeads = leads?.filter(
      (l) =>
        l.ai_score >= 70 &&
        (!l.last_interaction_at ||
          Date.now() - new Date(l.last_interaction_at).getTime() >
            7 * 24 * 60 * 60 * 1000)
    ) || [];

    if (highValueLeads.length > 0) {
      insights.push({
        insight_type: "opportunity",
        title: "High-value leads awaiting engagement",
        description: `${highValueLeads.length} qualified leads have not been contacted in over a week`,
        recommendation: "Schedule meetings or send personalized messages to maintain momentum",
        confidence_score: 0.9,
        related_leads: highValueLeads.map((l) => l.id),
      });
    }

    // Insight 2: Stalled deals
    const stalledLeads = leads?.filter(
      (l) =>
        !l.stage ||
        l.stage === "lead" ||
        l.stage === "prospect"
    ).filter(
      (l) =>
        l.last_interaction_at &&
        Date.now() - new Date(l.last_interaction_at).getTime() >
          30 * 24 * 60 * 60 * 1000
    ) || [];

    if (stalledLeads.length > 0) {
      insights.push({
        insight_type: "risk_alert",
        title: "Stalled opportunities detected",
        description: `${stalledLeads.length} deals have been inactive for 30+ days`,
        recommendation: "Consider re-engagement campaigns or mark as lost",
        confidence_score: 0.85,
        related_leads: stalledLeads.map((l) => l.id),
      });
    }

    // Insight 3: Rising stars (improving engagement)
    const improvingLeads = leads?.filter(
      (l) => l.ai_score >= 60 && l.engagement_score > 50
    ) || [];

    if (improvingLeads.length > 0) {
      insights.push({
        insight_type: "opportunity",
        title: "Emerging high-potential leads",
        description: `${improvingLeads.length} leads show strong engagement trends`,
        recommendation: "Accelerate sales cycle with these prospects",
        confidence_score: 0.8,
        related_leads: improvingLeads.map((l) => l.id),
      });
    }

    // Store insights
    for (const insight of insights) {
      await supabase.from("ai_insights").insert({
        user_id: userId,
        insight_type: insight.insight_type,
        title: insight.title,
        description: insight.description,
        recommendation: insight.recommendation,
        confidence_score: insight.confidence_score,
        is_actioned: false,
      });
    }

    return new Response(
      JSON.stringify({
        userId,
        stats,
        insights: insights.length,
        details: insights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
