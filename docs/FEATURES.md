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

Static analysis with [rea](https://github.com/morluto/rea) of the installed Chromium extension (version 2026.9.3): 109 files, 530 modules, no parse failures. The tool reports its relationship graphs are incomplete in places, so absence of a finding is not proof of absence. The desktop app and the `bw` CLI were located but not analyzed.
