# Teams Message Filter

A Firefox (and Chrome/Edge) browser extension that automatically hides messages from specified people on Microsoft Teams web.

## Installation

### Firefox (temporary, resets on restart)
1. Go to `about:debugging` → **This Firefox**
2. Click **Load Temporary Add-on**
3. Select any file inside this folder (e.g. `manifest.json`)

### Firefox (permanent, requires self-signing)
```bash
npm install -g web-ext
web-ext sign --api-key=... --api-secret=...
```
Or submit to [addons.mozilla.org](https://addons.mozilla.org) for a signed `.xpi`.

### Chrome / Edge
1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select this folder

## Usage

1. Click the extension icon in the toolbar
2. Type a person's **display name** (as shown in Teams) and click **Add**
3. Reload the Teams tab — messages from that person are hidden immediately and as new ones arrive

Names are matched case-insensitively and support partial matches (e.g. `"John"` hides messages from `"John Smith"`).

## How it works

- A content script is injected into `teams.microsoft.com`
- It targets `div.fui-ChatMessage` — the block Teams uses for each message, which contains both the author header and the message body
- The sender name is read from `[data-tid="message-author-name"]` inside that block
- A `MutationObserver` catches new messages in real time as they arrive
- Blocked names are stored in `browser.storage.sync` so the list persists across sessions

## Limitations

- **Hides, does not delete.** Teams only allows deleting your own messages via its UI. For other people's messages the extension removes them from your view client-side; they still exist on the server.
- **Teams web only.** The desktop app and mobile app are not affected.
- **Temporary install resets on Firefox restart.** Use `web-ext sign` or the AMO submission process for a persistent install.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3, with Firefox `browser_specific_settings`) |
| `content.js` | Content script — detects and hides messages |
| `popup.html` / `popup.js` | Extension popup UI for managing the blocklist |
| `icons/` | Extension icons (16 × 16, 48 × 48, 128 × 128) |
