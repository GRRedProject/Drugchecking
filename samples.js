const $ = (selector) => document.querySelector(selector);
const pageSize = 18;
let records = [];
let page = 1;
const clean = (value, fallback = 'Not recorded') => String(value ?? '').trim() || fallback;
const dateOnly = (value) => { const date = clean(value, ''); return date ? date.split(/[T ]/)[0] : 'Not recorded'; };
const escapeHTML = (value) => clean(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const fieldLabels = { labCode: 'Lab code', acquiredOn: 'Acquired', town: 'Town', neighborhood: 'Neighborhood', sampleForm: 'Sample form', suspected: 'Suspected substance', soldAs: 'Sold as', ftirSubstances: 'FTIR substances', ftsResult: 'Fentanyl test strip @ 1 mL', fts5Result: 'Fentanyl test strip @ 5 mL', fts30Result: 'Fentanyl test strip @ 30 mL', ftsNotes: 'Fentanyl test strip notes', xtsResult: 'Xylazine test strip @ 1 mL', xts5Result: 'Xylazine test strip @ 5 mL', xts30Result: 'Xylazine test strip @ 30 mL', xtsNotes: 'Xylazine test strip notes', btsResult: 'Benzodiazepine test strip @ 2 mL', bts5Result: 'Benzodiazepine test strip @ 5 mL', btsNotes: 'Benzodiazepine test strip notes', ntsResult: 'Nitazene test strip @ 1 mL', nts5Result: 'Nitazene test strip @ 5 mL', nts30Result: 'Nitazene test strip @ 30 mL', ntsNotes: 'Nitazene test strip notes', mtsResult: 'Medetomidine test strip @ 1 mL', mts5Result: 'Medetomidine test strip @ 5 mL', mts30Result: 'Medetomidine test strip @ 30 mL', mtsNotes: 'Medetomidine test strip notes', phLevel: 'pH level' };
const optionalStripFields = new Set(['fts5Result', 'fts30Result', 'ftsNotes', 'xts5Result', 'xts30Result', 'xtsNotes', 'bts5Result', 'btsNotes', 'nts5Result', 'nts30Result', 'ntsNotes', 'mts5Result', 'mts30Result', 'mtsNotes']);
const stripResultFields = new Set(['ftsResult', 'fts5Result', 'fts30Result', 'xtsResult', 'xts5Result', 'xts30Result', 'btsResult', 'bts5Result', 'ntsResult', 'nts5Result', 'nts30Result', 'mtsResult', 'mts5Result', 'mts30Result']);
Object.assign(fieldLabels, { labTestingResults: 'Lab testing results', ftirResult: 'FTIR result', ftirMixtureAnalysis: 'FTIR mixture analysis' });
const optionalResultFields = new Set(['labTestingResults', 'ftirResult', 'ftirSubstances', 'ftirMixtureAnalysis']);
const hiddenStripFields = new Set([...stripResultFields, ...optionalStripFields, 'ftsNotes', 'xtsNotes', 'btsNotes', 'ntsNotes', 'mtsNotes']);
const hiddenDetailFields = new Set(['ftirComponents', 'labTestingSubstances', 'labTestingRatios', 'labQuantitativeSummary', 'labQTOFSummary']);
const themeToggle = $('#themeToggle');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; const dark = theme === 'dark'; themeToggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark'; themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`); themeToggle.title = themeToggle.getAttribute('aria-label'); }
applyTheme(localStorage.getItem('streetcheck-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('streetcheck-theme', next); applyTheme(next); });
function filteredRecords() {
  const search = $('#searchInput').value.toLowerCase().trim();
  return records.filter((record) => { const searchable = Object.entries(record).filter(([key]) => key !== '_recordIndex').map(([, value]) => clean(value, '')).join(' ').toLowerCase(); return (!search || searchable.includes(search)); });
}
function renderDetailFields(record) {
  const entries = Object.entries(record).filter(([key]) => key !== '_recordIndex' && key !== 'neighborhood' && key !== 'soldAs' && key !== 'phLevel' && !hiddenStripFields.has(key) && !hiddenDetailFields.has(key) && (!optionalResultFields.has(key) || clean(record[key], '')));
  const labKeys = new Set(['labTestingResults']);
  const ftirKeys = new Set(['ftirResult', 'ftirSubstances', 'ftirMixtureAnalysis']);
  const card = ([key, value]) => { const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase()); const displayValue = key === 'acquiredOn' ? dateOnly(value) : [...optionalResultFields, 'suspected'].includes(key) ? String(value ?? '').replace(/\|/g, '  /  ') : value; return `<article class="detail-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(displayValue)}</strong></article>`; };
  const groups = [
    ['Sample details', entries.filter(([key]) => !ftirKeys.has(key) && !labKeys.has(key))],
    ['FTIR results', entries.filter(([key]) => ftirKeys.has(key))],
    ['Complementary lab results', entries.filter(([key]) => labKeys.has(key))]
  ];
  return groups.filter(([, fields]) => fields.length).map(([title, fields]) => `<section class="detail-section"><h3>${title}</h3><div class="detail-group">${fields.map(card).join('')}</div></section>`).join('');
}
function formatResult(value) { return String(value ?? '').trim().replace(/\|/g, '  /  ') || 'Not recorded'; }
function formatTown(value) { const town = String(value ?? '').trim().replace(/\s+/g, ' '); if (!town) return 'Not recorded'; if (/^grand rapids$/i.test(town)) return 'Grand Rapids'; if (/^muskegon$/i.test(town)) return 'Muskegon'; return town; }
function renderRecords() {
  const filtered = filteredRecords(); const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.min(page, totalPages); const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  $('#resultsCount').textContent = `${filtered.length.toLocaleString()} matching records`;
  $('#recordRows').innerHTML = visible.map((record) => { const area = formatTown(record.town); const index = record._recordIndex; const ftir = record.ftirResult || record.ftirSubstances; const lab = record.labTestingResults || record.labTestingSubstances; return `<tr><td class="code" data-label="Lab code">${escapeHTML(record.labCode)}</td><td data-label="Acquired">${escapeHTML(dateOnly(record.acquiredOn))}</td><td class="result-cell" data-label="FTIR results" title="${escapeHTML(ftir)}">${escapeHTML(formatResult(ftir))}</td><td class="result-cell" data-label="Lab results" title="${escapeHTML(lab)}">${escapeHTML(formatResult(lab))}</td><td class="town-cell" data-label="Town" title="${escapeHTML(area)}">${escapeHTML(area)}</td><td data-label="Details"><button class="detail-link" type="button" data-record-index="${index}" aria-expanded="false" aria-controls="sample-details-${index}">View sample ↓</button></td></tr><tr class="record-detail-row" id="sample-details-${index}" hidden><td class="record-detail-cell" colspan="6"><div class="sample-detail-grid">${renderDetailFields(record)}</div></td></tr>`; }).join('') || '<tr><td colspan="6">No records match those filters.</td></tr>';
  $('#pageLabel').textContent = `Page ${page} of ${totalPages}`; $('#previousPage').disabled = page === 1; $('#nextPage').disabled = page === totalPages;
}
async function init() {
  try { const response = await fetch('data/records.json?v=sample-results-stages-4'); if (!response.ok) throw new Error('Data unavailable'); records = (await response.json()).records.map((record, index) => ({ ...record, _recordIndex: index })).sort((a, b) => (Date.parse(b.acquiredOn) || 0) - (Date.parse(a.acquiredOn) || 0)); $('#refreshNote').textContent = `${records.length.toLocaleString()} published records · newest first`; renderRecords(); $('#recordRows').addEventListener('click', (event) => { const button = event.target.closest('[data-record-index]'); if (!button) return; const isOpen = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!isOpen)); button.textContent = isOpen ? 'View sample ↓' : 'Close details ↑'; const detailRow = document.getElementById(button.getAttribute('aria-controls')); detailRow.hidden = isOpen; }); ['#searchInput'].forEach((selector) => $(selector).addEventListener('input', () => { page = 1; renderRecords(); })); $('#previousPage').addEventListener('click', () => { page -= 1; renderRecords(); }); $('#nextPage').addEventListener('click', () => { page += 1; renderRecords(); }); } catch { document.querySelector('main').replaceWith($('#errorTemplate').content.cloneNode(true)); }
}
init();
