import { createClient } from '@/utils/supabase/server';
import { buildPrompt, toGeminiSchema, ORGANIZING_SCHEMA, organizeSanitize } from '@/lib/organizer';

const RATE_LIMIT = 30; // organizes per user per window
const RATE_WINDOW_MS = 60_000;

// Soft per-user throttle so one account can't drain the Gemini quota.
// Fails open by design: if the table is missing or the query errors, the
// request proceeds exactly as it did before this check existed.
async function isRateLimited(supabase, userId) {
  try {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from('organize_calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if (error) return false;
    if ((count || 0) >= RATE_LIMIT) return true;

    const { error: insertError } = await supabase.from('organize_calls').insert({ user_id: userId });
    if (insertError) return false;
    // Opportunistic trim so the table never grows past one window per user.
    await supabase.from('organize_calls').delete().lt('created_at', since);
    return false;
  } catch {
    return false;
  }
}

// The organizing brain. One stateless LLM call per ramble - no chat memory,
// no web grounding. The Gemini key lives only here, server-side.
export async function POST(request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (await isRateLimited(supabase, auth.user.id)) {
    return Response.json(
      { error: 'Too many requests. Give it a minute, then try again.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  let text = '';
  try {
    ({ text = '' } = await request.json());
  } catch {
    return Response.json({ error: 'Bad request body.' }, { status: 400 });
  }
  text = typeof text === 'string' ? text.trim() : '';
  if (!text) return Response.json({ error: 'Nothing was said.' }, { status: 400 });
  if (text.length > 6000) text = text.slice(0, 6000);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return Response.json({ error: 'Organizer is not configured (GEMINI_API_KEY).' }, { status: 503 });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let data;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(text) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: toGeminiSchema(ORGANIZING_SCHEMA),
        },
      }),
    });
    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Gemini ${response.status} ${message.slice(0, 200)}`);
    }
    data = await response.json();
  } catch (error) {
    console.error('organize: llm call failed', error?.message || error);
    return Response.json({ error: 'Organizing failed. Try again.' }, { status: 502 });
  }

  const raw = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('');
  let parsed = {};
  try {
    parsed = JSON.parse(raw || '{}');
  } catch {
    return Response.json({ error: 'Organizer returned unreadable output.' }, { status: 502 });
  }

  return Response.json(organizeSanitize(parsed, { sourceText: text }));
}
