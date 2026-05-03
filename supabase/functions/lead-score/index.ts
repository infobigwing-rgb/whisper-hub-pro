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

interface LeadData {
  name: string;
  email: string;
  company: string;
  interactions_count: number;
  days_since_contact: number;
  engagement_level: "high" | "medium" | "low";
}

/**
 * AI Lead Scoring Engine
 * Evaluates leads based on interaction patterns and engagement
 */
function scoreLeadAI(data: LeadData): { score: number; reasoning: string } {
  let score = 50; // Base score
  let reasoning = "Lead evaluation: ";

  // Email completeness
  if (data.email && data.company) {
    score += 15;
    reasoning += "Complete profile. ";
  }

  // Recent interaction bonus
  if (data.days_since_contact < 7) {
    score += 20;
    reasoning += "Recent engagement. ";
  } else if (data.days_since_contact < 14) {
    score += 10;
    reasoning += "Recent contact. ";
  } else if (data.days_since_contact > 30) {
    score -= 15;
    reasoning += "Stalled lead. ";
  }

  // Interaction frequency
  if (data.interactions_count > 5) {
    score += 15;
    reasoning += "High engagement. ";
  } else if (data.interactions_count > 2) {
    score += 8;
    reasoning += "Moderate engagement. ";
  }

  // Engagement level
  if (data.engagement_level === "high") {
    score += 15;
  } else if (data.engagement_level === "medium") {
    score += 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasoning,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { leadId, userData } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "Missing leadId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch lead with interactions
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (!lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get interaction stats
    const { data: interactions } = await supabase
      .from("lead_interactions")
      .select("interaction_date")
      .eq("lead_id", leadId)
      .order("interaction_date", { ascending: false });

    const lastInteractionDate = interactions?.[0]?.interaction_date;
    const daysSinceContact = lastInteractionDate
      ? Math.floor(
          (Date.now() - new Date(lastInteractionDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999;

    // Score the lead
    const leadData: LeadData = {
      name: lead.name,
      email: lead.email || "",
      company: lead.company || "",
      interactions_count: interactions?.length || 0,
      days_since_contact: daysSinceContact,
      engagement_level: daysSinceContact < 14 ? "high" : daysSinceContact < 30 ? "medium" : "low",
    };

    const { score, reasoning } = scoreLeadAI(leadData);

    // Calculate conversion probability
    const conversionProb = score > 70 ? 0.7 : score > 50 ? 0.4 : 0.15;

    // Update lead with new scores
    await supabase
      .from("leads")
      .update({
        ai_score: score,
        engagement_score: Math.floor((leadData.interactions_count / 10) * 100),
        conversion_probability: conversionProb,
        last_interaction_at: lastInteractionDate,
      })
      .eq("id", leadId);

    // Log the scoring activity
    await supabase.from("agent_activity_log").insert({
      user_id: lead.user_id,
      action_type: "lead_scored",
      lead_id: leadId,
      status: "completed",
      details: { score, reasoning, conversion_probability: conversionProb },
    });

    return new Response(
      JSON.stringify({
        leadId,
        score,
        conversionProbability: conversionProb,
        reasoning,
        interactionCount: leadData.interactions_count,
        daysSinceContact: daysSinceContact,
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
