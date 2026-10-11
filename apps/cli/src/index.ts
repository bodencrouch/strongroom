#!/usr/bin/env node
// Strongroom command line. It wraps the official Bitwarden CLI (`bw`), which keeps
// authentication and vault cryptography. This tool only reads items that `bw`
// has already decrypted and never prints passwords or one-time secrets.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  buildHealthReport,
  findExposed,
  hibpRangeFetch,
  type HealthItem,
} from '../../../packages/shared/src/health.ts';
import { totpFromField } from '../../../packages/shared/src/totp.ts';

const run = promisify(execFile);

interface BwItem {
  id: string;
  name: string;
  type: number;
  login?: { password?: string | null; totp?: string | null; uris?: { uri?: string | null }[] };
}

const USAGE = `strongroom - extras for your Bitwarden vault

Usage:
  strongroom totp <search>        Print the current one-time code for a matching login
  strongroom attach <file> <item-id>
                            Attach a file to a login. Needs an account or server
                            that allows attachments; Strongroom does not change that.
  strongroom health [--breaches]  Report reused, weak and unencrypted-website logins.
                            --breaches also checks passwords against known leaks
                            (sends only 5-character hash prefixes).

Unlock first, then export the session for this shell:
  export BW_SESSION="$(bw unlock --raw)"`;

async function bwItems(search?: string): Promise<BwItem[]> {
  const session = process.env.BW_SESSION;
  if (!session) throw new Error('Vault is locked. Run: export BW_SESSION="$(bw unlock --raw)"');
  const args = ['list', 'items'];
  if (search) args.push('--search', search);
  try {
    const { stdout } = await run('bw', args, {
      env: { ...process.env, BW_SESSION: session },
      maxBuffer: 256 * 1024 * 1024,
    });
    const items: unknown = JSON.parse(stdout);
    return Array.isArray(items) ? (items as BwItem[]) : [];
  } catch {
    // Deliberately generic: error output from `bw` can echo sensitive arguments.
    throw new Error('Could not read the vault with bw. Check that it is installed and unlocked.');
  }
}

async function totp(search: string | undefined) {
  if (!search) throw new Error('Give a search term, e.g. strongroom totp github');
  const logins = (await bwItems(search)).filter((item) => item.type === 1 && item.login?.totp);
  if (logins.length === 0) throw new Error('No login with a one-time secret matches that search.');
  const exact = logins.filter((item) => item.name.toLowerCase() === search.toLowerCase());
  const matches = exact.length === 1 ? exact : logins;
  if (matches.length > 1) {
    console.error('More than one login matches. Be more specific:');
    for (const item of matches) console.error(`  ${item.name}`);
    process.exitCode = 1;
    return;
  }
  const code = await totpFromField(matches[0]!.login!.totp!);
  if (!code) throw new Error('That login has a secret Strongroom cannot read.');
  console.log(code.code);
  console.error(`${matches[0]!.name}: valid for ${code.remaining}s`);
}

async function health(withBreaches: boolean) {
  const logins = (await bwItems()).filter((item) => item.type === 1);
  const names = new Map(logins.map((item) => [item.id, item.name]));
  const items: HealthItem[] = logins.map((item) => ({
    id: item.id,
    name: item.name,
    password: item.login?.password,
    uris: (item.login?.uris ?? []).map((row) => row.uri ?? '').filter(Boolean),
  }));
  const report = buildHealthReport(items);
  const label = (id: string) => names.get(id) ?? id;

  console.log(`Checked ${items.length} logins.\n`);
  console.log(`Reused passwords: ${report.reused.length} group(s)`);
  for (const group of report.reused) console.log(`  ${group.itemIds.map(label).join(', ')}`);
  console.log(`\nWeak passwords: ${report.weak.length}`);
  for (const row of report.weak) console.log(`  ${label(row.itemId)} (${row.reasons.join(', ')})`);
  console.log(`\nUnencrypted websites: ${report.insecureUris.length}`);
  for (const row of report.insecureUris) console.log(`  ${label(row.itemId)}`);
  if (withBreaches) {
    const exposed = await findExposed(items, hibpRangeFetch);
    console.log(`\nPasswords found in known breaches: ${exposed.length}`);
    for (const row of exposed) console.log(`  ${label(row.itemId)} (seen ${row.count} times)`);
  } else {
    console.log('\nBreach check skipped. Add --breaches to run it.');
  }
}

async function attach(file: string | undefined, itemId: string | undefined) {
  if (!file || !itemId) throw new Error('Usage: strongroom attach <file> <item-id>');
  const session = process.env.BW_SESSION;
  if (!session) throw new Error('Vault is locked. Run: export BW_SESSION="$(bw unlock --raw)"');
  try {
    await run('bw', ['create', 'attachment', '--file', file, '--itemid', itemId], {
      env: { ...process.env, BW_SESSION: session },
    });
    console.log('Attached.');
  } catch {
    throw new Error(
      'Bitwarden did not accept the attachment. Your plan or server may not allow it.',
    );
  }
}

async function main(argv: string[]) {
  const [command, ...rest] = argv;
  if (command === 'totp') return totp(rest.join(' ') || undefined);
  if (command === 'attach') return attach(rest[0], rest[1]);
  if (command === 'health') return health(rest.includes('--breaches'));
  console.log(USAGE);
  if (command && command !== '--help' && command !== '-h') process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Something went wrong.');
  process.exitCode = 1;
});
