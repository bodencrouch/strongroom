# Feature map

Where each paid Bitwarden feature lives, and what Strongroom does about it.

**Client** means the feature is computed from your own vault data on your machine. Strongroom provides it fully.
**Server** means the Bitwarden server decides whether your account may use it. Strongroom sends the request through `bw` and reports the answer. It does not fake an entitlement, and it does not change the installed Bitwarden apps. Against a self-hosted server such as Vaultwarden, where these limits are off, they work without any change.

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
| Emergency access               | Server                             | Not built. See below                                                        |
| YubiKey and Duo two-step login | Server                             | Nothing to build: set on the account, and sign-in already asks for the code |
| Priority support               | Bitwarden                          | Not applicable                                                              |

## Evidence for the classification

- **Premium list.** Bitwarden's help pages list the premium plan as advanced two-step login (Duo, YubiKey), encrypted attachment storage, a built-in authenticator, emergency access, and vault health reports.
- **Attachments.** The help page says attachments are available to Premium users and members of paid organizations, with storage quota counted per account. The quota is kept by the server.
- **Sends.** A recent server change adds "premium and email-verification requirements" for item Sends. File Sends also use the account's storage quota. Both are server checks.
- **Emergency access.** The help page says adding or editing a trusted contact needs Premium. A server fix on record corrected the premium check for users who get Premium from an organization.
- **Authenticator codes.** A past client fix made codes visible to free users in classic organizations by removing a Premium check from the client. That shows the check lives in the app, and the code is computed locally from the stored secret.

These come from Bitwarden's public documentation and public issue and pull request pages. They were not checked by calling any Bitwarden service.

## Why emergency access is not built

Emergency access needs the server's trusted-contact API and an exchange of encryption keys between two accounts. `bw` has no command for it. Strongroom's rules keep vault cryptography with the official CLI, and the server decides whether an account may add contacts. Faking that check is out of scope. On a self-hosted server, the official web vault already provides it.

## What the reverse-engineering covered

Static analysis with [rea](https://github.com/morluto/rea). It parses the code as text and never runs it. Nothing installed was modified.

| Build                 | Version  | Files | Modules       | Parse failures | Notes                                                                                                        |
| --------------------- | -------- | ----- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Chromium extension    | 2026.9.3 | 109   | 530           | 0              |                                                                                                              |
| Desktop app (Flatpak) | 2026.8.0 | 77    | 532           | 0              | 1 integrity mismatch on a native add-on, recorded as untrusted. 74 IPC operations and 1 context bridge found |
| `bw` CLI              | 2026.6.0 | 6     | none reported | 0              | Single bundled file                                                                                          |

rea says its relationship graphs are incomplete in places, so a missing finding is not proof that something is absent. Only a fraction of the desktop and CLI code is parsed into separate files, because the apps ship as large bundles.

The analysis was used to confirm what each build is made of and which surfaces exist. The feature classification in the table above comes from Bitwarden's public documentation and has not been checked against the server source.
