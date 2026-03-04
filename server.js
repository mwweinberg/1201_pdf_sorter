const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const ORIGINAL_DOCS = path.join(__dirname, 'original_documents');
const SORTED_DIR = path.join(__dirname, 'sorted');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

const CATEGORIES = [
  'All-non-prohibited uses',
  'AV-accessibility',
  'AV-comment',
  'AV-data_access',
  'AV-edu',
  'AV-shifting',
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

app.use(express.json());
app.use(express.static('public'));

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { reviewed: [], skipped: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function getAllFiles() {
  const files = [];
  const rounds = fs.readdirSync(ORIGINAL_DOCS)
    .filter(f => fs.statSync(path.join(ORIGINAL_DOCS, f)).isDirectory())
    .sort();

  for (const round of rounds) {
    const roundPath = path.join(ORIGINAL_DOCS, round);
    const pdfs = fs.readdirSync(roundPath)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .sort();
    for (const pdf of pdfs) {
      files.push(`${round}/${pdf}`);
    }
  }
  return files;
}

// Get the next unreviewed file and current progress stats
app.get('/api/next', (req, res) => {
  const progress = loadProgress();
  const done = new Set([...progress.reviewed, ...progress.skipped]);
  const allFiles = getAllFiles();
  const next = allFiles.find(f => !done.has(f));

  res.json({
    file: next || null,
    total: allFiles.length,
    reviewed: progress.reviewed.length,
    skipped: progress.skipped.length,
  });
});

// Serve a PDF file from original_documents
app.get('/pdf/*', (req, res) => {
  const relativePath = req.params[0];
  const filePath = path.resolve(ORIGINAL_DOCS, relativePath);

  // Guard against path traversal
  if (!filePath.startsWith(ORIGINAL_DOCS + path.sep)) {
    return res.status(403).send('Forbidden');
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }

  res.sendFile(filePath);
});

// Copy a file to one or more destinations and mark it as reviewed
app.post('/api/copy', (req, res) => {
  const { file, destinations } = req.body;

  if (!file || !Array.isArray(destinations) || destinations.length === 0) {
    return res.status(400).json({ error: 'Missing file or destinations' });
  }

  const sourcePath = path.resolve(ORIGINAL_DOCS, file);
  if (!sourcePath.startsWith(ORIGINAL_DOCS + path.sep)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Source file not found' });
  }

  // Extract year from round folder name (e.g. "2012_round2" -> "2012")
  const roundFolder = file.split('/')[0];
  const year = roundFolder.split('_')[0];
  const filename = path.basename(file);

  const errors = [];
  for (const { category, side } of destinations) {
    if (!CATEGORIES.includes(category)) {
      errors.push(`Invalid category: ${category}`);
      continue;
    }
    if (!['proponents', 'opponents'].includes(side)) {
      errors.push(`Invalid side: ${side}`);
      continue;
    }

    const destDir = path.join(SORTED_DIR, year, category, side);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(sourcePath, path.join(destDir, filename));
  }

  if (errors.length) {
    return res.status(400).json({ errors });
  }

  const progress = loadProgress();
  if (!progress.reviewed.includes(file)) {
    progress.reviewed.push(file);
  }
  saveProgress(progress);

  res.json({ success: true });
});

// Mark a file as skipped without copying
app.post('/api/skip', (req, res) => {
  const { file } = req.body;
  if (!file) return res.status(400).json({ error: 'Missing file' });

  const progress = loadProgress();
  if (!progress.skipped.includes(file)) {
    progress.skipped.push(file);
  }
  saveProgress(progress);

  res.json({ success: true });
});

app.get('/api/skipped', (req, res) => {
  const progress = loadProgress();
  res.json({ skipped: progress.skipped });
});

// Delete all sorted files and reset progress
app.post('/api/reset', (req, res) => {
  try {
    if (fs.existsSync(SORTED_DIR)) {
      fs.rmSync(SORTED_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(SORTED_DIR);
    saveProgress({ reviewed: [], skipped: [] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PDF Sorter running at http://localhost:${PORT}`);
});
