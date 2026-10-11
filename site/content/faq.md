---
title: 'FAQ: is Strongroom official, safe, and free of limits?'
description: 'Straight answers on Strongroom: not official, how safe it is, why use it over Bitwarden, what happens with premium features, and self-hosted servers.'
nav: FAQ
order: 8
updated: 2026-10-10
---

# Frequently asked questions

## Is Strongroom an official Bitwarden app?

No. It is an independent project, not affiliated with, endorsed by or sponsored by Bitwarden. Bitwarden is a trademark of Bitwarden, Inc. Strongroom works with a Bitwarden account by running the official `bw` CLI, and it calls itself an unofficial Bitwarden client for that reason.

## Is it safe to use?

It is early, and it has had no independent audit. Vault encryption and sign-in are done by the official `bw` CLI, and Strongroom adds no cryptography of its own. The window process never receives your one-time secrets. The code is MIT licensed and small enough to read. Start with the [security model](/security/), then run the greps it lists.

## Why not just use Bitwarden?

If the official apps do what you need, use them. Strongroom exists for the gaps you can see in [features](/features/): one-time codes in a desktop app and the command line, vault health reports without opening a browser, a keyboard-driven search, and a Raycast extension. It is also a way to script against your vault through one small CLI.

## What about premium features?

Strongroom computes some of them on your machine from your own data, such as one-time codes and the reused, weak and plain-http reports. Features the server enforces, such as attachments, file Sends and emergency access, stay server side. Strongroom passes the request to `bw` and shows the answer. It does not change a plan or get around a limit. If your account does not allow a feature, the request fails.

## Does it work with a self-hosted server?

The server address can be set, so a self-hosted Bitwarden-compatible server is reachable in principle. It has not been tested against one. Server-enforced limits are whatever your server says they are.

## Does it send my data anywhere?

Only through `bw` to your Bitwarden server, plus the calls on the [privacy page](/privacy/). The breach lookup and the two-step site list are off until you ask. Website icons are on by default and send the hostname of each login's site to `icons.bitwarden.net`. You can turn that off.

## Can I use it on Linux?

You can build it from source. See [install](/install/). No Linux package is published, and Touch ID and macOS AutoFill are macOS only.

## How do I report a bug or a security problem?

Bugs go in the [issue tracker](https://github.com/bodencrouch/strongroom/issues). For a security problem, use the repo's security policy and do not post details in public.
