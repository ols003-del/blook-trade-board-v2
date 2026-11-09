(() => {
  // Image files follow the public Blacket Blook asset naming convention used by
  // the project (content/blooks/<name>.png). Failed image loads show a fallback.
  const catalog = [
    'Agent Owl','Alien','Anaconda','Anglerfish','Armadillo','Astronaut','Aurora','Autumn Cat','Baby Shark','Badger','Banana','Bat','Bear','Beaver','Bee','Bigfoot','Bird','Black Bear','Black Panther','Black Widow','Blizzard','Blue Butterfly','Blue Fish','Blue Whale','Boar','Bunny','Butterfly','Cactus','Calico Cat','Camel','Caracal','Carrot','Cat','Caterpillar','Cheetah','Chicken','Chick','Chihuahua','Clownfish','Clover','Clown','Coconut','Cow','Crab','Crabapple','Crane','Crocodile','Crow','Deer','Dingo','Dinosaur','Dog','Dolphin','Donkey','Dragon','Duck','Eagle','Earth','Elephant','Elf','Emerald','Emperor Penguin','Fairy','Falcon','Fenrir','Fireworks','Flamingo','Floppy','Fox','French Bulldog','Frog','Frozen Fossil','Giraffe','Ghost','Gingerbread Man','Giraffe','Glacier','Goblin','Goat','Golden Arches','Golden Balloon','Golden Box','Golden Carrot','Golden Chicken','Golden Cookie','Golden Egg','Golden Fish','Golden Fox','Golden Gift','Golden Gorilla','Golden Lion','Golden Penguin','Golden Pig','Golden Pumpkin','Golden Rabbit','Golden Santa','Golden Snowman','Golden Unicorn','Goldfish','Golem','Goose','Gorilla','Grasshopper','Grizzly Bear','Hamster','Hedgehog','Honey Bee','Horse','Hot Chocolate','Hummingbird','Ice Cream','Ice Slime','Iguana','Jellyfish','Jester','Kangaroo','Koala','Ladybug','Lamb','Lemon','Leopard','Lion','Llama','Lobster','Lynx','Macaw','Mammoth','Manatee','Mary Kline','Meerkat','Mermaid','Mighty Bear','Milk','Mole','Monkey','Moose','Mouse','Mr. Bear','Narwhal','Ninja','Octopus','Owl','Panda','Parrot','Peacock','Penguin','Phoenix','Pig','Pineapple','Platypus','Polar Bear','Poodle','Porcupine','Pufferfish','Pumpkin','Puppy','Purple Butterfly','Rabbit','Raccoon','Raptor','Raven','Red Panda','Reindeer','Rhinoceros','Ring-tailed Lemur','Robot','Rock','Rose','Seahorse','Seal','Shark','Sheep','Sloth','Snow Globe','Snow Leopard','Snowman','Snowy Owl','Spider','Squirrel','Stag','Stegosaurus','Sunflower','Swan','T-rex','Tiger','Toucan','Turtle','Unicorn','Walrus','Watermelon','Whale','White Peacock','Wild Boar','Wolf','Yeti','Zebra','Clark'
  ];
  const imageBase = 'https://blacket.org/content/blooks/';
  let targetTextarea = null;
  let selected = new Map();
  const $ = (selector) => document.querySelector(selector);

  function imageUrl(name) {
    return imageBase + encodeURIComponent(name).replace(/%20/g, '%20') + '.png';
  }
  function readExisting(text) {
    const result = new Map();
    for (const line of text.split('\n')) {
      const [name = '', count = '1', image = ''] = line.split('|').map((part) => part.trim());
      if (!name) continue;
      result.set(name.toLowerCase(), { name, quantity: Math.max(1, parseInt(count, 10) || 1), image: image || imageUrl(name) });
    }
    return result;
  }
  function render() {
    const query = $('#blook-picker-search').value.trim().toLowerCase();
    const grid = $('#blook-picker-grid');
    grid.replaceChildren();
    const results = [...new Set(catalog)].filter((name) => name.toLowerCase().includes(query));
    $('#blook-picker-empty').classList.toggle('hidden', results.length > 0);
    for (const name of results) {
      const key = name.toLowerCase();
      const choice = selected.get(key);
      const card = document.createElement('article');
      card.className = `blook-choice${choice ? ' selected' : ''}`;
      const image = document.createElement('img');
      image.src = imageUrl(name);
      image.alt = '';
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
      minus.addEventListener('click', (event) => { event.stopPropagation(); adjust(name, -1); });
      plus.addEventListener('click', (event) => { event.stopPropagation(); adjust(name, 1); });
      controls.append(minus, amount, plus);
      card.addEventListener('click', () => adjust(name, choice ? -choice.quantity : 1));
      card.append(image, label, controls);
      grid.append(card);
    }
    const total = [...selected.values()].reduce((sum, item) => sum + item.quantity, 0);
    $('#blook-picker-count').textContent = `${selected.size} Blook${selected.size === 1 ? '' : 's'} selected · ${total} total`;
  }
  function adjust(name, delta) {
    const key = name.toLowerCase();
    const next = (selected.get(key)?.quantity || 0) + delta;
    if (next <= 0) selected.delete(key);
    else selected.set(key, { name, quantity: Math.min(9999, next), image: imageUrl(name) });
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
      const lines = [...selected.values()].map(({ name, quantity, image }) => `${name} | ${quantity} | ${image}`);
      targetTextarea.value = lines.join('\n');
      targetTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    $('#blook-picker-dialog').close();
  });
  document.querySelector('[data-picker-close]').addEventListener('click', () => $('#blook-picker-dialog').close());
  $('#blook-picker-dialog').addEventListener('click', (event) => {
    if (event.target === $('#blook-picker-dialog')) $('#blook-picker-dialog').close();
  });
})();
