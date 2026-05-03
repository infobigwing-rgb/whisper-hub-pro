// Parse a natural-language voice/text command into a structured action.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You convert short user commands (English, Bengali বাংলা, or Banglish/transliterated Bangla) into ONE structured action.

ACTIONS: reminder, task, note, event, lead, email, search. Pick exactly ONE.

BANGLISH/BENGALI TIME GLOSSARY (case-insensitive, accept spelling variants):
- Day refs: "aaj/aj/আজ"=today, "kal/kaal/আগামীকাল/কাল"=tomorrow (or yesterday by context — assume FUTURE unless past tense),
  "porshu/porsu/পরশু"=day after tomorrow, "tarporshu"=3 days from now, "ekhon/akhon/এখন"=now,
  "raat-e/রাতে"=at night (~21:00), "shokal/সকাল"=morning (~09:00), "dupur/দুপুর"=noon (~13:00),
  "bikel/বিকাল/বিকেল"=afternoon (~16:00), "shondha/সন্ধ্যা"=evening (~18:30).
- Weekdays (Banglish): "shombar"=Mon, "mongolbar"=Tue, "budhbar"=Wed, "brihospotibar"=Thu,
  "shukrobar/jummabar"=Fri, "shonibar"=Sat, "robibar"=Sun. Resolve to the NEXT occurrence of that weekday from current_iso.
- When two day refs combine (e.g. "porshu Friday 2pm"), the WEEKDAY wins: pick the next Friday on/after (current_date + 2 days), at 14:00.
- Time tokens: "3pm"=15:00, "3 ta"=03:00 unless context says PM, "shokal 9 ta"=09:00, "raat 10 ta"=22:00.
- Action verbs: "mone koriye dao/মনে করিয়ে দাও"=remind, "kaj/কাজ"=task, "note rakho/নোট"=note,
  "meeting/মিটিং"=event, "email pathao/ইমেইল পাঠাও"=email, "khujo/খোঁজো"=search.

RULES:
- Resolve relative dates against current_iso. Output ISO 8601 in UTC (Z) but interpret times in the user's local sense (assume Asia/Dhaka, UTC+6, unless current_iso suggests otherwise — convert local→UTC by subtracting 6h).
- Always include a clear human "title" summarizing the intent.
- For reminders/events with a date, ALWAYS fill due_iso (reminder) or start_iso (event).
- For tasks with deadline language ("by Friday", "শুক্রবার এর মধ্যে"), set due_iso.
- If unsure of action, default to "note".`;

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
