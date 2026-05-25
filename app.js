const sb = supabase.createClient(
  window.FLASHCARD_SUPABASE_URL,
  window.FLASHCARD_SUPABASE_ANON_KEY
);

const homeView = document.getElementById('homeView');
const categoryView = document.getElementById('categoryView');
const categoryGrid = document.getElementById('categoryGrid');
const cardGrid = document.getElementById('cardGrid');
const categoryTitle = document.getElementById('categoryTitle');
const emptyMessage = document.getElementById('emptyMessage');
const loginNotice = document.getElementById('loginNotice');
const logoutBtn = document.getElementById('logoutBtn');

let currentUser = null;

async function init() {
  const { data } = await sb.auth.getUser();
  currentUser = data.user || null;

  logoutBtn.classList.toggle('hidden', !currentUser);
  loginNotice.classList.toggle('hidden', !!currentUser);

  await loadCategories();
}

async function loadCategories() {
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('is_public', { ascending: false })
    .order('name');

  if (error) {
    categoryGrid.innerHTML = `<p class="error-message">Error loading categories: ${escapeHtml(error.message)}</p>`;
    console.error(error);
    return;
  }

  categoryGrid.innerHTML = '';

  if (!data || !data.length) {
    categoryGrid.innerHTML = '<p class="empty-message">No categories added yet.</p>';
    return;
  }

  data.forEach(cat => {
    const tile = document.createElement('button');
    tile.className = cat.is_public ? 'category-tile public-tile' : 'category-tile private-tile';
    tile.type = 'button';
    tile.innerHTML = `<span>${escapeHtml(cat.name)}</span><small>${cat.is_public ? 'Public' : 'Private'}</small>`;
    tile.onclick = () => openCategory(cat);
    categoryGrid.appendChild(tile);
  });
}

async function openCategory(category) {
  categoryTitle.textContent = category.name;
  homeView.classList.add('hidden');
  categoryView.classList.remove('hidden');
  cardGrid.innerHTML = '';
  emptyMessage.classList.add('hidden');

  const { data, error } = await sb
    .from('cards')
    .select('*')
    .eq('category_id', category.id)
    .order('word');

  if (error) {
    cardGrid.innerHTML = `<p class="error-message">Error loading cards: ${escapeHtml(error.message)}</p>`;
    console.error(error);
    return;
  }

  if (!data || !data.length) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  data.forEach(card => {
    const tile = document.createElement('button');
    tile.className = 'flashcard-tile';
    tile.type = 'button';

    const imageHtml = card.image_url
      ? `<img src="${escapeAttribute(card.image_url)}" alt="${escapeAttribute(card.word)}" />`
      : `<div class="letter-placeholder">${escapeHtml(card.word)}</div>`;

    tile.innerHTML = `
      <div class="flashcard-image-wrap">${imageHtml}</div>
      <strong>${escapeHtml(card.word)}</strong>
    `;

    tile.onclick = () => playCard(card);
    cardGrid.appendChild(tile);
  });
}

function playCard(card) {
  if (card.audio_url) {
    const audio = new Audio(card.audio_url);
    audio.play().catch(() => speak(card.word));
    return;
  }
  speak(card.word);
}

function speak(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-GB';
  utterance.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

document.getElementById('backBtn').onclick = () => {
  categoryView.classList.add('hidden');
  homeView.classList.remove('hidden');
};

logoutBtn.onclick = async () => {
  await sb.auth.signOut();
  window.location.reload();
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

init();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
