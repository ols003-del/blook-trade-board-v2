(() => {
  // Blooks come from the supplied image-path manifest.
  const MANIFEST_URL = new URL('blook-image-paths.txt', document.baseURI);
  const IMAGE_ORIGIN = 'https://blacket.org';
  let catalog = [];
  let targetTextarea = null;
  let selected = new Map();
  const $ = (selector) => document.querySelector(selector);

  function imageUrl(path) {
    return path ? new URL(path, IMAGE_ORIGIN).href : '';
  }
  function readExisting(text) {
    const result = new Map();
    for (const line of text.split('\n')) {
      const [name = '', count = '1', image = ''] = line.split('|').map((part) => part.trim());
      if (!name) continue;
      const item = catalog.find((entry) => entry.name.toLowerCase() === name.toLowerCase()
        && (!image || image === entry.path || image === imageUrl(entry.path)));
      const key = item?.path || `custom:${name.toLowerCase()}`;
      result.set(key, { name, quantity: Math.max(1, parseInt(count, 10) || 1), path: item?.path || image });
    }
    return result;
  }
  function render() {
    const query = $('#blook-picker-search').value.trim().toLocaleLowerCase();
    const grid = $('#blook-picker-grid');
    grid.replaceChildren();
    const matches = catalog.filter((item) => item.name.toLocaleLowerCase().includes(query));
    $('#blook-picker-empty').classList.toggle('hidden', matches.length > 0);
    matches.forEach((item) => renderCard(item, grid));
    const total = [...selected.values()].reduce((sum, item) => sum + item.quantity, 0);
    $('#blook-picker-count').textContent = `${matches.length} shown · ${selected.size} Blooks selected (${total} total)`;
  }
  function renderCard(item, grid) {
    const choice = selected.get(item.path);
    const card = document.createElement('article');
    card.className = `blook-choice${choice ? ' selected' : ''}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', String(Boolean(choice)));
    card.setAttribute('aria-label', `${item.name}, ${choice?.quantity || 0} selected. Click to toggle.`);

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
      imageFrame.textContent = 'Image unavailable';
    };
    imageFrame.append(image);

    const label = document.createElement('strong');
    label.className = 'blook-choice-name';
    label.textContent = item.name;
    const controls = document.createElement('div');
    controls.className = 'blook-quantity';
    const minus = document.createElement('button');
    minus.type = 'button'; minus.textContent = '−'; minus.disabled = !choice;
    minus.setAttribute('aria-label', `Remove one ${item.name}`);
    minus.addEventListener('click', (event) => { event.stopPropagation(); adjust(item, -1); });
    const amount = document.createElement('span');
    amount.textContent = String(choice?.quantity || 0);
    const plus = document.createElement('button');
    plus.type = 'button'; plus.textContent = '+';
    plus.setAttribute('aria-label', `Add one ${item.name}`);
    plus.addEventListener('click', (event) => { event.stopPropagation(); adjust(item, 1); });
    controls.append(minus, amount, plus);
    card.append(imageFrame, label, controls);
    card.addEventListener('click', () => toggle(item));
    card.addEventListener('keydown', (event) => {
      if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      toggle(item);
    });
    grid.append(card);
  }
  function toggle(item) {
    if (selected.has(item.path)) selected.delete(item.path);
    else selected.set(item.path, { name: item.name, quantity: 1, path: item.path });
    render();
  }
  function adjust(item, delta) {
    const next = (selected.get(item.path)?.quantity || 0) + delta;
    if (next <= 0) selected.delete(item.path);
    else selected.set(item.path, { name: item.name, quantity: Math.min(9999, next), path: item.path });
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

  fetch(MANIFEST_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load Blook manifest (${response.status}).`);
      return response.text();
    })
    .then((text) => {
      catalog = text.split(/\r?\n/).map((line) => line.trim())
        .filter((path) => path.startsWith('/content/blooks/'))
        .map((path) => {
          const filename = path.slice(path.lastIndexOf('/') + 1).split('?')[0];
          return { name: decodeURIComponent(filename.replace(/\.(png|webp|gif)$/i, '')), path };
        });
      render();
    })
    .catch((error) => {
      console.error(error);
      $('#blook-picker-empty').textContent = `${error.message} You can still type Blooks manually.`;
      $('#blook-picker-empty').classList.remove('hidden');
    });
})();
