(() => {
  'use strict';

  const ext = (typeof browser !== 'undefined') ? browser : chrome;
  const STORAGE_KEY = 'teamsFilterBlockedUsers';

  const input = document.getElementById('name-input');
  const addBtn = document.getElementById('add-btn');
  const list = document.getElementById('user-list');

  let users = [];

  // ── Render ────────────────────────────────────────────────────────────────

  function render() {
    list.innerHTML = '';
    users.forEach((name, idx) => {
      const chip = document.createElement('div');
      chip.className = 'user-chip';

      const nameEl = document.createElement('span');
      nameEl.className = 'user-name';
      nameEl.textContent = name;
      nameEl.title = name;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.title = 'Remove';
      removeBtn.setAttribute('aria-label', `Remove ${name}`);
      removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <path d="M7 5.586L11.293 1.293a1 1 0 1 1 1.414 1.414L8.414 7l4.293 4.293a1 1 0 0 1-1.414 1.414L7 8.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L5.586 7 1.293 2.707A1 1 0 0 1 2.707 1.293L7 5.586z"/>
      </svg>`;
      removeBtn.addEventListener('click', () => removeUser(idx));

      chip.appendChild(nameEl);
      chip.appendChild(removeBtn);
      list.appendChild(chip);
    });
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function addUser() {
    const name = input.value.trim();
    if (!name) return;

    const duplicate = users.some(u => u.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      input.style.borderColor = '#c4314b';
      setTimeout(() => (input.style.borderColor = ''), 800);
      return;
    }

    users.push(name);
    save();
    render();
    input.value = '';
    input.focus();
  }

  function removeUser(idx) {
    users.splice(idx, 1);
    save();
    render();
  }

  function save() {
    ext.storage.sync.set({ [STORAGE_KEY]: users });
  }

  // ── Events ────────────────────────────────────────────────────────────────

  addBtn.addEventListener('click', addUser);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') addUser();
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  ext.storage.sync.get([STORAGE_KEY], result => {
    users = result[STORAGE_KEY] || [];
    render();
  });
})();
