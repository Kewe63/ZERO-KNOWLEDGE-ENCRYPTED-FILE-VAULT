// ─── State ───────────────────────────────────────────────────────────────────
let selectedFile = null;
let decryptedBlob = null;
let decryptedFileName = '';

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}-tab`).classList.remove('hidden');
  hideStatus();
}

// ─── Drop zone ────────────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });

function setFile(file) {
  selectedFile = file;
  document.getElementById('selectedFile').textContent = `📄 ${file.name} (${formatSize(file.size)})`;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

// Derive AES-256-GCM key from password string
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a random strong password
function generatePassword(len = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

// ─── Encrypt ─────────────────────────────────────────────────────────────────
async function encryptFile(file, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);

  const fileBuffer = await file.arrayBuffer();

  // Prepend filename (UTF-8) length + filename bytes before file data
  const nameBytes = new TextEncoder().encode(file.name);
  const nameLenBuf = new Uint8Array(4);
  new DataView(nameLenBuf.buffer).setUint32(0, nameBytes.length);
  const plaintext = new Uint8Array([...nameLenBuf, ...nameBytes, ...new Uint8Array(fileBuffer)]);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  // Layout: [salt 16B][iv 12B][ciphertext]
  const payload = new Uint8Array(16 + 12 + ciphertext.byteLength);
  payload.set(salt, 0);
  payload.set(iv, 16);
  payload.set(new Uint8Array(ciphertext), 28);
  return payload;
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────
async function decryptPayload(payload, password) {
  const salt       = payload.slice(0, 16);
  const iv         = payload.slice(16, 28);
  const ciphertext = payload.slice(28);
  const key        = await deriveKey(password, salt);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const plain = new Uint8Array(plaintext);

  // Extract filename
  const nameLen = new DataView(plain.buffer).getUint32(0);
  const fileName = new TextDecoder().decode(plain.slice(4, 4 + nameLen));
  const fileData = plain.slice(4 + nameLen);
  return { fileName, fileData };
}

// ─── Shelby Storage (mock + ready for real API) ───────────────────────────────
// Replace simulateUpload / simulateDownload with real Shelby SDK calls
// when testnet credentials are available.

async function shelbyUpload(encryptedBytes) {
  // TODO: Replace with → await shelby.storage.upload(encryptedBytes)
  await new Promise(r => setTimeout(r, 1200)); // simulate network
  const id = 'shelby_' + toBase64(crypto.getRandomValues(new Uint8Array(12)))
    .replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  // Store locally for demo (IndexedDB would be better for larger files)
  localStorage.setItem(id, toBase64(encryptedBytes));
  return id;
}

async function shelbyDownload(fileId) {
  // TODO: Replace with → return await shelby.storage.download(fileId)
  await new Promise(r => setTimeout(r, 900)); // simulate network
  const data = localStorage.getItem(fileId);
  if (!data) throw new Error('File not found. Make sure the File ID is correct.');
  return fromBase64(data);
}

// ─── Upload flow ──────────────────────────────────────────────────────────────
async function encryptAndUpload() {
  if (!selectedFile) { showStatus('Please select a file first.', 'error'); return; }

  const pwdInput = document.getElementById('uploadPassword').value.trim();
  const password = pwdInput || generatePassword();

  showStatus('🔒 Encrypting file...', 'info');
  try {
    const encrypted = await encryptFile(selectedFile, password);
    showStatus('📡 Uploading to Shelby Network...', 'info');
    const fileId = await shelbyUpload(encrypted);

    document.getElementById('fileId').textContent = fileId;
    document.getElementById('decryptKey').textContent = password;
    document.getElementById('uploadResult').classList.remove('hidden');
    hideStatus();
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  }
}

// ─── Download flow ────────────────────────────────────────────────────────────
async function downloadAndDecrypt() {
  const fileId   = document.getElementById('downloadFileId').value.trim();
  const password = document.getElementById('downloadKey').value.trim();
  if (!fileId || !password) { showStatus('Please enter File ID and decryption key.', 'error'); return; }

  showStatus('📡 Fetching from Shelby Network...', 'info');
  try {
    const payload = await shelbyDownload(fileId);
    showStatus('🔓 Decrypting...', 'info');
    const { fileName, fileData } = await decryptPayload(payload, password);

    decryptedFileName = fileName;
    decryptedBlob = new Blob([fileData]);

    document.getElementById('downloadFileName').textContent = `📄 ${fileName} (${formatSize(fileData.byteLength)})`;
    document.getElementById('downloadResult').classList.remove('hidden');
    hideStatus();
  } catch (e) {
    showStatus('Decryption failed. Wrong key or corrupted file.', 'error');
  }
}

// ─── Save decrypted file ──────────────────────────────────────────────────────
document.getElementById('saveBtn').addEventListener('click', () => {
  if (!decryptedBlob) return;
  const url = URL.createObjectURL(decryptedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = decryptedFileName;
  a.click();
  URL.revokeObjectURL(url);
});

// ─── Copy helper ──────────────────────────────────────────────────────────────
function copyText(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    showStatus('✅ Copied to clipboard!', 'info');
    setTimeout(hideStatus, 2000);
  });
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status ${type}`;
}

function hideStatus() {
  document.getElementById('status').className = 'status hidden';
}
