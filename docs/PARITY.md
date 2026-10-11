# Parity with the official Bitwarden clients

An honest status. "Full parity" is not reachable for a client that sits on top of the official CLI, because part of Bitwarden lives on the server and in the web vault. This page says which part is which.

Status words: **Done** works in Strongroom. **Partial** works with limits. **Planned** is a client-side gap Strongroom can close. **Not possible here** needs the server, the web vault, or key handling that Strongroom's rules keep with the official CLI.

## Vault items

| Item or feature                                       | Status            | Notes                                                                                       |
| ----------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| Logins: view, create, edit, trash, restore            | Done              |                                                                                             |
| Secure notes: view, create, edit                      | Done              |                                                                                             |
| Favorites                                             | Done              |                                                                                             |
| Cards: view and copy                                  | Done              | Editing is planned                                                                          |
| Identities: view and copy                             | Done              | Editing is planned                                                                          |
| SSH keys: view and copy                               | Done              | Editing is planned                                                                          |
| Passkeys                                              | Partial           | Used through macOS AutoFill. Editing a passkey item is left to Bitwarden                    |
| One-time codes (TOTP)                                 | Done              | Desktop, browser popup and command line                                                     |
| URI match rules                                       | Done              |                                                                                             |
| Folders: view, filter, assign, create, rename, delete | Done              | Nested names such as `A/B` show as flat names, not a tree                                   |
| Custom fields: view and copy                          | Done              | Editing is planned                                                                          |
| Password history: view and copy                       | Done              |                                                                                             |
| Attachments: add, download, delete                    | Done              | Desktop app. The server decides if the account may add files. Not run against a real server |
| Attachments: list                                     | Done              | Shown in the item detail                                                                    |
| Items with master password re-prompt                  | Not possible here | Shown as restricted. Re-prompt belongs in the official client                               |
| Organization and collection items                     | Not possible here | Shown as restricted. Needs organization key handling                                        |

## Sending and sharing

| Feature                            | Status            | Notes                                                                          |
| ---------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| File Send                          | Partial           | `strongroom send`. The server decides if the account may                             |
| Text Send, list and delete Sends   | Planned           |                                                                                |
| Sharing items with an organization | Not possible here | Organization keys                                                              |
| Emergency access                   | Not possible here | Server API and a key exchange between accounts. See [FEATURES.md](FEATURES.md) |

## Filling and generating

| Feature                                  | Status  | Notes                                                          |
| ---------------------------------------- | ------- | -------------------------------------------------------------- |
| Browser fill (Chromium, Firefox, Safari) | Done    |                                                                |
| macOS AutoFill                           | Done    |                                                                |
| Password generator                       | Partial | Passwords only. Passphrase and username generators are planned |
| Save new logins from the browser         | Done    |                                                                |

## Account and security

| Feature                                                                     | Status            | Notes                                                                   |
| --------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| Unlock with master password                                                 | Done              |                                                                         |
| Unlock with Touch ID                                                        | Done              | macOS only                                                              |
| Two-step sign-in prompts (authenticator, YubiKey, email)                    | Done              |                                                                         |
| Auto-lock timer                                                             | Done              |                                                                         |
| Vault health reports                                                        | Done              | See [FEATURES.md](FEATURES.md)                                          |
| Single sign-on, device approval, passkey sign-in                            | Not possible here | The CLI signs in with a password or API key                             |
| Change master password, KDF settings, set up two-step login, delete account | Not possible here | Web vault                                                               |
| Import and export                                                           | Planned           | `bw import` and `bw export` exist                                       |
| Self-hosted server                                                          | Partial           | Server address can be set. Not tested against a real self-hosted server |

## Out of scope

Admin Console, Provider Portal, Secrets Manager, billing and plans, and organization policies are web and server products. A client cannot provide them.
