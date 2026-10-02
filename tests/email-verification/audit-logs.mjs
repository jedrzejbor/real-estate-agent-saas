import { execFileSync } from 'node:child_process';

const mailpitBase = 'http://localhost:8125/api/v1';
const composeFile = 'tests/email-verification/compose.yml';

const inboxResponse = await fetch(`${mailpitBase}/messages`);
if (!inboxResponse.ok) throw new Error('Mailpit is unavailable');
const inbox = await inboxResponse.json();

const tokens = new Set();
for (const summary of inbox.messages) {
  const detailResponse = await fetch(`${mailpitBase}/message/${summary.ID}`);
  if (!detailResponse.ok) throw new Error('Could not read Mailpit message');
  const message = await detailResponse.json();
  for (const link of (message.Text ?? '').match(/https?:\/\/[^\s]+/g) ?? []) {
    try {
      const url = new URL(link);
      const token = url.hash.startsWith('#token=')
        ? new URLSearchParams(url.hash.slice(1)).get('token')
        : url.searchParams.get('token');
      if (token) tokens.add(token);
    } catch {
      // Plain text may contain strings that resemble URLs.
    }
  }
}

if (tokens.size === 0) throw new Error('No authentication links found in Mailpit');

const logs = execFileSync(
  'docker',
  ['compose', '-f', composeFile, 'logs', '--no-color', 'api', 'web'],
  { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 },
);
const leakedCount = [...tokens].filter((token) => logs.includes(token)).length;
if (leakedCount > 0) {
  throw new Error(`${leakedCount} raw authentication token(s) found in application logs`);
}
process.stdout.write(`Checked ${tokens.size} one-time token(s); none appeared in API or web logs.\n`);
