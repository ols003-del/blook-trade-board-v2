import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const url = window.SUPABASE_URL;
const anonKey = window.SUPABASE_ANON_KEY;
const configured = Boolean(url && anonKey);
const supabase = configured ? createClient(url, anonKey) : null;

const $ = (selector) => document.querySelector(selector);
const listingsNode = $('#listings');
let listings = [];
let activeListing = null;
let toastTimer;

function notify(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 3200);
}
function showNotice(message) {
  $('#notice').textContent = message;
  $('#notice').classList.remove('hidden');
}
function getPublicUserName(user) {
  const meta = user?.user_metadata || {};
  return meta.username || meta.global_name || meta.full_name || meta.name || 'Discord trader';
}
function normalizeItems(input) {
  return input.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name = '', quantity = '1', image = ''] = line.split('|').map((part) => part.trim());
    return { name: name.slice(0, 60), quantity: Math.max(1, Math.min(9999, parseInt(quantity, 10) || 1)), image: image.slice(0, 500) };
  }).filter((item) => item.name);
}
function safeImage(src) {
  if (!src) return '';
  try {
    const parsed = new URL(src, window.location.href);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
  } catch { return ''; }
}
function makeItem(item) {
  const chip = document.createElement('div');
  chip.className = 'blook-chip';
  const image = safeImage(item.image);
  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => img.remove();
    chip.append(img);
  } else {
    const placeholder = document.createElement('span');
    placeholder.className = 'blook-placeholder';
    placeholder.textContent = '✦';
    chip.append(placeholder);
  }
  const label = document.createElement('span');
  label.className = 'blook-label';
  label.textContent = `${item.quantity} × ${item.name}`;
  chip.append(label);
  return chip;
}
function makeTradeColumn(title, items) {
  const section = document.createElement('section');
  section.className = 'trade-side';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const itemList = document.createElement('div');
  itemList.className = 'blook-list';
  (items || []).forEach((item) => itemList.append(makeItem(item)));
  section.append(heading, itemList);
  return section;
}
function renderListings() {
  const query = $('#search').value.trim().toLowerCase();
  listingsNode.replaceChildren();
  const visible = listings.filter((listing) => {
    const allText = [listing.game_username, listing.details, ...(listing.offers || []).map((x) => x.name), ...(listing.wants || []).map((x) => x.name)].join(' ').toLowerCase();
    return allText.includes(query);
  });
  $('#listing-count').textContent = `${visible.length} ${visible.length === 1 ? 'listing' : 'listings'}`;
  $('#empty-state').classList.toggle('hidden', visible.length !== 0);
  visible.forEach((listing) => {
    const card = document.createElement('article');
    card.className = 'listing-card';
    const top = document.createElement('div');
    top.className = 'listing-top';
    const seller = document.createElement('div');
    seller.className = 'seller-info';
    const avatar = document.createElement('span');
    avatar.className = 'seller-avatar';
    avatar.textContent = String(listing.game_username || 'B').slice(0, 1).toUpperCase();
    const sellerText = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = listing.game_username;
    const sub = document.createElement('small');
    sub.textContent = `Posted ${new Date(listing.created_at).toLocaleDateString()}`;
    sellerText.append(name, sub);
    seller.append(avatar, sellerText);
    const button = document.createElement('button');
    button.className = 'button button-outline';
    button.textContent = 'Message trader';
    button.addEventListener('click', () => beginMessage(listing));
    top.append(seller, button);
    const columns = document.createElement('div');
    columns.className = 'trade-columns';
    columns.append(makeTradeColumn('Offering', listing.offers), makeTradeColumn('Looking for', listing.wants));
    card.append(top, columns);
    if (listing.details) {
      const details = document.createElement('p');
      details.className = 'listing-details';
      details.textContent = listing.details;
      card.append(details);
    }
    listingsNode.append(card);
  });
}
async function loadListings() {
  if (!configured) {
    $('#listing-count').textContent = 'Supabase setup needed';
    showNotice('Add your Supabase project URL and publishable key in config.js.');
    $('#empty-state').classList.remove('hidden');
    return;
  }
  const { data, error } = await supabase.from('listings').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100);
  if (error) {
    showNotice(`Could not load listings: ${error.message}`);
    return;
  }
  listings = data || [];
  renderListings();
}
async function updateAuth() {
  if (!configured) return;
  const { data: { user } } = await supabase.auth.getUser();
  $('#account-label').textContent = user ? getPublicUserName(user) : 'Not signed in';
  $('#auth-open').classList.toggle('hidden', Boolean(user));
  $('#main-signup').classList.toggle('hidden', Boolean(user));
  $('#sign-out').classList.toggle('hidden', !user);
  let inboxButton = $('#inbox-open');
  if (user && !inboxButton) {
    inboxButton = document.createElement('button');
    inboxButton.id = 'inbox-open';
    inboxButton.className = 'button button-quiet';
    inboxButton.textContent = 'Inbox';
    inboxButton.addEventListener('click', openInbox);
    $('#account-label').after(inboxButton);
  } else if (!user && inboxButton) inboxButton.remove();
}
function openDiscordAuth() {
  $('#auth-error').textContent = '';
  if (!configured) {
    $('#auth-error').textContent = 'Supabase configuration is missing.';
    $('#auth-dialog').showModal();
    return;
  }
  $('#auth-dialog').showModal();
}
async function signInWithDiscord() {
  const button = $('#discord-signin');
  button.disabled = true;
  $('#auth-error').textContent = '';
  try {
    const redirectTo = new URL(window.location.pathname, window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo }
    });
    if (error) throw error;
  } catch (error) {
    $('#auth-error').textContent = error.message || 'Could not start Discord sign-in.';
    button.disabled = false;
  }
}
$('#auth-open').addEventListener('click', openDiscordAuth);
$('#main-signup').addEventListener('click', openDiscordAuth);
$('#discord-signin').addEventListener('click', signInWithDiscord);
$('#sign-out').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) notify(error.message);
  else { notify('Signed out.'); await updateAuth(); }
});
$('#post-open').addEventListener('click', async () => {
  if (!configured) { showNotice('Add your Supabase URL and publishable key in config.js first.'); return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { notify('Continue with Discord to post a trade.'); openDiscordAuth(); return; }
  $('#listing-error').textContent = '';
  $('#listing-form').reset();
  $('#game-username').value = getPublicUserName(user);
  $('#listing-dialog').showModal();
});
$('#listing-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { $('#listing-error').textContent = 'Sign in with Discord first.'; return; }
  const offers = normalizeItems($('#offer-input').value);
  const wants = normalizeItems($('#want-input').value);
  if (!offers.length || !wants.length) { $('#listing-error').textContent = 'Add at least one Blook to both fields.'; return; }
  const submit = event.submitter;
  submit.disabled = true;
  const { error } = await supabase.from('listings').insert({ owner_id: user.id, game_username: $('#game-username').value.trim(), offers, wants, details: $('#details-input').value.trim() });
  submit.disabled = false;
  if (error) { $('#listing-error').textContent = error.message; return; }
  $('#listing-dialog').close();
  notify('Trade listing posted.');
  await loadListings();
});
function beginMessage(listing) {
  if (!configured) { showNotice('Supabase is not configured yet.'); return; }
  activeListing = listing;
  $('#message-heading').textContent = `Message ${listing.game_username}`;
  $('#message-error').textContent = '';
  $('#message-form').reset();
  $('#message-dialog').showModal();
}
$('#message-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { $('#message-error').textContent = 'Sign in with Discord to message this trader.'; return; }
  if (user.id === activeListing.owner_id) { $('#message-error').textContent = 'You cannot message yourself about your own listing.'; return; }
  const button = event.submitter;
  button.disabled = true;
  const { error } = await supabase.from('messages').insert({ listing_id: activeListing.id, sender_id: user.id, recipient_id: activeListing.owner_id, body: $('#message-input').value.trim() });
  button.disabled = false;
  if (error) { $('#message-error').textContent = error.message; return; }
  $('#message-dialog').close();
  notify('Message sent.');
});
async function openInbox() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return openDiscordAuth();
  const container = $('#inbox-content');
  container.textContent = 'Loading messages…';
  $('#inbox-dialog').showModal();
  const { data, error } = await supabase.from('messages').select('id, listing_id, sender_id, recipient_id, body, created_at, listings(game_username, owner_id)').order('created_at', { ascending: false }).limit(100);
  container.replaceChildren();
  if (error) { container.textContent = error.message; return; }
  if (!data?.length) { container.textContent = 'No messages yet. Message a trader from a listing to start a conversation.'; return; }
  data.forEach((message) => {
    const row = document.createElement('article');
    row.className = 'inbox-message';
    const title = document.createElement('strong');
    title.textContent = `${message.sender_id === user.id ? 'You messaged' : 'Message from trader'} · ${message.listings?.game_username || 'listing'}`;
    const text = document.createElement('p');
    text.textContent = message.body;
    const time = document.createElement('small');
    time.textContent = new Date(message.created_at).toLocaleString();
    row.append(title, text, time);
    container.append(row);
  });
}
$('#search').addEventListener('input', renderListings);
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
if (configured) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      setTimeout(() => { updateAuth(); loadListings(); }, 0);
    }
  });
  updateAuth();
}
loadListings();
