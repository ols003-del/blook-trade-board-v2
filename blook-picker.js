(() => {
  // Source of truth: the supplied newline-separated image-path manifest.
  // Manifest paths are rooted on Blacket's original image host.
  const MANIFEST_URL = new URL('blook-image-paths.txt', document.baseURI);
  const IMAGE_ORIGIN = 'https://blacket.org';
  let catalog = [];
  let targetTextarea = null;
  let selected = new Map();
  const $ = (selector) => document.querySelector(selector);

  function imageUrl(path) {
    return new URL(path, IMAGE_ORIGIN).href;
  }

  function itemKey(item) {
    return item.path;
  }

  function readExisting(text) {
    const result = new Map();
    for (const line of text.split('\n')) {
      const [name = '', count = '1', image = ''] = line.split('|').map((part) => part.trim());
      if (!name) continue;
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
    $('#blook-picker-empty').classList.toggle('hidden', matches.length > 0);
    $('#blook-picker-count').textContent = `${matches.length} of ${catalog.length} Blooks · ${selected.size} selected`;

    for (const item of matches) {
      const key = itemKey(item);
      const choice = selected.get(key);
      const card = document.createElement('article');
      card.className = `blook-choice${choice ? ' selected' : ''}`;
      const imageFrame = document.createElement('div');
      imageFrame.className = 'blook-image-frame';
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

    const total = [...selected.values()].reduce((sum, item) => sum + item.quantity, 0);
    $('#blook-picker-count').textContent = `${matches.length} shown · ${selected.size} selected (${total} total)`;
  }

  function adjust(item, delta) {
    const key = itemKey(item);
    const next = (selected.get(key)?.quantity || 0) + delta;
    if (next <= 0) selected.delete(key);
    else selected.set(key, { name: item.name, quantity: Math.min(9999, next), path: item.path });
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
        .map(({ name, quantity, path }) => `${name} | ${quantity} | ${path ? imageUrl(path) : ''}`)
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
