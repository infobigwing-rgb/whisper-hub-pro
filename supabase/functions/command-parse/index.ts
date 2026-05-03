// Parse a natural-language voice/text command into a structured action.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You convert short user commands (English, Bengali বাংলা, or Banglish) into ONE structured action.
Banglish hints: "kal"=tomorrow, "aaj"=today, "porshu"=day after tomorrow, "ekhon"=now, "kobe"=when, "mone koriye dao"=remind me, "kaaj"=task, "note rakho"=add note, "lead"=lead, "email pathao"=send email, "meeting"=event.
Always pick exactly ONE action type from: reminder, task, note, event, lead, email, search.
Resolve relative dates against the provided current_iso (UTC).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, current_iso } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");
    if (!text) return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const tool = {
      type: "function",
      function: {
        name: "build_action",
        description: "Build a single structured action",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["reminder", "task", "note", "event", "lead", "email", "search"] },
            title: { type: "string" },
            description: { type: "string" },
            due_iso: { type: ["string", "null"] },
            start_iso: { type: ["string", "null"] },
            end_iso: { type: ["string", "null"] },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            to_email: { type: ["string", "null"] },
            subject: { type: ["string", "null"] },
            body: { type: ["string", "null"] },
            lead_name: { type: ["string", "null"] },
            company: { type: ["string", "null"] },
            query: { type: ["string", "null"] },
          },
          required: ["action", "title"],
          additionalProperties: false,
        },
      },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `current_iso=${current_iso ?? new Date().toISOString()}\ncommand: ${text}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "build_action" } },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("AI error", r.status, t);
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI ${r.status}`);
    }
    const data = await r.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    return new Response(JSON.stringify({ action: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
