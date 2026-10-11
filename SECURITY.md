# Security

## Report a vulnerability

Report privately on GitHub: open the Security tab of [bodencrouch/strongroom](https://github.com/bodencrouch/strongroom), choose Report a vulnerability, and describe what you found. Do not open a public issue or pull request for it.

Include the Strongroom version, the platform, the `bw` version from `bw --version`, and steps that reproduce it with fake data. Leave out real vault contents, session keys and raw `bw` output.

## What is in scope

- Strongroom code in this repository: the desktop app, browser extension, Raycast extension and CLI.
- Leaks of secrets: passwords, one-time secrets, Send contents or session keys reaching a log, the window, the clipboard past its timer, or the network.
- A locked vault that still serves reads or fills.
- Browser fill that releases a credential to the wrong origin.
- Anything that makes Strongroom call a network address outside the list in the README.

## What is not

- The Bitwarden server, the official Bitwarden apps and `bw` itself. Report those to Bitwarden through their own program.
- Limits the server enforces, such as storage quotas or Premium checks. Strongroom does not change them.
- Problems that need an attacker who already controls your unlocked machine.

## What to expect

One person maintains this project, in spare time. I read reports as soon as I can and answer on a best-effort basis. There is no fixed response time and no bounty. A confirmed problem gets a fix and a note in the release that carries it.
