#!/usr/bin/env node
// Strongroom command line. It wraps the official Bitwarden CLI (`bw`), which keeps
// authentication and vault cryptography. This tool only reads items that `bw`
// has already decrypted and never prints passwords or one-time secrets.
import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';
import {
  buildHealthReport,
  fetchTwoStepDirectory,
  findExposed,
  findInactiveTwoStep,
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
  strongroom health [--breaches] [--inactive-2fa]
                            Report reused, weak and unencrypted-website logins.
                            --breaches also checks passwords against known leaks
                            (sends only 5-character hash prefixes).
                            --inactive-2fa lists logins whose site offers one-time
                            codes but that have none set (downloads the public
                            2fa.directory list).
  strongroom send <file> [--days N]
                            Create a file Send (default expiry 7 days) and print
                            its link. Needs an account or server that allows file
                            Sends; Strongroom does not change that.

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

async function health(withBreaches: boolean, withInactive: boolean) {
  const logins = (await bwItems()).filter((item) => item.type === 1);
  const names = new Map(logins.map((item) => [item.id, item.name]));
  const items: HealthItem[] = logins.map((item) => ({
    id: item.id,
    name: item.name,
    password: item.login?.password,
    uris: (item.login?.uris ?? []).map((row) => row.uri ?? '').filter(Boolean),
    hasTotp: Boolean(item.login?.totp),
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
  if (withInactive) {
    const inactive = findInactiveTwoStep(items, await fetchTwoStepDirectory());
    console.log(`\nLogins with unused two-step codes: ${inactive.length}`);
    for (const item of inactive) console.log(`  ${item.name}`);
  }
}

async function send(args: string[]) {
  const daysAt = args.indexOf('--days');
  let days = 7;
  if (daysAt >= 0) {
    days = Number(args[daysAt + 1]);
    if (!Number.isInteger(days) || days < 1)
      throw new Error('--days needs a whole number of days.');
  }
  const file = args.find((_, i) => daysAt < 0 || (i !== daysAt && i !== daysAt + 1));
  if (!file) throw new Error('Usage: strongroom send <file> [--days N]');
  const session = process.env.BW_SESSION;
  if (!session) throw new Error('Vault is locked. Run: export BW_SESSION="$(bw unlock --raw)"');
  const env = { ...process.env, BW_SESSION: session };
  try {
    const { stdout: raw } = await run('bw', ['send', 'template', 'send.file'], { env });
    const template = JSON.parse(raw) as Record<string, unknown>;
    const name = basename(file);
    template.name = name;
    template.deletionDate = new Date(Date.now() + days * 86_400_000).toISOString();
    template.file = { ...(template.file as object), fileName: name };
    const encoded = await new Promise<string>((resolve, reject) => {
      const child = execFile('bw', ['encode'], { env }, (err, out) =>
        err ? reject(err) : resolve(out.trim()),
      );
      child.stdin?.end(JSON.stringify(template));
    });
    const { stdout } = await run('bw', ['send', 'create', encoded, '--file', file], { env });
    const created = JSON.parse(stdout) as { accessUrl?: string };
    if (!created.accessUrl) throw new Error('no url');
    console.log(created.accessUrl);
  } catch {
    // Deliberately generic: `bw` output and arguments can be sensitive.
    throw new Error(
      'Bitwarden did not accept the Send. Your plan or server may not allow file Sends.',
    );
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
  if (command === 'send') return send(rest);
  if (command === 'health') {
    return health(rest.includes('--breaches'), rest.includes('--inactive-2fa'));
  }
  console.log(USAGE);
  if (command && command !== '--help' && command !== '-h') process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Something went wrong.');
  process.exitCode = 1;
});
