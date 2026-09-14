/**
 * Fails if a credential has reached anywhere it could be published: tracked
 * files, git history, or the client-side bundle.
 *
 * Run it before a deploy, or wire it into CI. It looks for credential *shapes*,
 * so it catches a key nobody told it about.
 */
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

interface Pattern {
  name: string;
  re: RegExp;
}

const PATTERNS: Pattern[] = [
  { name: 'Supabase secret key', re: /sb_secret_[A-Za-z0-9_-]{12,}/ },
  { name: 'Supabase publishable key', re: /sb_publishable_[A-Za-z0-9_-]{12,}/ },
  { name: 'Supabase/JWT token', re: /eyJhbGciOiJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{20,}\./ },
  { name: 'Postgres URL with password', re: /postgres(?:ql)?:\/\/[^\s:]+:(?!password\b)[^\s@]{6,}@/ },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Generic bearer secret', re: /(?:api[_-]?key|secret|token)['"\s:=]{1,4}[A-Za-z0-9_\-]{32,}/i },
];

/** Placeholders in docs and templates are the point of those files. */
const ALLOWED_PATHS = [/^\.env\.example$/, /^README\.md$/, /^scripts\/scan-secrets\.ts$/];

let failures = 0;

function report(where: string, name: string, sample: string) {
  failures += 1;
  console.error(`  ✗ ${name}\n    in ${where}\n    ${sample.slice(0, 60)}…`);
}

function scanText(where: string, text: string) {
  for (const p of PATTERNS) {
    const m = text.match(p.re);
    if (m) report(where, p.name, m[0]);
  }
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  console.log('Scanning tracked files…');
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const file of tracked) {
    if (ALLOWED_PATHS.some((re) => re.test(file))) continue;
    let text: string;
    try {
      text = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }
    scanText(file, text);
  }

  console.log('Scanning git history…');
  const history = execSync('git log --all -p --no-color', { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  for (const p of PATTERNS) {
    const m = history.match(p.re);
    if (m) report('git history', p.name, m[0]);
  }

  // Anything in the client bundle is served to every visitor. Only NEXT_PUBLIC_*
  // values belong there, and none of those are secrets.
  const clientDir = path.join('.next', 'static');
  const bundles = await walk(clientDir);
  if (bundles.length) {
    console.log(`Scanning ${bundles.length} client bundle files…`);
    for (const file of bundles) {
      if (!/\.(js|css|map)$/.test(file)) continue;
      const text = await fs.readFile(file, 'utf8').catch(() => '');
      scanText(file, text);
    }
  } else {
    console.log('No client bundle found — run `npm run build` first to scan it.');
  }

  if (failures) {
    console.error(`\n${failures} potential secret${failures === 1 ? '' : 's'} found.\n`);
    process.exit(1);
  }
  console.log('\nNo secrets found in tracked files, history, or the client bundle.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
