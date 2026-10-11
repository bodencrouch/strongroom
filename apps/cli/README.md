# strongroom

Unofficial command-line extras for Bitwarden. It is not made by or affiliated with Bitwarden.

It needs the official [Bitwarden CLI](https://bitwarden.com/help/cli/) (`bw`) on your PATH. `bw` handles sign-in and vault encryption. Strongroom only reads items that `bw` has already decrypted. It never prints passwords or one-time secrets.

## Requirements

- Node 22.18 or newer
- The official `bw` CLI, signed in and unlocked (`BW_SESSION` set)

## Commands

- `strongroom totp <search>`: print the current one-time code for a matching login.
- `strongroom health [--breaches] [--inactive-2fa]`: report reused, weak and unencrypted-website logins.
- `strongroom attach <file> <item-id>`: attach a file to a login.
- `strongroom send <file> [--days N]`: create a file Send and print its link.

Run `strongroom` with no arguments to see all commands.

## Install

This package is not on npm yet. Download `strongroom-*.tgz` from the [releases page](https://github.com/bodencrouch/strongroom/releases), then run `npm install -g ./strongroom-*.tgz`.

## License

MIT
