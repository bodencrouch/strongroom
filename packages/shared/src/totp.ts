// One-time codes (RFC 6238) computed locally from the secret stored in a
// login's `totp` field. This is code generation from the user's own data. It
// is not vault encryption, which stays with the official Bitwarden CLI.

export type TotpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

export interface TotpParams {
  secret: Uint8Array;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
  /** Steam Guard uses a 5-character alphabet instead of decimal digits. */
  steam: boolean;
}

export interface TotpCode {
  code: string;
  /** Seconds until this code stops being valid. */
  remaining: number;
  period: number;
}

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEAM_ALPHABET = '23456789BCDFGHJKMNPQRTVWXY';

export function decodeBase32(input: string): Uint8Array | null {
  const clean = input.replace(/[\s=-]/g, '').toUpperCase();
  if (!clean) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

const ALGORITHMS: Record<string, TotpAlgorithm> = {
  SHA1: 'SHA-1',
  'SHA-1': 'SHA-1',
  SHA256: 'SHA-256',
  'SHA-256': 'SHA-256',
  SHA512: 'SHA-512',
  'SHA-512': 'SHA-512',
};

/** Accepts an `otpauth://totp/...` URI, a `steam://SECRET` value, or a bare base32 secret. */
export function parseTotp(value: string): TotpParams | null {
  const text = value.trim();
  if (!text) return null;

  if (/^steam:\/\//i.test(text)) {
    const secret = decodeBase32(text.slice('steam://'.length));
    return secret ? { secret, algorithm: 'SHA-1', digits: 5, period: 30, steam: true } : null;
  }

  if (/^otpauth:/i.test(text)) {
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      return null;
    }
    if (url.hostname.toLowerCase() !== 'totp') return null;
    const secret = decodeBase32(url.searchParams.get('secret') ?? '');
    if (!secret) return null;
    const algorithm = ALGORITHMS[(url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase()];
    const digits = Number(url.searchParams.get('digits') ?? 6);
    const period = Number(url.searchParams.get('period') ?? 30);
    if (!algorithm || !Number.isInteger(digits) || digits < 6 || digits > 10) return null;
    if (!Number.isInteger(period) || period < 1) return null;
    const steam = /^steam$/i.test(url.searchParams.get('encoder') ?? '');
    return { secret, algorithm, digits: steam ? 5 : digits, period, steam };
  }

  const secret = decodeBase32(text);
  return secret ? { secret, algorithm: 'SHA-1', digits: 6, period: 30, steam: false } : null;
}

export async function generateTotp(params: TotpParams, nowMs: number = Date.now()): Promise<TotpCode> {
  const counter = Math.floor(nowMs / 1000 / params.period);
  const message = new Uint8Array(8);
  new DataView(message.buffer).setBigUint64(0, BigInt(counter));

  const key = await crypto.subtle.importKey(
    'raw',
    params.secret as BufferSource,
    { name: 'HMAC', hash: params.algorithm },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = mac[mac.length - 1]! & 0x0f;
  let binary =
    ((mac[offset]! & 0x7f) << 24) |
    (mac[offset + 1]! << 16) |
    (mac[offset + 2]! << 8) |
    mac[offset + 3]!;

  let code: string;
  if (params.steam) {
    code = '';
    for (let i = 0; i < params.digits; i++) {
      code += STEAM_ALPHABET[binary % STEAM_ALPHABET.length];
      binary = Math.floor(binary / STEAM_ALPHABET.length);
    }
  } else {
    code = String(binary % 10 ** params.digits).padStart(params.digits, '0');
  }

  const remaining = params.period - (Math.floor(nowMs / 1000) % params.period);
  return { code, remaining, period: params.period };
}

/** Convenience wrapper: returns null when the stored value is not a usable TOTP secret. */
export async function totpFromField(value: string, nowMs?: number): Promise<TotpCode | null> {
  const params = parseTotp(value);
  return params ? generateTotp(params, nowMs) : null;
}
