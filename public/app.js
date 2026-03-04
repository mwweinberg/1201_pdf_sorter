const CATEGORIES = [
  'All-non-prohibited uses',
  'AV-accessibility',
  'AV-comment',
  'AV-data_access',
  'AV-edu',
  'AV-shifting',
  'CP-automated',
  'CP-data_access',
  'CP-diagnosis',
  'CP-jailbreaking',
  'CP-preservation',
  'CP-security',
  'CP-shifting',
  'CP-unlocking',
  'LW-accessibility',
  'LW-data_access',
  'LW-shifting',
];

// ── State ──
let currentFile = null;
let selectedCategories = new Set();
let selectedSides = new Set();
let destinations = []; // Array of { category, side }

// ── DOM refs ──
const filePath        = document.getElementById('file-path');
const progressBar     = document.getElementById('progress-bar');
const progressText    = document.getElementById('progress-text');
const pdfViewer       = document.getElementById('pdf-viewer');
const categoriesEl    = document.getElementById('categories');
const resetBtn        = document.getElementById('reset-btn');
const proponentsBtn   = document.getElementById('proponents-btn');
const opponentsBtn    = document.getElementById('opponents-btn');
const destSection     = document.getElementById('destinations-section');
const destList        = document.getElementById('destinations-list');
const copyBtn         = document.getElementById('copy-btn');
const skipBtn         = document.getElementById('skip-btn');
const completeMsg     = document.getElementById('complete-msg');
const actionButtons   = document.getElementById('action-buttons');
const skippedModal    = document.getElementById('skipped-modal');
const skippedList     = document.getElementById('skipped-list');

// ── Init ──
function init() {
  buildCategoryButtons();
  resetBtn.addEventListener('click', handleReset);
  proponentsBtn.addEventListener('click', () => toggleSide('proponents'));
  opponentsBtn.addEventListener('click', () => toggleSide('opponents'));
  copyBtn.addEventListener('click', copyAndNext);
  skipBtn.addEventListener('click', skip);
  document.getElementById('close-modal-btn').addEventListener('click', closeSkippedModal);
  skippedModal.addEventListener('click', e => { if (e.target === skippedModal) closeSkippedModal(); });
  // Full reset on first load
  resetSelections();
  loadNextFile();
}

function buildCategoryButtons() {
  categoriesEl.innerHTML = '';
  for (const cat of CATEGORIES) {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener('click', () => toggleCategory(cat, btn));
    categoriesEl.appendChild(btn);
  }
}

// ── Category selection ──
function toggleCategory(cat, btn) {
  if (selectedCategories.has(cat)) {
    selectedCategories.delete(cat);
    btn.classList.remove('selected');
    destinations = destinations.filter(d => d.category !== cat);
  } else {
    selectedCategories.add(cat);
    btn.classList.add('selected');
    for (const side of selectedSides) {
      if (!destinations.some(d => d.category === cat && d.side === side)) {
        destinations.push({ category: cat, side });
      }
    }
  }
  renderDestinations();
}

// ── Side toggle ──
function toggleSide(side) {
  if (selectedSides.has(side)) {
    selectedSides.delete(side);
    destinations = destinations.filter(d => d.side !== side);
  } else {
    selectedSides.add(side);
    for (const category of selectedCategories) {
      if (!destinations.some(d => d.category === category && d.side === side)) {
        destinations.push({ category, side });
      }
    }
  }
  renderDestinations();
}

function renderDestinations() {
  proponentsBtn.classList.toggle('selected', selectedSides.has('proponents'));
  opponentsBtn.classList.toggle('selected', selectedSides.has('opponents'));

  if (destinations.length === 0) {
    destSection.classList.add('hidden');
    copyBtn.disabled = true;
    return;
  }

  destSection.classList.remove('hidden');
  copyBtn.disabled = false;

  destList.innerHTML = '';
  destinations.forEach((dest, index) => {
    const li = document.createElement('li');
    li.classList.add(dest.side);

    const label = document.createElement('span');
    label.textContent = `${dest.category} / ${dest.side}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => {
      destinations.splice(index, 1);
      renderDestinations();
    });

    li.appendChild(label);
    li.appendChild(removeBtn);
    destList.appendChild(li);
  });
}

// ── Reset category button UI (not destinations) ──
function resetSelections() {
  selectedCategories.clear();
  selectedSides.clear();
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
}

// ── API calls ──

// Only fetches the next file — preserves selectedCategories and destinations
async function loadNextFile() {
  try {
    const res = await fetch('/api/next');
    const data = await res.json();

    updateProgress(data);

    if (!data.file) {
      showComplete();
      return;
    }

    currentFile = data.file;
    filePath.textContent = currentFile;
    pdfViewer.src = `/pdf/${currentFile}#zoom=75`;
  } catch (err) {
    filePath.textContent = 'Error loading next file.';
    console.error(err);
  }
}

async function copyAndNext() {
  if (!currentFile || destinations.length === 0) return;

  copyBtn.disabled = true;
  copyBtn.textContent = 'Copying...';

  try {
    const res = await fetch('/api/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentFile, destinations }),
    });

    if (res.ok) {
      // Keep selections and destinations for the next file
      await loadNextFile();
      copyBtn.textContent = 'Copy & Next →';
      // Re-enable copy button if we still have destinations
      if (destinations.length > 0) copyBtn.disabled = false;
    } else {
      const data = await res.json();
      alert('Error: ' + (data.errors ? data.errors.join('\n') : data.error));
      copyBtn.disabled = false;
      copyBtn.textContent = 'Copy & Next →';
    }
  } catch (err) {
    alert('Network error: ' + err.message);
    copyBtn.disabled = false;
    copyBtn.textContent = 'Copy & Next →';
  }
}

async function skip() {
  if (!currentFile) return;

  skipBtn.disabled = true;

  try {
    await fetch('/api/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentFile }),
    });
    // Keep selections and destinations for the next file
    await loadNextFile();
    skipBtn.disabled = false;
  } catch (err) {
    alert('Network error: ' + err.message);
    skipBtn.disabled = false;
  }
}

// ── UI helpers ──
function updateProgress(data) {
  const done = data.reviewed + data.skipped;
  const pct = data.total > 0 ? Math.round((done / data.total) * 100) : 0;
  progressBar.style.width = pct + '%';
  const skippedPart = data.skipped > 0
    ? `<span class="skipped-link" id="skipped-count-link">${data.skipped} skipped</span>`
    : '0 skipped';
  progressText.innerHTML = `${done} / ${data.total} (${pct}%) — ${data.reviewed} copied, ${skippedPart}`;
  if (data.skipped > 0) {
    document.getElementById('skipped-count-link').addEventListener('click', openSkippedModal);
  }
}

async function openSkippedModal() {
  const res = await fetch('/api/skipped');
  const data = await res.json();
  skippedList.innerHTML = '';
  for (const file of data.skipped) {
    const li = document.createElement('li');
    li.textContent = file;
    skippedList.appendChild(li);
  }
  skippedModal.classList.remove('hidden');
}

function closeSkippedModal() {
  skippedModal.classList.add('hidden');
}

function showComplete() {
  currentFile = null;
  filePath.textContent = 'All documents reviewed!';
  pdfViewer.src = '';
  categoriesEl.classList.add('hidden');
  document.getElementById('side-buttons').classList.add('hidden');
  destSection.classList.add('hidden');
  actionButtons.classList.add('hidden');
  completeMsg.classList.remove('hidden');
}

// ── Reset ──
async function handleReset() {
  const confirmed = confirm(
    'This will permanently delete all sorted files and reset progress to zero.\n\nThis cannot be undone. Are you sure?'
  );
  if (!confirmed) return;

  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) {
      const data = await res.json();
      alert('Reset failed: ' + (data.error || 'Unknown error'));
      return;
    }
    // Reset client state
    destinations = [];
    resetSelections();
    renderDestinations();
    // Restore hidden UI elements in case we were on the complete screen
    completeMsg.classList.add('hidden');
    categoriesEl.classList.remove('hidden');
    document.getElementById('side-buttons').classList.remove('hidden');
    actionButtons.classList.remove('hidden');
    await loadNextFile();
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

// ── Start ──
init();
