// api/chat.js — stable streaming + CORS lock to your Carrd
export const config = { runtime: "nodejs" };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Only allow your live Carrd site to call this API.
// While testing you can set ALLOW_ORIGIN = "*" then switch back.
const ALLOW_ORIGIN = "https://purelyhomecare.carrd.co";

const SYSTEM = `
You are the Purely Homecare Assistant.
Audience: families in Hamilton, North Lanarkshire, South Lanarkshire.
Be warm, clear, concise (short paragraphs + bullets). No medical/legal advice.

Facts to use:
- Areas: Hamilton, North Lanarkshire, South Lanarkshire
- Care types: personal care, medication support, dementia, companionship, respite, overnights, live-in
- Visit lengths: 30/45/60+ mins
- Hours: 7am–10pm, on-call options
- Registration: Care Inspectorate for Scotland
- Contact: hello@purelyhomecare.co.uk
- Enquiry form: https://purelyhomecare.carrd.co/#contact
- Pricing stance: Written quote after assessment; no hidden fees.

Default flow:
1) How it works (enquire → assessment → plan & quote → start → 1-week review)
2) Funding (Scotland SDS Options 1–4) — high level; councils vary
3) Choosing a provider (what good looks like)
Safety:
- Urgent issues → 999, non-urgent medical → 111
- Don’t request/store personal medical details; keep general.
End each reply with ONE next step (email or form link).
`;

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN === "*" ? "*" : (origin === ALLOW_ORIGIN ? origin : "null"));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  try {
    const { messages = [] } = req.body || {};

    // Convert to Chat Completions format
    const chatMessages = [
      { role: "system", content: SYSTEM },
      ...messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "")
      })),
    ];

    // Stream from Chat Completions
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chatMessages,
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return res.status(502).json({ error: "Upstream error", detail: text });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const t = line.trim();
        if (!t || t === "data: [DONE]") continue;
        const data = t.startsWith("data:") ? t.slice(5).trim() : t;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) res.write(encoder.encode(delta));
        } catch {
          /* ignore keepalives */
        }
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
