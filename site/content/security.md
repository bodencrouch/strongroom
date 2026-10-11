---
title: 'Security model: what Strongroom keeps out of the window'
description: 'How Strongroom handles secrets: main-process only vault access, a sandboxed window, no custom crypto, 30-second clipboard clear, locked vault rejects calls.'
nav: Security
order: 7
updated: 2026-10-10
---

# Security model

Strongroom does not do vault cryptography. `bw` does. What Strongroom adds is a boundary between the window that draws the UI and the process that talks to `bw`.

This is a description of code, not an audit. Nobody independent has reviewed it. If you find a hole, follow the [security policy](https://github.com/bodencrouch/strongroom/security) in the repo.

## The window is sandboxed

The desktop window is created with `nodeIntegration: false`, `contextIsolation: true` and `sandbox: true`. Check: `grep -n "nodeIntegration\|contextIsolation\|sandbox" apps/desktop/src/main/main.ts`. The only bridge is `contextBridge.exposeInMainWorld('strongroom', api)` in `apps/desktop/src/preload/index.ts`.

## What stays in the main process

The main process holds the session, runs `bw`, and decides every action. The window sends typed requests. Each request is validated by a strict zod schema in `packages/shared/src/protocol.ts`, and unknown keys are rejected. A copy request names an item and a field (`username`, `password`, `notes`, `website`). It does not carry the value.

The one-time secret of a login is read in the main process. The window asks for `totp` by item id and gets back a code and the seconds remaining, not the secret. `TotpCode` in `packages/shared/src/totp.ts` has three fields: `code`, `remaining`, `period`.

## No custom cryptography

The only crypto call Strongroom makes is `crypto.subtle` for HMAC in the one-time code module and SHA-1 for the breach prefix. Both are platform primitives. Vault encryption, key derivation and sign-in stay in `bw`. Check: `grep -rn "crypto\." packages apps/desktop/src --include=*.ts`.

## The vault is never served on a port

The desktop app keeps a warm `bw serve` process. The comment in `apps/desktop/src/main/serve.ts` says it is reached through one connected socket handed over as a file descriptor, so it never listens on a port and leaves no socket file.

## Clipboard auto-clear

Passwords, one-time codes and Send links are copied through the main process and cleared after 30 seconds, and only if the clipboard still holds the value Strongroom put there. They are also cleared on shutdown. See `copyValue` and `clearCopiedSecret` in `apps/desktop/src/main/lifecycle.ts`.

One-time codes used to go through the page clipboard and skipped this timer. That is fixed: the desktop row and the browser popup both ask the main process to copy, so a code clears like a password. The check is the `copyTotp` request in `apps/desktop/src/main/lifecycle.ts`.

## A locked vault rejects requests

Handlers re-check `vault.snapshot().status !== 'unlocked'` before and after each action. A request that started before a lock and finishes after it is dropped, using an epoch counter. Check: `grep -n "Vault locked" apps/desktop/src/main/*.ts`. The CLI does the same: with no `BW_SESSION` it stops with `Vault is locked`.

## What this does not protect against

A compromised machine, a malicious browser extension on the same profile, or a keylogger. Malware that runs as you can read what you can read. Strongroom narrows what the window can reach. It does not change that.

## Who can ask the bridge for a password

The browser extension and Raycast talk to the desktop app over a local socket. On packaged macOS builds, Strongroom asks you to approve that access (`enforced` in `apps/desktop/src/main/external-access.ts`). On Linux and Windows it does not prompt. The bridge relies on a token file that only your user can read, so any process running as you can ask it for a password. Safari's bridge checks the identity of the socket instead of prompting. Treat Linux and Windows accordingly: they are not a boundary against malware that already runs as you.
