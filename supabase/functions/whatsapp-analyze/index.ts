// AI categorization of WhatsApp messages with Bengali / Banglish support.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a multilingual productivity assistant.
You will receive WhatsApp chat messages. They may be in English, Bengali (বাংলা), or Banglish (Bengali written in Latin letters / transliteration). Common slang & shortcuts: "janaiyen/janaben"=let me know, "korbo"=will do, "korben"=please do, "ki"=what, "kobe"=when, "ekhon"=now, "kal"=tomorrow or yesterday, "aaj"=today, "porshu"=day after, "fb"=facebook, "msg"=message, "plz/pls"=please, "thik ache"=ok, "deadline"=due date, "meeting"=meeting, "call dao"=give a call, "pathao"=send.
Even very short texts (1-3 words) must be classified. If unsure, choose "note".
For each message return EXACTLY one category:
- "task": an action someone must do
- "note": informational / decision / recap
- "email": something that should be drafted as an email
- "event": time-bound calendar event (meeting, call, demo)
- "lead": someone showing interest in a product/service
- "skip": small talk, greetings, emojis only
Extract structured fields where applicable: title, description, due_date (ISO 8601 if you can infer one, else null), priority (low|medium|high), to_email, subject, body, start_time, end_time, lead_name, score (0-100).`;

interface InMsg { id: string; sender?: string; sent_at?: string; text: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json() as { messages: InMsg[] };
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");
    if (!messages?.length) return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Compact prompt
    const userPayload = messages.map((m, i) => `#${i} [${m.sender ?? "?"}] ${m.text}`).join("\n");

    const tool = {
      type: "function",
      function: {
        name: "categorize_messages",
        description: "Classify each message",
        parameters: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  category: { type: "string", enum: ["task", "note", "email", "event", "lead", "skip"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  due_date: { type: ["string", "null"] },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  to_email: { type: ["string", "null"] },
                  subject: { type: ["string", "null"] },
                  body: { type: ["string", "null"] },
                  start_time: { type: ["string", "null"] },
                  end_time: { type: ["string", "null"] },
                  lead_name: { type: ["string", "null"] },
                  score: { type: ["number", "null"] },
                },
                required: ["index", "category", "title"],
                additionalProperties: false,
              },
            },
          },
          required: ["results"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Classify each of these WhatsApp messages. Refer to them by their #index.\n\n${userPayload}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "categorize_messages" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { results: [] };
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
