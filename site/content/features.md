---
title: 'Features: Bitwarden codes, vault health, folders, Sends'
description: 'Every Strongroom feature, split by what the client computes and what the Bitwarden server decides: one-time codes, vault health, folders, attachments, Sends.'
nav: Features
order: 2
updated: 2026-10-10
---

# Features: what Strongroom adds and where each one lives

Each feature below is either computed on your machine from vault data, or decided by the Bitwarden server. Strongroom provides the first kind fully. For the second kind it sends the request through `bw` and shows the answer. It does not fake an entitlement.

| Feature                        | Lives on                           | Strongroom                                                                  |
| ------------------------------ | ---------------------------------- | --------------------------------------------------------------------------- |
| Authenticator codes (TOTP)     | Client                             | Done: desktop item view, browser popup and `strongroom totp`                |
| Steam Guard codes              | Client                             | Done, same module                                                           |
| Reused password report         | Client                             | Done: Settings, Vault health, and `strongroom health`                       |
| Weak password report           | Client                             | Done: same places                                                           |
| Unsecured website report       | Client                             | Done: same places                                                           |
| Exposed password report        | Client plus a public leak lookup   | Done, opt-in: Settings switch and `strongroom health --breaches`            |
| Inactive two-step report       | Client plus a public list of sites | Done, opt-in: `strongroom health --inactive-2fa`                            |
| File attachments               | Server                             | Wired: `strongroom attach`. Works where the account or server allows it     |
| File Sends                     | Server                             | Wired: `strongroom send`. Works where the account or server allows it       |
| Emergency access               | Server                             | Not built                                                                   |
| YubiKey and Duo two-step login | Server                             | Nothing to build: set on the account, and sign-in already asks for the code |
| Priority support               | Bitwarden                          | Not applicable                                                              |

## One-time codes

Strongroom computes RFC 6238 codes from the `login.totp` field of a login. It also handles Steam Guard's 5-character alphabet. The code comes from `crypto.subtle` HMAC in `packages/shared/src/totp.ts`, so this is code generation from your own stored secret, not vault encryption.

Check: `strongroom totp github` prints the code on stdout and the seconds left on stderr. Compare it with your authenticator app.

## Vault health

The reports run on your decrypted logins on your machine. Reused, weak and plain-`http://` checks make no network call. Two checks do, and both are off until you ask. They are listed on the [privacy page](/privacy/).

Check: `grep -n "fetch(" packages/shared/src/health.ts` shows the two lookups and nothing else.

## Folders, fields and item types

The desktop app can create, rename and delete folders, filter by folder and assign an item to one. Nested names such as `A/B` show as flat names, not a tree. It shows and edits custom fields and shows password history. It creates and edits logins, secure notes, cards, identities and SSH keys. New SSH keys can be pasted in, not generated.

## Attachments and file Sends

Attachments can be added, downloaded and deleted in the desktop app, and added with `strongroom attach`. File Sends are created in the desktop app and with `strongroom send`. In both cases the account or server must allow it. The attachment path has not been run against a real server yet. See the [parity page](/parity/).

## Generators, import and export

Password, passphrase and username generators are built in. Passphrases use the EFF large word list, licensed CC BY 3.0 US. Import takes 29 formats and export writes CSV, JSON and account-key encrypted JSON, both through `bw`. Password-protected exports and imports are not supported, because `bw` would need the password on its command line.

## Why emergency access is not built

It needs the server's trusted-contact API and an exchange of encryption keys between two accounts. `bw` has no command for it. Strongroom keeps vault cryptography with the official CLI, and the server decides whether an account may add contacts. On a self-hosted server, the official web vault already provides it.

## Where the classification comes from

Bitwarden's public help pages and public issue and pull request pages. Nothing here was checked by calling a Bitwarden service, and none of it was checked against the server source. The repo's `docs/FEATURES.md` also records a static analysis of the installed official builds with [rea](https://github.com/morluto/rea). That analysis confirms which surfaces exist. It does not prove a feature is absent.
