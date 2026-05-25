const sb = supabase.createClient(
  window.FLASHCARD_SUPABASE_URL,
  window.FLASHCARD_SUPABASE_ANON_KEY
);

const authPanel = document.getElementById('authPanel');
const adminTools = document.getElementById('adminTools');
const authMessage = document.getElementById('authMessage');
const adminMessage = document.getElementById('adminMessage');
const recordStatus = document.getElementById('recordStatus');
const logoutBtn = document.getElementById('logoutBtn');
const categorySelect = document.getElementById('cardCategory');

let currentUser = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordedAudioUrl = null;

function setAuthMessage(message) { authMessage.textContent = message || ''; }
function setAdminMessage(message) { adminMessage.textContent = message || ''; }
function setRecordStatus(message) { recordStatus.textContent = message || ''; }

async function init() {
  const { data } = await sb.auth.getUser();
  currentUser = data.user || null;

  if (currentUser) {
    authPanel.classList.add('hidden');
    adminTools.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    await loadCategories();
  } else {
    authPanel.classList.remove('hidden');
    adminTools.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}

async function register() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    setAuthMessage('Enter an email and password.');
    return;
  }

  const { error } = await sb.auth.signUp({ email, password });

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  setAuthMessage('Registration successful. If email confirmation is enabled, check your inbox. Otherwise, log in now.');
}

async function login() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    setAuthMessage('Enter an email and password.');
    return;
  }

  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  await init();
}

async function logout() {
  await sb.auth.signOut();
  window.location.reload();
}

async function loadCategories() {
  const { data, error } = await sb
    .from('categories')
    .select('*')
    .order('is_public', { ascending: false })
    .order('name');

  if (error) {
    setAdminMessage(`Error loading categories: ${error.message}`);
    console.error(error);
    return;
  }

  categorySelect.innerHTML = '';

  if (!data || !data.length) {
    categorySelect.innerHTML = '<option value="">No categories yet</option>';
    return;
  }

  data.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = `${cat.name} ${cat.is_public ? '(Public)' : '(Private)'}`;
    categorySelect.appendChild(option);
  });
}

async function addCategory() {
  const nameInput = document.getElementById('categoryName');
  const name = nameInput.value.trim();

  if (!name) {
    setAdminMessage('Add a category name first.');
    return;
  }

  const { error } = await sb.from('categories').insert({
    name,
    owner_id: currentUser.id,
    is_public: false
  });

  if (error) {
    setAdminMessage(`Error adding category: ${error.message}`);
    console.error(error);
    return;
  }

  nameInput.value = '';
  setAdminMessage('Private category added.');
  await loadCategories();
}

function previewComputerVoice() {
  const word = document.getElementById('cardWordInput').value.trim();

  if (!word) {
    setAdminMessage('Type a word first to preview the computer voice.');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-GB';
  utterance.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recordedChunks = [];
    recordedBlob = null;
    clearRecordedAudioUrl();

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      recordedAudioUrl = URL.createObjectURL(recordedBlob);

      document.getElementById('previewRecordBtn').disabled = false;
      document.getElementById('clearRecordBtn').disabled = false;
      setRecordStatus('Recording saved locally. Preview it or save the flashcard.');
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();

    document.getElementById('startRecordBtn').disabled = true;
    document.getElementById('stopRecordBtn').disabled = false;
    setRecordStatus('Recording...');
  } catch (error) {
    setRecordStatus(`Microphone error: ${error.message}`);
    console.error(error);
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
  mediaRecorder.stop();
  document.getElementById('startRecordBtn').disabled = false;
  document.getElementById('stopRecordBtn').disabled = true;
}

function previewRecording() {
  if (!recordedAudioUrl) {
    setRecordStatus('No recording to preview.');
    return;
  }
  new Audio(recordedAudioUrl).play();
}

function clearRecording() {
  recordedBlob = null;
  recordedChunks = [];
  clearRecordedAudioUrl();
  document.getElementById('previewRecordBtn').disabled = true;
  document.getElementById('clearRecordBtn').disabled = true;
  setRecordStatus('Recording cleared.');
}

function clearRecordedAudioUrl() {
  if (recordedAudioUrl) {
    URL.revokeObjectURL(recordedAudioUrl);
    recordedAudioUrl = null;
  }
}

async function addCard() {
  const wordInput = document.getElementById('cardWordInput');
  const photoInput = document.getElementById('cardPhoto');

  const word = wordInput.value.trim();
  const category_id = categorySelect.value;
  const file = photoInput.files[0];

  if (!category_id) {
    setAdminMessage('Choose a category first.');
    return;
  }

  if (!word) {
    setAdminMessage('Add a word, letter, or number first.');
    return;
  }

  let imageUrl = null;
  let audioUrl = null;

  if (file) {
    setAdminMessage('Uploading image...');
    const imageName = `${currentUser.id}/${Date.now()}-${safeFilename(file.name)}`;

    const { error: uploadError } = await sb.storage
      .from('private-images')
      .upload(imageName, file);

    if (uploadError) {
      setAdminMessage(`Image upload error: ${uploadError.message}`);
      console.error(uploadError);
      return;
    }

    const { data } = sb.storage.from('private-images').getPublicUrl(imageName);
    imageUrl = data.publicUrl;
  }

  if (recordedBlob) {
    setAdminMessage('Uploading recording...');
    const audioName = `${currentUser.id}/${Date.now()}-${safeFilename(word)}.webm`;

    const { error: audioError } = await sb.storage
      .from('private-audio')
      .upload(audioName, recordedBlob, { contentType: 'audio/webm' });

    if (audioError) {
      setAdminMessage(`Audio upload error: ${audioError.message}`);
      console.error(audioError);
      return;
    }

    const { data } = sb.storage.from('private-audio').getPublicUrl(audioName);
    audioUrl = data.publicUrl;
  }

  const { error: insertError } = await sb.from('cards').insert({
    category_id,
    word,
    image_url: imageUrl,
    audio_url: audioUrl,
    owner_id: currentUser.id,
    is_public: false
  });

  if (insertError) {
    setAdminMessage(`Card save error: ${insertError.message}`);
    console.error(insertError);
    return;
  }

  wordInput.value = '';
  photoInput.value = '';
  clearRecording();
  setAdminMessage('Flashcard saved.');
}

function safeFilename(value) {
  return String(value || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .slice(0, 80);
}

document.getElementById('loginBtn').onclick = login;
document.getElementById('registerBtn').onclick = register;
logoutBtn.onclick = logout;

document.getElementById('addCategoryBtn').onclick = addCategory;
document.getElementById('previewVoiceBtn').onclick = previewComputerVoice;
document.getElementById('addCardBtn').onclick = addCard;

document.getElementById('startRecordBtn').onclick = startRecording;
document.getElementById('stopRecordBtn').onclick = stopRecording;
document.getElementById('previewRecordBtn').onclick = previewRecording;
document.getElementById('clearRecordBtn').onclick = clearRecording;

init();
