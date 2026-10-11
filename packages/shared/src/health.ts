// Vault health checks computed locally from the user's own login items.
// Nothing here logs or returns passwords; reports reference item ids only.

export interface HealthItem {
  id: string;
  name: string;
  password?: string | null;
  uris?: readonly string[];
}

export type WeakReason = 'short' | 'single-class' | 'repetitive' | 'sequential' | 'common';

export interface HealthReport {
  reused: { itemIds: string[] }[];
  weak: { itemId: string; reasons: WeakReason[] }[];
  insecureUris: { itemId: string; uri: string }[];
  /** Present only when the caller opted in to the breach lookup. */
  exposed?: { itemId: string; count: number }[];
}

const COMMON = new Set([
  'password',
  'password1',
  'passw0rd',
  '123456',
  '12345678',
  '123456789',
  'qwerty',
  'qwerty123',
  'abc123',
  'letmein',
  'welcome',
  'admin',
  'iloveyou',
  'monkey',
  'dragon',
  'football',
  '111111',
]);

export function weakReasons(password: string): WeakReason[] {
  const out: WeakReason[] = [];
  if (COMMON.has(password.toLowerCase())) out.push('common');
  if (password.length < 10) out.push('short');
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 2) out.push('single-class');
  if (
    password.length > 1 &&
    new Set(password).size <= Math.max(2, Math.floor(password.length / 4))
  ) {
    out.push('repetitive');
  }
  if (hasSequence(password, 4)) out.push('sequential');
  return out;
}

function hasSequence(text: string, run: number): boolean {
  let up = 1;
  let down = 1;
  for (let i = 1; i < text.length; i++) {
    const d = text.charCodeAt(i) - text.charCodeAt(i - 1);
    up = d === 1 ? up + 1 : 1;
    down = d === -1 ? down + 1 : 1;
    if (up >= run || down >= run) return true;
  }
  return false;
}

function isInsecure(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:') return false;
  const host = url.hostname;
  return !(
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.localhost')
  );
}

export function buildHealthReport(items: readonly HealthItem[]): HealthReport {
  const byPassword = new Map<string, string[]>();
  const weak: HealthReport['weak'] = [];
  const insecureUris: HealthReport['insecureUris'] = [];

  for (const item of items) {
    if (item.password) {
      const ids = byPassword.get(item.password) ?? [];
      ids.push(item.id);
      byPassword.set(item.password, ids);
      const reasons = weakReasons(item.password);
      if (reasons.length) weak.push({ itemId: item.id, reasons });
    }
    for (const uri of item.uris ?? []) {
      if (isInsecure(uri)) insecureUris.push({ itemId: item.id, uri });
    }
  }

  const reused = [...byPassword.values()]
    .filter((ids) => ids.length > 1)
    .map((itemIds) => ({ itemIds }));
  return { reused, weak, insecureUris };
}

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Optional breach lookup using the k-anonymity range API: only the first five
 * characters of each SHA-1 hash leave the machine. Callers must opt in.
 */
export async function findExposed(
  items: readonly HealthItem[],
  fetchRange: (prefix: string) => Promise<string>,
): Promise<{ itemId: string; count: number }[]> {
  const cache = new Map<string, Map<string, number>>();
  const out: { itemId: string; count: number }[] = [];
  for (const item of items) {
    if (!item.password) continue;
    const hash = await sha1Hex(item.password);
    const prefix = hash.slice(0, 5);
    let suffixes = cache.get(prefix);
    if (!suffixes) {
      suffixes = new Map();
      for (const line of (await fetchRange(prefix)).split(/\r?\n/)) {
        const [suffix, count] = line.trim().split(':');
        if (suffix && count) suffixes.set(suffix.toUpperCase(), Number(count));
      }
      cache.set(prefix, suffixes);
    }
    const count = suffixes.get(hash.slice(5));
    if (count) out.push({ itemId: item.id, count });
  }
  return out;
}

export const hibpRangeFetch = async (prefix: string): Promise<string> => {
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!res.ok) throw new Error('Breach lookup failed.');
  return res.text();
};
