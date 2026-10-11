---
title: 'Install Strongroom: build the Bitwarden client from source'
description: 'Build Strongroom from source with pnpm, run the CLI with node today and from npm once the first release is tagged. Needs the official Bitwarden CLI.'
nav: Install
order: 5
updated: 2026-10-10
---

# Install Strongroom

No release is tagged yet. Today you build from source. Prebuilt desktop packages will come from [GitHub Releases](https://github.com/bodencrouch/strongroom/releases) once the first release is tagged, and the CLI will be on npm as `strongroom` at the same point.

## Requirements

- Node.js 22.18, 24.11, or 26 and newer.
- `pnpm` (the repo pins `pnpm@11.25.0` in `package.json`).
- The official [Bitwarden CLI](https://bitwarden.com/help/cli/) (`bw`), installed and signed in. Strongroom does not ship it and does not replace it.

Check: `node --version`, `pnpm --version`, `bw --version`.

## Build from source

```sh
git clone https://github.com/bodencrouch/strongroom
cd strongroom
pnpm install --frozen-lockfile
pnpm run dev        # desktop app
pnpm run check      # types, lint, format, tests
pnpm run build      # desktop, extensions, Raycast
```

Check: `pnpm run check` exits 0. If it does not, open an [issue](https://github.com/bodencrouch/strongroom/issues) with the output.

## The command line

```sh
export BW_SESSION="$(bw unlock --raw)"
node apps/cli/src/index.ts totp github
```

Once the first release is tagged, the same tool installs from npm as `strongroom`. Until then, `node apps/cli/src/index.ts` is the supported way. Details are on the [CLI page](/cli/).

## Desktop app on Linux

The repo has a `package:linux` script (`pnpm run package:linux`). I have not published a Linux build. Touch ID and macOS AutoFill are macOS only, and the built-in updater only turns on for packaged macOS builds. Treat Linux as build-it-yourself and expect gaps that are not written down yet.

## Browser extension and Raycast

`pnpm run build` produces the extension and the Raycast extension. `pnpm run extension:zip` packs the extension, and `pnpm run package:raycast` packs the Raycast one. I have not published either to a store.

## Self-hosted servers

The desktop app lets you set the server address. It has not been tested against a real self-hosted server. If you try one, say what happened in an issue.
