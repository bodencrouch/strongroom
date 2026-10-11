# Strongroom

A desktop app, browser extension and command line for your existing Bitwarden vault.

Strongroom is an independent project. It is not affiliated with or endorsed by Bitwarden.

Your account and vault stay as they are. Strongroom does not store your vault itself. Sign-in and encryption are done by the official Bitwarden CLI (`bw`), which you install separately.

## What you get

- **Verification codes.** See the one-time code for any login that has an authenticator secret, in the desktop app, the browser popup and the command line. The code is computed on your machine. The secret never reaches the window.
- **Vault health.** Find reused passwords, weak passwords and sites that use plain `http://`. Optional checks look for passwords in known leaks, which sends only a 5-character hash prefix, and for sites that offer two-step login you have not turned on. Open Settings, then Vault health.
- **Command line.** `strongroom totp`, `strongroom health`, `strongroom attach` and `strongroom send` work on top of `bw`.
- **Search and fill.** Search from the keyboard, and fill logins from the browser extension.

Some features are decided by your Bitwarden server, such as file attachments. Strongroom asks `bw` to do the work and shows the server's answer. See [docs/FEATURES.md](docs/FEATURES.md) for the full list and which side each feature lives on.

## Requirements

- Node.js 22.18, 24.11, or 26 and newer.
- The official [Bitwarden CLI](https://bitwarden.com/help/cli/) installed and signed in.
- `pnpm` for building from source.

## Build from source

```sh
pnpm install --frozen-lockfile
pnpm run dev        # desktop app
pnpm run check      # types, lint, format, tests
pnpm run build      # desktop, extensions, Raycast
```

## Command line

```sh
export BW_SESSION="$(bw unlock --raw)"
node apps/cli/src/index.ts totp github
node apps/cli/src/index.ts health --breaches --inactive-2fa
node apps/cli/src/index.ts attach ./receipt.pdf <item-id>
node apps/cli/src/index.ts send ./notes.txt --days 3
```

## License

[MIT](LICENSE). The license keeps the notices of the code Strongroom started from.

The passphrase generator uses the [EFF large word list](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases), copyright the Electronic Frontier Foundation, licensed [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).
