// Pushes env vars from .env.local into the linked Vercel project (non-interactive).
// Values are read from disk and passed via --value — never printed.
const fs = require('fs');
const { execFileSync } = require('child_process');

const wanted = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'GEMINI_API_KEY', 'GEMINI_MODEL'];
const env = {};
fs.readFileSync(`${__dirname}/../.env.local`, 'utf8').split(/\r?\n/).forEach((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const targets = process.argv[2] || 'production';
for (const name of wanted) {
  const value = env[name];
  if (!value) {
    console.log(`SKIP ${name} (missing from .env.local)`);
    continue;
  }
  for (const target of targets.split(' ')) {
    try {
      execFileSync('node', [
        process.env.APPDATA
          ? `${process.env.APPDATA}\\npm\\node_modules\\vercel\\dist\\vc.js`
          : 'vercel',
        'env', 'add', name, target, '--value', value, '--yes',
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      console.log(`ADDED ${name} -> ${target}`);
    } catch (error) {
      console.log(`FAILED ${name} -> ${target}: ${String(error.stderr || error.message).slice(0, 150)}`);
    }
  }
}
