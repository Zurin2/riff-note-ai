// Full-pipeline probe: real prompt + JSON schema + sanitizer, but hitting
// Gemini directly from Node so failures never come from the Next.js layer.
// Prints no secrets and no raw keys.
import { readFileSync } from 'node:fs';
import { buildPrompt, toGeminiSchema, ORGANIZING_SCHEMA, organizeSanitize } from '../src/lib/organizer.js';

const env = {};
readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  });

const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const ramble =
  "okay so um I need to email my boss about swapping shifts this week, " +
  "buy milk on the way home, study chapters 5 and 6 for the exam on Friday, " +
  "and book the dentist about that crown thing";

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(ramble) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(ORGANIZING_SCHEMA),
      },
    }),
  }
);

const body = await response.text();
console.log(`STATUS=${response.status} MODEL=${model}`);
if (!response.ok) {
  console.log(`ERROR_BODY=${body.slice(0, 500).replace(/\s+/g, ' ')}`);
  process.exit(1);
}
const parsed = JSON.parse(body);
const raw = parsed.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('');
const result = organizeSanitize(JSON.parse(raw), { sourceText: ramble });
console.log(`TITLE="${result.title}"`);
console.log(`BULLETS=${result.bullets.length} TASKS=${result.tasks.length}`);
for (const task of result.tasks) {
  console.log(`  - [${task.priority}/${task.category}] ${task.title}${task.due_hint ? ` (when: ${task.due_hint})` : ''}`);
}
