const $ = (selector) => document.querySelector(selector);
const pageSize = 18;
let records = [];
let page = 1;
const clean = (value, fallback = 'Not recorded') => String(value ?? '').trim() || fallback;
const escapeHTML = (value) => clean(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
const countBy = (items, getValue) => items.reduce((map, item) => { const value = clean(getValue(item)); map.set(value, (map.get(value) || 0) + 1); return map; }, new Map());
const ordered = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const themeToggle = $('#themeToggle');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; const dark = theme === 'dark'; themeToggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark'; themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`); themeToggle.title = themeToggle.getAttribute('aria-label'); }
applyTheme(localStorage.getItem('streetcheck-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('streetcheck-theme', next); applyTheme(next); });
function populateFilters() {
  const addOptions = (selector, values, label) => { const element = $(selector); element.innerHTML = `<option value="">All ${label}</option>${values.map(([value]) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join('')}`; };
  addOptions('#ftsFilter', ordered(countBy(records, (record) => record.ftsResult)), 'results'); addOptions('#formFilter', ordered(countBy(records, (record) => record.sampleForm)), 'forms');
}
function filteredRecords() {
  const search = $('#searchInput').value.toLowerCase().trim(); const fts = $('#ftsFilter').value; const form = $('#formFilter').value;
  return records.filter((record) => { const searchable = [record.labCode, record.acquiredOn, record.town, record.neighborhood, record.sampleForm, record.suspected, record.soldAs, record.ftirSubstances, record.ftsResult].map((value) => clean(value, '')).join(' ').toLowerCase(); return (!search || searchable.includes(search)) && (!fts || clean(record.ftsResult) === fts) && (!form || clean(record.sampleForm) === form); });
}
function renderRecords() {
  const filtered = filteredRecords(); const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.min(page, totalPages); const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  $('#resultsCount').textContent = `${filtered.length.toLocaleString()} matching records`;
  $('#recordRows').innerHTML = visible.map((record) => { const fts = clean(record.ftsResult); const area = [clean(record.town, ''), clean(record.neighborhood, '')].filter(Boolean).join(' · ') || 'Not recorded'; const identity = [clean(record.suspected, ''), clean(record.soldAs, '')].filter(Boolean).join(' / ') || 'Not recorded'; const href = `sample.html?code=${encodeURIComponent(record.labCode ?? '')}`; return `<tr><td class="code"><a class="record-link" href="${href}">${escapeHTML(record.labCode)}</a></td><td>${escapeHTML(record.acquiredOn)}</td><td>${escapeHTML(record.sampleForm)}</td><td>${escapeHTML(identity)}</td><td title="${escapeHTML(record.ftirSubstances)}">${escapeHTML(record.ftirSubstances)}</td><td><span class="pill ${fts === 'Positive' ? 'positive' : ''}">${escapeHTML(fts)}</span></td><td>${escapeHTML(area)}</td><td><a class="detail-link" href="${href}">View sample →</a></td></tr>`; }).join('') || '<tr><td colspan="8">No records match those filters.</td></tr>';
  $('#pageLabel').textContent = `Page ${page} of ${totalPages}`; $('#previousPage').disabled = page === 1; $('#nextPage').disabled = page === totalPages;
}
async function init() {
  try { const response = await fetch('data/records.json'); if (!response.ok) throw new Error('Data unavailable'); records = (await response.json()).records.sort((a, b) => (Date.parse(b.acquiredOn) || 0) - (Date.parse(a.acquiredOn) || 0)); $('#refreshNote').textContent = `${records.length.toLocaleString()} published records · newest first`; populateFilters(); renderRecords(); ['#searchInput', '#ftsFilter', '#formFilter'].forEach((selector) => $(selector).addEventListener('input', () => { page = 1; renderRecords(); })); $('#previousPage').addEventListener('click', () => { page -= 1; renderRecords(); }); $('#nextPage').addEventListener('click', () => { page += 1; renderRecords(); }); } catch { document.querySelector('main').replaceWith($('#errorTemplate').content.cloneNode(true)); }
}
init();
