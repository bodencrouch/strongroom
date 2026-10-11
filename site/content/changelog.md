---
title: 'Strongroom changelog: what changed since the bitlatch fork'
description: 'A short changelog for Strongroom, the unofficial Bitwarden client, taken from git history. No release is tagged yet, so entries are grouped by change.'
nav: Changelog
order: 9
updated: 2026-10-10
---

# Changelog

No release is tagged yet. This list is hand-written from `git log` and goes newest first. All of these landed on 2026-10-10. Check: `git log --oneline` in the repo.

## Unreleased

- Sends, import and export, and generator modes in the picker.
- Editor support for cards, identities, SSH keys and custom fields.
- Passphrase and username generators on the EFF large word list.
- Custom fields, password history and attachments in the item view.
- Folders: sidebar filter, editor select, create, rename, delete.
- `docs/PARITY.md`: what is done, planned, and not possible from a client.
- Vault health in Settings, the inactive two-step report, file Sends in the CLI and desktop app, and a new icon.
- The `strongroom` CLI with `totp`, `health` and `attach`.
- The one-time code in the desktop item view and the browser popup.
- `health.ts`: reused, weak and plain-http checks, with an opt-in breach lookup.

## Origin

- Forked from bitlatch at v0.3.5 and renamed to Strongroom.
