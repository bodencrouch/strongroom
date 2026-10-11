# Strongroom

An unofficial Bitwarden client for desktop, browser and the command line. It adds TOTP codes, vault health reports and Sends on top of the official `bw` CLI.

[![Check](https://github.com/bodencrouch/strongroom/actions/workflows/ci.yml/badge.svg)](https://github.com/bodencrouch/strongroom/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Strongroom is a password manager front end for a Bitwarden vault you already have. It ships an Electron desktop app, a browser extension, a Raycast extension and a CLI. Your account and vault stay where they are. Sign-in and all vault encryption run inside the official Bitwarden CLI (`bw`), which you install yourself. Strongroom reads what `bw` has already decrypted.

Strongroom is not made, reviewed or endorsed by Bitwarden. Bitwarden is a trademark of Bitwarden, Inc.

Docs site: <https://bodencrouch.github.io/strongroom/>

## What it does

- One-time codes (TOTP and Steam Guard) in the desktop app, the browser popup and `strongroom totp`.
- Vault health: reused passwords, weak passwords, plain `http://` sites. Opt-in checks for leaked passwords and for sites that offer two-step login you have not turned on.
- Folders, attachments, Sends, password, passphrase and username generators, import and export.
- Browser fill on Chromium, Firefox and Safari, and macOS AutoFill.

[docs/FEATURES.md](docs/FEATURES.md) says which features run on your machine and which the Bitwarden server decides. [docs/PARITY.md](docs/PARITY.md) is the item-by-item status against the official clients, including the gaps.

## Install

There is no tagged release yet. Build from source:

```sh
pnpm install --frozen-lockfile
pnpm run dev        # desktop app
pnpm run check      # types, lint, format, 930 matcher tests
pnpm run build      # desktop, extensions, Raycast
```

Requirements: Node.js 22.18, 24.11 or 26 and newer, `pnpm`, and the official [Bitwarden CLI](https://bitwarden.com/help/cli/) installed and signed in. Releases will be listed at <https://github.com/bodencrouch/strongroom/releases>.

## Command line

Until the first tagged release, run the CLI as `node apps/cli/src/index.ts`. The npm package `strongroom` comes with that release. The examples below use the final name.

```sh
export BW_SESSION="$(bw unlock --raw)"
strongroom totp github
strongroom health --breaches --inactive-2fa
strongroom attach ./receipt.pdf <item-id>
strongroom send ./notes.txt --days 3
```

Run it with no arguments to print the usage text. Today that is `node apps/cli/src/index.ts`.

## How it stays safe

- Authentication and vault cryptography stay in `bw`. There is no custom crypto in this repo, and [AGENTS.md](AGENTS.md) forbids adding it.
- The desktop app computes one-time codes in its main process (`totp` in `apps/desktop/src/main/vault.ts`). The window gets the current code and the seconds left. No shared item or draft type carries the stored secret. Sends links, text and passwords stay in the main process too (header comment in `Sends.tsx`).
- Copied secrets clear from the clipboard after 30 seconds, and only if the clipboard still holds that value (`apps/desktop/src/main/lifecycle.ts`).
- A locked vault rejects reads and fills immediately, including pending operations.
- The browser extension and Raycast bridges ask you to approve access on packaged macOS builds only (`enforced` in `apps/desktop/src/main/external-access.ts`). On Linux and Windows the bridge relies on a token file that only your user can read, so any process running as you can ask it for a password. Safari's bridge checks the socket identity instead of prompting. Treat those platforms accordingly.
- The CLI prints no passwords or one-time secrets and replaces `bw` errors with a generic message.

Network calls are limited to a short list. Check it yourself:

```sh
grep -rn "https://" apps packages --include=*.ts --include=*.tsx
```

The calls that are not UI placeholders or URL handling:

- `https://icons.bitwarden.net/<host>/icon.png`, Bitwarden's icon service, for site icons.
- `https://api.pwnedpasswords.com/range/<prefix>`, only with the breach check on, and only the first 5 characters of a SHA-1 hash.
- `https://api.2fa.directory/v3/totp.json`, only with the inactive two-step check on.
- `https://vault.bitwarden.com` and `https://vault.bitwarden.eu` as server choices. A self-hosted address is yours to enter.

## What is not built

A client on top of `bw` cannot do everything. From [docs/PARITY.md](docs/PARITY.md):

- Organization and collection items, and sharing with an organization.
- Emergency access.
- Single sign-on, device approval and passkey sign-in.
- Changing the master password or KDF settings, and setting up two-step login.
- Items that need master password re-prompt.
- Admin Console, Provider Portal, Secrets Manager and billing.

Attachments and file Sends depend on what your account or server allows. Strongroom sends the request and shows the answer. It does not change limits, and it does not get around them. Attachments are not yet run against a real server (see the PARITY notes).

## Credit and license

Strongroom starts from [dillionverma/bitlatch](https://github.com/dillionverma/bitlatch) at v0.3.5, MIT, copyright Dillion Verma. That notice stays in [LICENSE](LICENSE). Strongroom is [MIT](LICENSE) too.

The passphrase generator uses the [EFF large word list](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases), copyright the Electronic Frontier Foundation, licensed [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).

Bugs and ideas: [issues](https://github.com/bodencrouch/strongroom/issues). To work on it, read [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, read [SECURITY.md](SECURITY.md).
