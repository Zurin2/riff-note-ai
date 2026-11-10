import { createClient } from '@/utils/supabase/server';
import { buildPrompt, toGeminiSchema, ORGANIZING_SCHEMA, organizeSanitize } from '@/lib/organizer';

// Temporary diagnostic: replays the exact submit flow for the signed-in user,
// reporting each step separately, then cleans up generated rows.
// Visit http://localhost:3000/api/diagnose while signed in.
export async function GET() {
  const steps = [];
  const cleanupIds = { messages: [], notes: [] };
  const supabase = await createClient();

  // Authenticate
  const { data: auth, error: authError } = await supabase.auth.getUser();
  steps.push({
    step: 'auth',
    ok: Boolean(auth?.user),
    detail: auth?.user
      ? `signed in as ${auth.user.email}`
      : (authError?.message || 'no session — browser cookie not forwarded'),
  });
  if (!auth?.user) return Response.json({ steps }, { status: 401 });

  // Step 1: user message
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({ role: 'user', content: 'diagnose ping' })
      .select('id')
      .single();
    steps.push({
      step: 'insert_message',
      ok: !error,
      detail: error ? error.message : `row ${data?.id}`,
    });
    if (data) cleanupIds.messages.push(data.id);
  } catch (error) {
    steps.push({ step: 'insert_message', ok: false, detail: error.message });
  }

  // Step 2: organize (Gemini)
  let organized = null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      steps.push({ step: 'organize', ok: false, detail: 'GEMINI_API_KEY missing/placeholder' });
    } else {
      const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt('remind me to buy milk tomorrow morning') }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: toGeminiSchema(ORGANIZING_SCHEMA),
            },
          }),
        }
      );
      const bodyText = await response.text();
      if (!response.ok) {
        steps.push({ step: 'organize', ok: false, detail: `gemini ${response.status}: ${bodyText.slice(0, 300)}` });
      } else {
        const parsed = JSON.parse(bodyText);
        const raw = parsed?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '';
        organized = organizeSanitize(JSON.parse(raw), { sourceText: 'remind me to buy milk tomorrow morning' });
        steps.push({
          step: 'organize',
          ok: true,
          detail: `model=${model} title="${organized.title}" bullets=${organized.bullets.length} tasks=${organized.tasks.length}`,
        });
      }
    }
  } catch (error) {
    steps.push({ step: 'organize', ok: false, detail: error.message });
  }

  let noteId = null;
  if (organized) {
    // Step 3: note
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: organized.title,
          bullets: organized.bullets,
          source_text: organized.source_text,
          task_count: organized.tasks.length,
        })
        .select('id')
        .single();
      steps.push({ step: 'insert_note', ok: !error, detail: error ? error.message : `row ${data?.id}` });
      if (data) {
        noteId = data.id;
        cleanupIds.notes.push(data.id);
      }
    } catch (error) {
      steps.push({ step: 'insert_note', ok: false, detail: error.message });
    }

    // Step 4: tasks
    if (noteId && organized.tasks.length > 0) {
      try {
        const rows = organized.tasks.map((task) => ({ ...task, note_id: noteId }));
        const { data, error } = await supabase.from('tasks').insert(rows).select('id');
        steps.push({
          step: 'insert_tasks',
          ok: !error,
          detail: error ? error.message : `${data?.length || 0} rows inserted`,
        });
      } catch (error) {
        steps.push({ step: 'insert_tasks', ok: false, detail: error.message });
      }
    }

    // Step 5: assistant message
    if (noteId) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({ role: 'assistant', content: organized.title, note_id: noteId })
          .select('id')
          .single();
        steps.push({
          step: 'insert_reply',
          ok: !error,
          detail: error ? error.message : `row ${data?.id}`,
        });
        if (data) cleanupIds.messages.push(data.id);
      } catch (error) {
        steps.push({ step: 'insert_reply', ok: false, detail: error.message });
      }
    }
  }

  // Cleanup note (cascades tasks) + messages
  const removed = [];
  for (const id of cleanupIds.notes) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    removed.push(error ? `note ${id} FAILED: ${error.message}` : `note ${id}`);
  }
  for (const id of cleanupIds.messages) {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    removed.push(error ? `message ${id} FAILED: ${error.message}` : `message ${id}`);
  }

  return Response.json({ steps, cleanup: removed });
}
