# Shelby File Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/discord/1067679499042922596?color=5865F2&label=Discord&logo=discord)](http://discord.gg/shelbyserves)
[![Twitter](https://img.shields.io/twitter/follow/shelbyserves?style=social)](https://x.com/shelbyserves)
[![GitHub Stars](https://img.shields.io/github/stars/shelby?style=social)](https://github.com/shelby)

---

A zero-knowledge encrypted file sharing tool built on Shelby Network.

## What it does

Files are encrypted **in the browser** before upload using AES-256-GCM — Shelby never sees raw data. Users share files via a unique File ID + decryption key pair.

## Features

- Client-side AES-256-GCM encryption (Web Crypto API)
- PBKDF2 key derivation (200,000 iterations)
- Auto-generated strong passwords
- Drag & drop file upload
- Clean modern UI
- Zero dependencies — pure HTML/CSS/JS

## How to use

1. Open `index.html` in your browser
2. **Upload tab:** Select a file → click "Encrypt & Upload" → save your File ID and Key
3. **Download tab:** Paste File ID + Key → decrypt and save your file

## Tech Stack

- HTML5 + CSS3 + Vanilla JS
- Web Crypto API (built-in, no libraries)
- Shelby Network storage infrastructure

## Shelby Integration

The `shelbyUpload()` and `shelbyDownload()` functions in `app.js` are ready to be connected to the Shelby testnet SDK. Currently uses localStorage for demo purposes.

```js
// app.js — replace these with real Shelby SDK calls:
// await shelby.storage.upload(encryptedBytes)
// await shelby.storage.download(fileId)
```

## Privacy

- Encryption happens 100% client-side
- The server (Shelby) only stores encrypted bytes
- Without the decryption key, files are unreadable

---

- https://zero-knowledge-encrypted-file-vault.vercel.app/



---

- Built with ❤️ for the Shelby community.
