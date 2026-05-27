(() => {
  'use strict';

  const ext = (typeof browser !== 'undefined') ? browser : chrome;

  const STORAGE_KEY = 'teamsFilterBlockedUsers';
  const ATTR_PROCESSED = 'data-tf-processed';
  const ATTR_HIDDEN = 'data-tf-hidden';

  let blockedUsers = [];
  let mutationObserver = null;

  // ── Selectors ──────────────────────────────────────────────────────────────
  //
  // From the real Teams DOM:
  //
  //   div.fui-ChatMessage          ← TARGET THIS (contains author + body)
  //     div.fui-ChatMessage__author
  //       span[data-tid="message-author-name"]  ← sender name lives here
  //     div
  //       div[data-tid="chat-pane-message"]     ← message body (child, not root)
  //
  // The previous version targeted [data-tid="chat-pane-message"] and searched
  // for the sender name *inside* it — but the name is a sibling, not a child.

  const MESSAGE_SELECTORS = [
    '.fui-ChatMessage',                    // ✅ primary: whole block (new Teams)
    '[data-tid="chat-pane-message"]',      // fallback body-only (will be re-rooted)
    '[class*="chatMessageListItem"]',
    '[class*="ChatMessageContainer"]',
    '[class*="ui-chat__message"]',
    '[role="article"]',
  ];

  // Find the topmost meaningful message block for a matched element.
  // If we matched an inner element (e.g. chat-pane-message), walk up
  // to the .fui-ChatMessage ancestor so we can read the author AND hide the whole block.
  function getRoot(el) {
    let cur = el;
    for (let i = 0; i < 12; i++) {
      if (!cur || cur === document.body) break;
      if (cur.classList?.contains('fui-ChatMessage')) return cur;
      cur = cur.parentElement;
    }
    return el; // fallback: use the matched element itself
  }

  // ── Sender extraction ──────────────────────────────────────────────────────

  function getSender(rootEl) {
    // 1. The authoritative Teams attribute — confirmed present in the real DOM
    const authorEl = rootEl.querySelector('[data-tid="message-author-name"]');
    if (authorEl) return authorEl.textContent.trim();

    // 2. Other possible data-tid variants
    const altEl = rootEl.querySelector('[data-tid*="author"], [data-tid*="sender"]');
    if (altEl) return altEl.textContent.trim();

    // 3. class-name patterns (Teams sometimes omits data-tid in compact rows)
    const classEl = rootEl.querySelector(
      '[class*="authorName"], [class*="AuthorName"], [class*="senderName"], [class*="SenderName"]'
    );
    if (classEl) {
      const t = classEl.textContent.trim();
      if (t && t.length < 80 && !t.includes('\n')) return t;
    }

    // 4. Avatar image aria-label → "User's avatar" or "User's name"
    const img = rootEl.querySelector(
      'img[aria-label], [role="img"][aria-label], [aria-label*="avatar"], [aria-label*="photo"]'
    );
    if (img) {
      const label = img.getAttribute('aria-label') || '';
      const name = label
        .replace(/[''']s\s*(profile\s*(picture|photo)|avatar|image)$/i, '')
        .trim();
      if (name && name.length < 80) return name;
    }

    return null;
  }

  // ── Block check ────────────────────────────────────────────────────────────

  function isBlocked(sender) {
    if (!sender || blockedUsers.length === 0) return false;
    const s = sender.toLowerCase();
    return blockedUsers.some(u => s.includes(u) || u.includes(s));
  }

  // ── Message processing ─────────────────────────────────────────────────────

  function processMessage(el) {
    const root = getRoot(el);

    // Mark the root processed so we don't repeat work for nested matches
    if (root.hasAttribute(ATTR_PROCESSED)) return;
    root.setAttribute(ATTR_PROCESSED, '1');

    const sender = getSender(root);
    if (isBlocked(sender)) {
      root.setAttribute(ATTR_HIDDEN, sender);
      root.style.setProperty('display', 'none', 'important');
    }
  }

  // ── Full scan ──────────────────────────────────────────────────────────────

  function scanAll() {
    document.querySelectorAll(`[${ATTR_PROCESSED}]`).forEach(el => {
      el.removeAttribute(ATTR_PROCESSED);
      if (el.hasAttribute(ATTR_HIDDEN)) {
        el.removeAttribute(ATTR_HIDDEN);
        el.style.removeProperty('display');
      }
    });

    for (const sel of MESSAGE_SELECTORS) {
      document.querySelectorAll(sel).forEach(processMessage);
    }
  }

  // ── MutationObserver ───────────────────────────────────────────────────────

  function processAddedNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const sel of MESSAGE_SELECTORS) {
      if (node.matches?.(sel)) processMessage(node);
      node.querySelectorAll(sel).forEach(processMessage);
    }
  }

  function startObserver() {
    if (mutationObserver) mutationObserver.disconnect();
    mutationObserver = new MutationObserver(mutations => {
      if (blockedUsers.length === 0) return;
      for (const m of mutations) {
        for (const node of m.addedNodes) processAddedNode(node);
      }
    });
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  function applyUsers(users) {
    blockedUsers = (users || []).map(u => u.toLowerCase().trim()).filter(Boolean);
    scanAll();
  }

  ext.storage.sync.get([STORAGE_KEY], result => applyUsers(result[STORAGE_KEY] || []));

  ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
      applyUsers(changes[STORAGE_KEY].newValue || []);
    }
  });

  // ── Boot ───────────────────────────────────────────────────────────────────

  startObserver();

  let scansLeft = 10;
  const bootTimer = setInterval(() => {
    if (blockedUsers.length > 0) scanAll();
    if (--scansLeft <= 0) clearInterval(bootTimer);
  }, 3000);
})();
