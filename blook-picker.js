(() => {
  // Source of truth: the supplied newline-separated image-path manifest.
  // Manifest image paths are rooted on Blacket's original image host.
  const MANIFEST_URL = new URL('blook-image-paths.txt', document.baseURI);
  const IMAGE_ORIGIN = 'https://blacket.org';
  const TOKEN_ITEM = { name: 'Tokens', path: '', kind: 'currency' };
  let catalog = [];
  let targetTextarea = null;
  let selected = new Map();
  const $ = (selector) => document.querySelector(selector);

  function imageUrl(path) {
    return path ? new URL(path, IMAGE_ORIGIN).href : '';
  }
  function itemKey(item) {
    return item.kind === 'currency' ? 'currency:tokens' : item.path;
  }
  function readExisting(text) {
    const result = new Map();
    for (const line of text.split('\n')) {
      const [name = '', count = '1', image = ''] = line.split('|').map((part) => part.trim());
      if (!name) continue;
      if (/^tokens?$/i.test(name)) {
        result.set(itemKey(TOKEN_ITEM), { name: 'Tokens', quantity: Math.max(1, parseInt(count, 10) || 1), kind: 'currency' });
        continue;
      }
      const matchingItem = catalog.find((item) => item.name.toLowerCase() === name.toLowerCase()
        && (!image || image === item.path || image === imageUrl(item.path)));
      const key = matchingItem ? itemKey(matchingItem) : `custom:${name.toLowerCase()}`;
      result.set(key, {
        name,
        quantity: Math.max(1, parseInt(count, 10) || 1),
        path: matchingItem?.path || image
      });
    }
    return result;
  }

  function render() {
    const query = $('#blook-picker-search').value.trim().toLocaleLowerCase();
    const grid = $('#blook-picker-grid');
    grid.replaceChildren();
    const matches = catalog.filter((item) => item.name.toLocaleLowerCase().includes(query));
    const showTokens = TOKEN_ITEM.name.toLowerCase().includes(query);
    $('#blook-picker-empty').classList.toggle('hidden', matches.length > 0 || showTokens);

    if (showTokens) renderCard(TOKEN_ITEM, grid);
    matches.forEach((item) => renderCard(item, grid));

    const total = [...selected.values()].reduce((sum, item) => sum + item.quantity, 0);
    const shown = matches.length + Number(showTokens);
    $('#blook-picker-count').textContent = `${shown} shown · ${selected.size} selected (${total} total)`;
  }

  function renderCard(item, grid) {
    const key = itemKey(item);
    const choice = selected.get(key);
    const card = document.createElement('article');
    card.className = `blook-choice${choice ? ' selected' : ''}${item.kind === 'currency' ? ' token-choice' : ''}`;

    const imageFrame = document.createElement('div');
    imageFrame.className = 'blook-image-frame';
    if (item.kind === 'currency') {
      imageFrame.classList.add('token-image');
      imageFrame.textContent = '🪙';
      imageFrame.setAttribute('aria-label', 'Token icon');
    } else {
      const image = document.createElement('img');
      image.src = imageUrl(item.path);
      image.alt = item.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.onerror = () => {
        image.remove();
        imageFrame.classList.add('image-fallback');
        imageFrame.setAttribute('aria-label', `Image unavailable for ${item.name}`);
        imageFrame.textContent = 'Image unavailable';
      };
      imageFrame.append(image);
    }

    const label = document.createElement('strong');
    label.className = 'blook-choice-name';
    label.textContent = item.name;
    const controls = document.createElement('div');
    controls.className = 'blook-quantity';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.disabled = !choice;
    minus.setAttribute('aria-label', `Remove one ${item.name}`);
    minus.addEventListener('click', () => adjust(item, -1));
    const amount = document.createElement('span');
    amount.textContent = String(choice?.quantity || 0);
    amount.setAttribute('aria-live', 'polite');
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Add one ${item.name}`);
    plus.addEventListener('click', () => adjust(item, 1));
    controls.append(minus, amount, plus);
    card.append(imageFrame, label, controls);
    grid.append(card);
  }

  function adjust(item, delta) {
    const key = itemKey(item);
    const next = (selected.get(key)?.quantity || 0) + delta;
    if (next <= 0) selected.delete(key);
    else selected.set(key, {
      name: item.name,
      quantity: Math.min(999999999, next),
      ...(item.kind === 'currency' ? { kind: 'currency' } : { path: item.path })
    });
    render();
  }

  async function loadCatalog() {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) throw new Error(`Could not load Blook manifest (${response.status}).`);
    const paths = (await response.text())
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('/content/blooks/'));
    catalog = paths.map((path) => {
      const filename = path.slice(path.lastIndexOf('/') + 1).split('?')[0];
      const name = decodeURIComponent(filename.replace(/\.(png|webp|gif)$/i, ''));
      return { name, path };
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
      targetTextarea.value = [...selected.values()]
        .map((item) => item.kind === 'currency'
          ? `${item.name} | ${item.quantity}`
          : `${item.name} | ${item.quantity} | ${item.path ? imageUrl(item.path) : ''}`)
        .join('\n');
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
