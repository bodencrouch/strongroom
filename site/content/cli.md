---
title: 'Strongroom CLI: a Bitwarden CLI wrapper for TOTP, health'
description: 'The strongroom command line wraps the official bw CLI: print one-time codes, run a vault health report, attach files and create file Sends from a shell.'
nav: CLI
order: 4
updated: 2026-10-10
---

# Strongroom CLI, a wrapper around the Bitwarden CLI

`strongroom` is a Node script that calls `bw`. It adds four commands. It reads items that `bw` has already decrypted, and it never prints a password or a one-time secret. The source is `apps/cli/src/index.ts`, 188 lines.

You need `bw` installed and unlocked. Strongroom never signs in for you.

```sh
export BW_SESSION="$(bw unlock --raw)"
node apps/cli/src/index.ts totp github
```

Until the first release is tagged, run it with `node apps/cli/src/index.ts`. Once the first release is tagged and published to npm as `strongroom`, the same commands run as `strongroom totp github`.

## totp: print a one-time code

```sh
strongroom totp <search>
```

It runs `bw list items --search`, keeps logins that have a `totp` field, and prints the current code on stdout. The seconds left go to stderr. If several logins match, it lists their names on stderr and exits 1. An exact name match wins.

Check: run it twice, 30 seconds apart. The code changes, and it matches your authenticator app.

## health: a Bitwarden vault health report from the command line

```sh
strongroom health
strongroom health --breaches --inactive-2fa
```

Without flags it makes no network call. It prints reused password groups, weak passwords with reasons, and logins whose site uses plain `http://`. Names only, never passwords.

`--breaches` checks each password against the Have I Been Pwned range API. Only the first 5 characters of each SHA-1 hash leave your machine. `--inactive-2fa` downloads the public 2fa.directory list and prints logins whose site supports one-time codes but that have none set. Both are explained on the [privacy page](/privacy/).

Check: `strongroom health | head -1` prints `Checked N logins.` Compare N with `bw list items | jq '[.[]|select(.type==1)]|length'`.

## attach: add a file to a login

```sh
strongroom attach ./receipt.pdf <item-id>
```

It runs `bw create attachment`. If your plan or server does not allow attachments, `bw` refuses and Strongroom prints one generic line. It does not echo `bw` output, because that output can contain sensitive arguments.

## send: create a file Send

```sh
strongroom send ./notes.txt --days 3
```

It builds a file Send from `bw send template send.file`, sets the name and a deletion date (default 7 days), creates it and prints the access link. The same rule applies: if the account or server does not allow file Sends, the command fails and says so.

## Exit codes and errors

An unlocked session is required. With `BW_SESSION` unset, every command stops with `Vault is locked`. Errors from `bw` are replaced with a fixed message on purpose.

Not built: a `strongroom unlock`, a command that prints passwords, and any write beyond `attach` and `send`.
