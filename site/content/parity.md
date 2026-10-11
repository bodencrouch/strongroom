---
title: 'Parity with the official Bitwarden clients, honestly'
description: "Strongroom's parity with official Bitwarden apps, item by item: what is done, partial, planned, and not possible from a client built on the bw CLI."
nav: Parity
order: 3
updated: 2026-10-10
---

# Parity with the official Bitwarden clients

Full parity is not reachable for a client that sits on top of `bw`, because part of Bitwarden lives on the server and in the web vault. This page says which part is which. The source is `docs/PARITY.md` in the repo.

Status words. **Done** works in Strongroom. **Partial** works with limits. **Planned** is a client-side gap Strongroom can close. **Not possible here** needs the server, the web vault, or key handling that Strongroom keeps with the official CLI.

## Vault items

| Item or feature                                       | Status            | Notes                                                                                       |
| ----------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| Logins: view, create, edit, trash, restore            | Done              |                                                                                             |
| Secure notes: view, create, edit                      | Done              |                                                                                             |
| Favorites                                             | Done              |                                                                                             |
| Cards: view, copy, create, edit                       | Done              |                                                                                             |
| Identities: view, copy, create, edit                  | Done              |                                                                                             |
| SSH keys: view, copy, edit                            | Done              | New keys can be pasted in, not generated                                                    |
| Passkeys                                              | Partial           | Used through macOS AutoFill. Editing a passkey item is left to Bitwarden                    |
| One-time codes (TOTP)                                 | Done              | Desktop, browser popup and command line                                                     |
| URI match rules                                       | Done              |                                                                                             |
| Folders: view, filter, assign, create, rename, delete | Done              | Nested names such as `A/B` show as flat names, not a tree                                   |
| Custom fields: view, copy, edit                       | Done              | Linked fields are kept but not editable                                                     |
| Password history: view and copy                       | Done              |                                                                                             |
| Attachments: add, download, delete                    | Done              | Desktop app. The server decides if the account may add files. Not run against a real server |
| Attachments: list                                     | Done              | Shown in the item detail                                                                    |
| Items with master password re-prompt                  | Not possible here | Shown as restricted. Re-prompt belongs in the official client                               |
| Organization and collection items                     | Not possible here | Shown as restricted. Needs organization key handling                                        |

## Sending and sharing

| Feature                                             | Status            | Notes                                                                    |
| --------------------------------------------------- | ----------------- | ------------------------------------------------------------------------ |
| File Send: create                                   | Done              | Desktop app and `strongroom send`. The server decides if the account may |
| Text Send, list, copy link, remove password, delete | Done              | Editing an existing Send is not built                                    |
| Sharing items with an organization                  | Not possible here | Organization keys                                                        |
| Emergency access                                    | Not possible here | Server API and a key exchange between accounts                           |

## Filling and generating

| Feature                                      | Status | Notes                                   |
| -------------------------------------------- | ------ | --------------------------------------- |
| Browser fill (Chromium, Firefox, Safari)     | Done   |                                         |
| macOS AutoFill                               | Done   |                                         |
| Password, passphrase and username generators | Done   | Passphrases use the EFF large word list |
| Save new logins from the browser             | Done   |                                         |

## Account and security

| Feature                                                                     | Status            | Notes                                                                                                              |
| --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Unlock with master password                                                 | Done              |                                                                                                                    |
| Unlock with Touch ID                                                        | Done              | macOS only                                                                                                         |
| Two-step sign-in prompts (authenticator, YubiKey, email)                    | Done              |                                                                                                                    |
| Auto-lock timer                                                             | Done              |                                                                                                                    |
| Vault health reports                                                        | Done              | See [features](/features/)                                                                                         |
| Single sign-on, device approval, passkey sign-in                            | Not possible here | The CLI signs in with a password or API key                                                                        |
| Change master password, KDF settings, set up two-step login, delete account | Not possible here | Web vault                                                                                                          |
| Import (29 formats) and export (CSV, JSON, account-key encrypted JSON)      | Done              | Password-protected exports and imports are not supported, because `bw` would need the password on its command line |
| Self-hosted server                                                          | Partial           | Server address can be set. Not tested against a real self-hosted server                                            |

## Out of scope

Admin Console, Provider Portal, Secrets Manager, billing and plans, and organization policies are web and server products. A client cannot provide them.
