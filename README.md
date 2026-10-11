# Strongroom

A desktop app, browser extension and command line for your existing Bitwarden vault.

Strongroom is an independent project. It is not affiliated with or endorsed by Bitwarden.

Your account and vault stay as they are. Strongroom does not store your vault itself. Sign-in and encryption are done by the official Bitwarden CLI (`bw`), which you install separately.

## What you get

- **Verification codes.** See the one-time code for any login that has an authenticator secret. The code is computed on your machine. The secret never reaches the app window.
- **Vault health.** Find reused passwords, weak passwords and sites that use plain `http://`. An optional check looks for passwords in known leaks and sends only a 5-character hash prefix.
- **Command line.** `strongroom totp`, `strongroom health` and `strongroom attach` work on top of `bw`.
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
node apps/cli/src/index.ts health --breaches
```

## License

[MIT](LICENSE). The license keeps the notices of the code Strongroom started from.
