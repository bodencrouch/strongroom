// Passphrase and username generators. Randomness comes from the platform
// crypto source, and every pick is unbiased (no modulo skew).
import { WORDS } from './wordlist';

/** A uniform integer in [0, max), by rejection sampling over 32-bit values. */
export function randomBelow(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 0x1_0000_0000)
    throw new RangeError('max must be an integer from 1 to 2^32');
  const limit = 0x1_0000_0000 - (0x1_0000_0000 % max);
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0]! < limit) return buffer[0]! % max;
  }
}

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

export const defaultPassphraseOptions: PassphraseOptions = {
  words: 3,
  separator: '-',
  capitalize: false,
  includeNumber: false,
};

export function generatePassphrase(options: PassphraseOptions = defaultPassphraseOptions): string {
  if (!Number.isInteger(options.words) || options.words < 3 || options.words > 20)
    throw new RangeError('A passphrase needs 3 to 20 words.');
  if (options.separator.length > 1) throw new RangeError('The separator is one character at most.');
  const picked = Array.from({ length: options.words }, () => WORDS[randomBelow(WORDS.length)]!);
  const words = options.capitalize
    ? picked.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    : picked;
  if (options.includeNumber) {
    const at = randomBelow(words.length);
    words[at] = `${words[at]}${randomBelow(10)}`;
  }
  return words.join(options.separator);
}

const ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomText(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHANUMERIC[randomBelow(ALPHANUMERIC.length)];
  return out;
}

export type UsernameOptions =
  | { type: 'word'; capitalize: boolean; includeNumber: boolean }
  | { type: 'plusAddressed'; email: string }
  | { type: 'catchAll'; domain: string };

function validEmail(value: string): boolean {
  return /^[^\s@+]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function generateUsername(options: UsernameOptions): string {
  if (options.type === 'word') {
    const word = WORDS[randomBelow(WORDS.length)]!;
    const name = options.capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    return options.includeNumber
      ? `${name}${randomBelow(10_000).toString().padStart(4, '0')}`
      : name;
  }
  if (options.type === 'plusAddressed') {
    if (!validEmail(options.email)) throw new RangeError('Enter an email address without a + tag.');
    const [local, domain] = options.email.split('@') as [string, string];
    return `${local}+${randomText(8)}@${domain}`;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(options.domain))
    throw new RangeError('Enter a domain such as example.com.');
  return `${randomText(8)}@${options.domain.toLowerCase()}`;
}
