# Contributing

Small, checkable changes get merged. Big rewrites of working code do not.

## Build

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Node.js 22.18, 24.11 or 26 and newer. You need the official `bw` CLI to run anything against a vault. Use a throwaway Bitwarden account with fake items, not your real one.

## Gates

Run both before you open a pull request:

```sh
pnpm run check   # matcher tests, types, lint, format
pnpm run build   # desktop, extensions, Raycast
```

CI runs `pnpm run check` on every pull request (`.github/workflows/check.yml`).

## How verification works here

The upstream rule in [AGENTS.md](AGENTS.md) is not to add automated tests. Verification is type checking, builds and manual checks with synthetic data. One test file exists anyway, `tests/matching.test.mjs`, and `pnpm run check` runs it: 930 tests for URL matching and server URL handling.

Tests are welcome when they pin a bug that already slipped through. The example: `cacheFields` dropped `login.totp`. A test that fails on that and passes after the fix is the right kind. A test written to raise a coverage number is not.

## Rules that do not bend

- No custom crypto. Authentication and vault encryption belong to `bw`.
- Synthetic data only, in code, fixtures and screenshots.
- Never log passwords, vault contents, session keys, API keys or raw `bw` output.
- A locked vault rejects reads and fills immediately. Keep that through UI changes.
- Keep unknown item fields intact when editing.

The full list is in [AGENTS.md](AGENTS.md).

## Issues and pull requests

Never paste vault contents, `BW_SESSION` values or raw `bw` output into an issue. If a bug needs data to reproduce, make a fake item that shows it.

Say what changed and how you checked it: the command, the screen, the fake item. The pull request template asks for the same. Security problems go through [SECURITY.md](SECURITY.md), not a public issue.

## Conduct

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies in issues, pull requests and discussions.
