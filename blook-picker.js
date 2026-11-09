(() => {
  // The text list contains the exact asset paths supplied for this project.
  // Resolve paths against Blacket's original asset host and encode spaces safely.
  const assetHost = 'https://blacket.org';
  let catalog = [];
  let targetTextarea = null;
  let selected = new Map();
  const $ = (selector) => document.querySelector(selector);

  function assetUrl(path) {
    return new URL(path, assetHost).href;
  }
  function readExisting(text) {
    const result = new Map();
    for (const line of text.split('\n')) {
      const [name = '', count = '1', image = ''] = line.split('|').map((part) => part.trim());
      if (!name) continue;
      result.set(name.toLowerCase(), { name, quantity: Math.max(1, parseInt(count, 10) || 1), image });
    }
    return result;
  }
  function render() {
    const query = $('#blook-picker-search').value.trim().toLowerCase();
    const grid = $('#blook-picker-grid');
    grid.replaceChildren();
    const results = catalog.filter((item) => item.name.toLowerCase().includes(query));
    $('#blook-picker-empty').classList.toggle('hidden', results.length > 0);
    for (const item of results) {
      const name = item.name;
      const key = name.toLowerCase();
      const choice = selected.get(key);
      const card = document.createElement('article');
      card.className = `blook-choice${choice ? ' selected' : ''}`;
      const image = document.createElement('img');
      image.src = assetUrl(item.path);
      image.alt = name;
      image.loading = 'lazy';
      image.onerror = () => { image.hidden = true; card.classList.add('no-image'); };
      const label = document.createElement('strong');
      label.textContent = name;
      const controls = document.createElement('div');
      controls.className = 'blook-quantity';
      const minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', `Remove one ${name}`);
      const amount = document.createElement('span'); amount.textContent = String(choice?.quantity || 0);
      const plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', `Add one ${name}`);
      minus.disabled = !choice;
      minus.addEventListener('click', (event) => { event.stopPropagation(); adjust(item, -1); });
      plus.addEventListener('click', (event) => { event.stopPropagation(); adjust(item, 1); });
      controls.append(minus, amount, plus);
      card.addEventListener('click', () => adjust(item, choice ? -choice.quantity : 1));
      card.append(image, label, controls);
      grid.append(card);
    }
    const total = [...selected.values()].reduce((sum, item) => sum + item.quantity, 0);
    $('#blook-picker-count').textContent = `${selected.size} Blook${selected.size === 1 ? '' : 's'} selected · ${total} total`;
  }
  function adjust(item, delta) {
    const key = item.name.toLowerCase();
    const next = (selected.get(key)?.quantity || 0) + delta;
    if (next <= 0) selected.delete(key);
    else selected.set(key, { name: item.name, quantity: Math.min(9999, next), image: assetUrl(item.path) });
    render();
  }
  async function loadCatalog() {
    const path = new URL('blook-image-paths.txt', document.baseURI);
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load Blook list (${response.status}).`);
    const paths = (await response.text()).split(/\r?\n/).map((value) => value.trim()).filter((value) => value.startsWith('/content/blooks/'));
    const seen = new Set();
    catalog = paths.map((assetPath) => {
      const file = assetPath.slice(assetPath.lastIndexOf('/') + 1).replace(/\?[^?]*$/, '');
      const name = decodeURIComponent(file.replace(/\.(png|webp|gif)$/i, ''));
      return { name, path: assetPath };
    }).filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    render();
  }
  document.querySelectorAll('[data-pick-for]').forEach((button) => {
    button.addEventListener('click', () => {
      targetTextarea = document.getElementById(button.dataset.pickFor);
      selected = readExisting(targetTextarea.value);
      $('#blook-picker-search').value = '';
      render();
      $('#blook-picker-dialog').showModal();
      $('#blook-picker-search').focus();
    });
  });
  $('#blook-picker-search').addEventListener('input', render);
  $('#blook-picker-done').addEventListener('click', () => {
    if (targetTextarea) {
      targetTextarea.value = [...selected.values()].map(({ name, quantity, image }) => `${name} | ${quantity} | ${image}`).join('\n');
      targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    $('#blook-picker-dialog').close();
  });
  document.querySelector('[data-picker-close]').addEventListener('click', () => $('#blook-picker-dialog').close());
  $('#blook-picker-dialog').addEventListener('click', (event) => {
    if (event.target === $('#blook-picker-dialog')) $('#blook-picker-dialog').close();
  });
  loadCatalog().catch((error) => {
    console.error(error);
    $('#blook-picker-empty').textContent = `${error.message} You can still type Blooks manually.`;
    $('#blook-picker-empty').classList.remove('hidden');
  });
})();
