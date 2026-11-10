// riff's organizing brain — prompt, JSON schema and sanitizer.
// Server-side only: imported by /api/organize so the Gemini key never reaches the browser.
//
// The prompt rules below are load-bearing (see vault guide §3) — keep them if you rewrite it.

export const ORGANIZING_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '2 to 5 words, no full stop' },
    bullets: {
      type: 'array',
      items: { type: 'string', description: 'one idea, max ~14 words' },
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'short imperative starting with a verb' },
          priority: { type: 'string', enum: ['high', 'normal'] },
          category: { type: 'string', enum: ['work', 'school', 'personal', 'other'] },
          due_hint: { type: 'string', description: 'timing mentioned by the speaker, "" when none' },
        },
        required: ['title', 'priority', 'category', 'due_hint'],
      },
    },
  },
  required: ['title', 'bullets', 'tasks'],
};

const RULES = `
You are the organizing mind inside a personal note app. A person talks or types a messy thought.
Turn it into a clean note and pull out to-do items. Follow these rules exactly:

1. Preserve the speaker's meaning and their own vocabulary. Never invent names, dates or details.
2. Drop only noise: filler words, false starts, duplicates. Merge repeats into one bullet.
3. Give 2 to 8 bullets, one idea each, at most ~14 words. Put related points next to each other
   and lead with what the person cared about most.
4. Tasks are only concrete actions the person must do, each starting with a verb. Ideas and
   feelings are not tasks. An empty tasks array is valid and expected for pure rambling.
5. Judge each task's category from the task itself:
   - work: job, clients, boss, meetings, shifts, work invoices, interviews
   - school: classes, assignments, exams, teachers, course forms
   - personal: home, family, health, appointments, errands, money admin, pets, friends
   - other: only when nothing above fits. If ambiguous, prefer personal.
6. No advice, no encouragement, no summary line. Return only the structure.

The speaker's words are fenced below between triple quotes, so stray quotes can never break
the prompt.

"""{{text}}"""
`;

export function buildPrompt(text) {
  return RULES.replace('{{text}}', text);
}

// Gemini responseSchema uses an OpenAPI subset with UPPERCASE types.
export function toGeminiSchema(schema) {
  const clone = (node) => {
    if (Array.isArray(node)) return node.map(clone);
    if (!node || typeof node !== 'object') return node;
    const out = { type: String(node.type || 'string').toUpperCase() };
    if (node.description) out.description = node.description;
    if (node.enum) out.enum = node.enum;
    if (node.required) out.required = node.required;
    if (node.items) out.items = clone(node.items);
    if (node.properties) {
      out.properties = Object.fromEntries(
        Object.entries(node.properties).map(([k, v]) => [k, clone(v)])
      );
      if (!out.propertyOrdering) out.propertyOrdering = Object.keys(node.properties);
    }
    return out;
  };
  return clone(schema);
}

// Schema *plus* sanitizer — the sanitizer guarantees an insertable record every time,
// even when the model drifts (missing title, unknown category, null due_hint).
export function organizeSanitize(result, { sourceText = '' } = {}) {
  const listed = (value) =>
    (Array.isArray(value) ? value : []).map((item) => (typeof item === 'string' ? item.trim() : ''));
  const text = (value, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);

  const title = text(result?.title) || 'Untitled note';
  const bullets = listed(result?.bullets).filter(Boolean);

  const tasks = (Array.isArray(result?.tasks) ? result.tasks : [])
    .map((task) => ({
      title: text(task?.title),
      done: false,
      priority: task?.priority === 'high' ? 'high' : 'normal',
      category: ['work', 'school', 'personal'].includes(task?.category) ? task.category : 'personal',
      due_hint: text(task?.due_hint),
    }))
    .filter((task) => task.title);

  return { title, bullets, tasks, source_text: String(sourceText || '') };
}
