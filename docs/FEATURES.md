# Feature map

Where each paid Bitwarden feature lives, and what Strongroom does about it.

**Client** means the feature is computed from your own vault data on your machine. Strongroom provides it fully.
**Server** means the Bitwarden server decides whether your account may use it. Strongroom sends the request through `bw` and reports the answer. It does not fake an entitlement, and it does not change the installed Bitwarden apps.

Server classifications below come from Bitwarden's public documentation. They are not yet checked against the server source code.

| Feature                        | Lives on                           | Strongroom                                                                        |
| ------------------------------ | ---------------------------------- | --------------------------------------------------------------------------- |
| Authenticator codes (TOTP)     | Client                             | Done: desktop item view and `strongroom totp`                                     |
| Steam Guard codes              | Client                             | Done, same module                                                           |
| Reused password report         | Client                             | Done: `strongroom health`                                                         |
| Weak password report           | Client                             | Done: `strongroom health`                                                         |
| Unsecured website report       | Client                             | Done: `strongroom health`                                                         |
| Exposed password report        | Client plus a public leak lookup   | Done, opt-in: `strongroom health --breaches`                                      |
| Inactive two-step report       | Client plus a public list of sites | Not started                                                                 |
| File attachments               | Server                             | Wired: `strongroom attach`. Works where the account or server allows it           |
| File Sends                     | Server                             | Not started                                                                 |
| Emergency access               | Server                             | Not possible through `bw`. Needs server API work                            |
| YubiKey and Duo two-step login | Server                             | Nothing to build: set on the account, and sign-in already asks for the code |
| Priority support               | Bitwarden                          | Not applicable                                                              |

## What the reverse-engineering covered

Static analysis with [rea](https://github.com/morluto/rea). It parses the code as text and never runs it. Nothing installed was modified.

| Build                 | Version  | Files | Modules       | Parse failures | Notes                                                                                                        |
| --------------------- | -------- | ----- | ------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| Chromium extension    | 2026.9.3 | 109   | 530           | 0              |                                                                                                              |
| Desktop app (Flatpak) | 2026.8.0 | 77    | 532           | 0              | 1 integrity mismatch on a native add-on, recorded as untrusted. 74 IPC operations and 1 context bridge found |
| `bw` CLI              | 2026.6.0 | 6     | none reported | 0              | Single bundled file                                                                                          |

rea says its relationship graphs are incomplete in places, so a missing finding is not proof that something is absent. Only a fraction of the desktop and CLI code is parsed into separate files, because the apps ship as large bundles.

The analysis was used to confirm what each build is made of and which surfaces exist. The feature classification in the table above comes from Bitwarden's public documentation and has not been checked against the server source.
