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
 * Auto-Followup Agent
 * Suggests and schedules follow-ups for stalled leads
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, daysThreshold = 3 } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get user config
    const { data: config } = await supabase
      .from("agent_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!config) {
      return new Response(
        JSON.stringify({ error: "Agent not configured" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Find leads that need follow-up
    const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, email, stage, last_interaction_at")
      .eq("user_id", userId)
      .or(
        `last_interaction_at.lt.${cutoffDate.toISOString()},last_interaction_at.is.null`
      );

    const followups = [];

    for (const lead of leads || []) {
      // Check if email sequence applies
      const { data: sequences } = await supabase
        .from("email_sequences")
        .select("id, name")
        .eq("user_id", userId)
        .eq("trigger_type", "no_contact_3d")
        .eq("is_active", true)
        .limit(1);

      if (sequences && sequences.length > 0) {
        const sequence = sequences[0];

        // Get first step of sequence
        const { data: firstStep } = await supabase
          .from("email_sequence_steps")
          .select("*")
          .eq("sequence_id", sequence.id)
          .eq("step_number", 1)
          .single();

        if (firstStep) {
          // Create email draft
          const { data: emailDraft } = await supabase
            .from("email_drafts")
            .insert({
              user_id: userId,
              to_email: lead.email,
              subject: firstStep.subject,
              body_markdown: firstStep.body_markdown,
              lead_id: lead.id,
            })
            .select()
            .single();

          // Create reminder for user to send
          await supabase.from("reminders").insert({
            user_id: userId,
            message: `Follow up with ${lead.name} - ${sequence.name}`,
            due_time: new Date().toISOString(),
          });

          // Create insight
          await supabase.from("ai_insights").insert({
            user_id: userId,
            lead_id: lead.id,
            insight_type: "next_action",
            title: `Suggested follow-up for ${lead.name}`,
            description: `No contact for ${daysThreshold}+ days`,
            recommendation: "Send prepared email",
            confidence_score: 0.85,
          });

          // Log activity
          await supabase.from("agent_activity_log").insert({
            user_id: userId,
            action_type: "followup_suggested",
            lead_id: lead.id,
            status: "pending",
            details: {
              sequence_id: sequence.id,
              email_draft_id: emailDraft?.id,
            },
          });

          followups.push({
            leadId: lead.id,
            leadName: lead.name,
            emailDraftId: emailDraft?.id,
            sequenceName: sequence.name,
            status: "suggested",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        userId,
        followupsCount: followups.length,
        followups,
        message: `${followups.length} follow-ups suggested`,
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
