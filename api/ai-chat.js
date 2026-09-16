// /api/ai-chat.js
//
// The browser never sees a Gemini or Groq API key — it POSTs a system
// prompt, a message history, and which "purpose" this is for (chat,
// recipes, or dailyQuestion, each with its own separate keys so the
// three features never compete for the same rate limit, same as
// before). This function holds the real keys as Vercel environment
// variables and makes the actual calls to Gemini, then Groq, itself.
//
// Env vars to set in Vercel (Project → Settings → Environment Variables):
//   GEMINI_KEY_CHAT, GROQ_KEY_CHAT
//   GEMINI_KEY_RECIPES, GROQ_KEY_RECIPES
//   GEMINI_KEY_DAILYQUESTION, GROQ_KEY_DAILYQUESTION
// Any of these can be left unset — this falls through to the next
// provider, then returns an error, the same fallback chain as before.
// A plain GEMINI_KEY / GROQ_KEY (no suffix) can be set too, used as a
// shared fallback for any purpose that doesn't have its own key set.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { systemPrompt, messages, purpose } = req.body || {};
  if (!systemPrompt || !Array.isArray(messages)) {
    res.status(400).json({ error: "Missing systemPrompt or messages" });
    return;
  }

  const purposeKey = ["chat", "recipes", "dailyquestion"].includes(String(purpose).toLowerCase())
    ? String(purpose).toUpperCase()
    : "CHAT";
  const geminiKey = process.env[`GEMINI_KEY_${purposeKey}`] || process.env.GEMINI_KEY;
  const groqKey = process.env[`GROQ_KEY_${purposeKey}`] || process.env.GROQ_KEY;

  const errors = [];

  if (geminiKey) {
    try {
      const text = await callGemini(geminiKey, systemPrompt, messages);
      res.status(200).json({ text, provider: "gemini" });
      return;
    } catch (err) {
      errors.push("Gemini: " + err.message);
    }
  }

  if (groqKey) {
    try {
      const text = await callGroq(groqKey, systemPrompt, messages);
      res.status(200).json({ text, provider: "groq" });
      return;
    } catch (err) {
      errors.push("Groq: " + err.message);
    }
  }

  res.status(502).json({
    error: "The AI couldn't respond right now.",
    details: errors.length ? errors : ["No Gemini or Groq key configured for this purpose on the server."]
  });
};

async function callGemini(apiKey, systemPrompt, historyMessages) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
  const contents = historyMessages.map((m) => ({
    role: m.role === "ai" ? "model" : "user",
    parts: [{ text: m.text || "" }]
  }));
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: systemPrompt }] } })
  });
  if (!r.ok) {
    let detail = "";
    try {
      const j = await r.json();
      detail = (j && j.error && j.error.message) || "";
    } catch (e) { /* ignore */ }
    throw new Error(`status ${r.status}. ${detail}`);
  }
  const data = await r.json();
  const text =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;
  if (!text) throw new Error("empty response (may have been blocked by a safety filter)");
  return text;
}

async function callGroq(apiKey, systemPrompt, historyMessages) {
  const messages = [{ role: "system", content: systemPrompt }].concat(
    historyMessages.map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text || "" }))
  );
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({ model: "openai/gpt-oss-120b", messages })
  });
  if (!r.ok) {
    let detail = "";
    try {
      const j = await r.json();
      detail = (j && j.error && j.error.message) || "";
    } catch (e) { /* ignore */ }
    throw new Error(`status ${r.status}. ${detail}`);
  }
  const data = await r.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error("empty response");
  return text;
}
