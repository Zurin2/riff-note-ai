// Isolation probe — does NOT print any secret. Checks:
//  1. Gemini key validity + model name (the exact call /api/organize makes)
//  2. Supabase URL + anon key health
const fs = require('fs');
const env = {};
fs.readFileSync(`${__dirname}/../.env.local`, 'utf8').split(/\r?\n/).forEach((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

(async () => {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }] }),
    });
    const text = await response.text();
    console.log(`GEMINI_STATUS=${response.status}`);
    console.log(`GEMINI_BODY=${text.slice(0, 400).replace(/\s+/g, ' ')}`);
  } catch (error) {
    console.log(`GEMINI_FETCH_ERR=${(error.cause && error.cause.code) || error.message}`);
  }

  try {
    const base = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    const health = await fetch(`${base}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    });
    console.log(`SUPABASE_STATUS=${health.status} BODY=${(await health.text()).slice(0, 150)}`);
  } catch (error) {
    console.log(`SUPABASE_FETCH_ERR=${(error.cause && error.cause.code) || error.message}`);
  }
})();
