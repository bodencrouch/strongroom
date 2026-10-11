---
title: 'Strongroom: an unofficial Bitwarden client for desktop'
description: 'Strongroom is an unofficial Bitwarden client: desktop app, browser extension, Raycast and CLI with one-time codes, vault health reports and Sends over bw.'
nav: Home
order: 1
updated: 2026-10-10
---

# Strongroom, an unofficial Bitwarden client

Strongroom is a desktop app, browser extension, Raycast extension and command line for a Bitwarden vault you already have. It does not replace your account, and it does not store your vault. The official `bw` CLI signs in, syncs and does all the vault cryptography.

It is not made by Bitwarden and not endorsed by Bitwarden. Bitwarden is a trademark of Bitwarden, Inc. It is a fork of [dillionverma/bitlatch](https://github.com/dillionverma/bitlatch), MIT licensed.

<p><a class="cta" href="/install/">Install from source</a> <a class="cta alt" href="/features/">See the feature list</a></p>

## What it adds on top of bw

- One-time codes (TOTP and Steam Guard) in the desktop item view, the browser popup and `strongroom totp`. See [Bitwarden TOTP code viewer](/features/#one-time-codes).
- Vault health: reused, weak and plain `http://` logins, plus two opt-in checks. See [Bitwarden vault health report from the command line](/cli/#health).
- Folders, custom fields, password history, cards, identities and SSH keys in the desktop editor.
- Attachments and file Sends, passed through `bw`. The server decides if your account may use them.
- Password, passphrase and username generators. Import and export through `bw`.

## What it does not do

It does not unlock anything your Bitwarden server withholds. Attachments, file Sends and emergency access are decided server side. Strongroom asks `bw`, then shows the answer. Organizations, single sign-on, master password changes and the admin console are not built, and a client on top of `bw` cannot build them. The full list is on the [parity page](/parity/).

## Check it yourself

```sh
git clone https://github.com/bodencrouch/strongroom
cd strongroom
grep -rn "fetch(" apps packages --include=*.ts --include=*.tsx --exclude-dir=node_modules
```

That grep finds the outbound network calls in source. [Privacy and network use](/privacy/) lists each one, what it sends and whether it is on by default.

## Where to go next

- [Install](/install/): build from source with pnpm. No release is tagged yet.
- [Security model](/security/): what the window process never receives.
- [FAQ](/faq/): is it official, is it safe, why not just use Bitwarden.
