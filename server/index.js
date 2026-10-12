import express from 'express';
import os from 'node:os';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
let requestCount = 0;

const SYSTEM_PROMPT = [
  'You are JARVIS, Tony Stark\'s AI assistant from Iron Man.',
  'Personality: impeccable, dry British wit, unflappably calm, quietly brilliant. Address the user as "sir".',
  'Your replies are spoken aloud, so keep them short and conversational: 1-3 sentences, no lists, no markdown, no emoji.',
  'Be genuinely helpful first; the wit comes second.'
].join(' ');

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: GEMINI_MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.get('/api/telemetry', (_req, res) => {
  const cpuCores = os.cpus().length || 1;
  res.json({
    uptimeSec: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    loadPct: Math.min(100, Math.round((os.loadavg()[0] / cpuCores) * 100)),
    cpuCores,
    queriesServed: requestCount,
    model: GEMINI_MODEL,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post('/api/chat', async (req, res) => {
  requestCount += 1;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        'JARVIS is offline: no GEMINI_API_KEY configured. Add your Google AI Studio key in the secrets panel.'
    });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'A non-empty "messages" array is required.' });
  }

  const contents = messages
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.text === 'string' &&
        m.text.trim()
    )
    .slice(-20)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

  if (contents.length === 0) {
    return res.status(400).json({ error: 'No valid messages in the request.' });
  }
  if (contents[0].role !== 'user') {
    contents.shift(); // Gemini requires the first turn to be from the user
  }

  try {
    const response = await fetch(GEMINI_URL(GEMINI_MODEL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      return res
        .status(502)
        .json({ error: `Gemini API error (${response.status}): ${body.slice(0, 300)}` });
    }

    const data = await response.json();
    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text)
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!reply) {
      return res.status(502).json({ error: 'Gemini returned an empty response.' });
    }
    res.json({ reply });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Gemini: ' + (err?.message || String(err)) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `JARVIS API listening on :${PORT} (model: ${GEMINI_MODEL}, key: ${
      process.env.GEMINI_API_KEY ? 'configured' : 'MISSING'
    })`
  );
});
