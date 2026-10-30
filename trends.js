const $ = (selector) => document.querySelector(selector);
const colors = { xylazine: '#d8fa66', medetomidine: '#ff796a' };
let allRecords = [];
let selectedTown = 'grand rapids';
const themeToggle = $('#themeToggle');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; const dark = theme === 'dark'; themeToggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark'; themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`); themeToggle.title = themeToggle.getAttribute('aria-label'); }
applyTheme(localStorage.getItem('streetcheck-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('streetcheck-theme', next); applyTheme(next); });
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
function monthKey(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { const [year, month] = key.split('-').map(Number); return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); }
function dateInputValue(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function dateFromInput(value, endOfDay = false) { if (!value) return null; const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0); }
function defaultDateRange(months = 6) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const firstOfTargetMonth = new Date(today.getFullYear(), today.getMonth() - months, 1); const lastDay = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, 0).getDate();
  const start = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(today.getDate(), lastDay));
  $('#dateStart').value = dateInputValue(start); $('#dateEnd').value = dateInputValue(today);
}
function applyDateRange() {
  const startValue = $('#dateStart').value; const endValue = $('#dateEnd').value; const start = dateFromInput(startValue); const end = dateFromInput(endValue, true); const error = $('#dateRangeError');
  if (start && end && start > end) { error.textContent = 'The start date must be before the end date.'; error.hidden = false; return; }
  error.hidden = true;
  const selected = allRecords.filter((record) => {
    const town = String(record.town || '').trim().toLowerCase();
    const matchesTown = selectedTown === 'both' ? town === 'muskegon' || town === 'grand rapids' : town === selectedTown;
    if (!matchesTown) return false;
    if (!start && !end) return true;
    const acquired = new Date(record.acquiredOn); if (Number.isNaN(acquired.getTime())) return false;
    return (!start || acquired >= start) && (!end || acquired <= end);
  });
  render(selected);
  const from = start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'earliest record';
  const through = end ? end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'latest record';
  const townLabel = selectedTown === 'both' ? 'Muskegon + Grand Rapids' : selectedTown === 'muskegon' ? 'Muskegon' : 'Grand Rapids';
  $('#dateRangeStatus').textContent = `Showing ${selected.length.toLocaleString()} samples · ${townLabel} · ${from} to ${through}`;
}
function renderCombinedChart(rows) {
  const svg = $('#combinedTrendChart'); const width = 900; const height = 320; const left = 54; const right = 24; const top = 28; const bottom = 48; const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const points = rows.map((row, index) => ({ ...row, x: left + (rows.length <= 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1)), xylazineShare: row.total ? row.xylazine / row.total : 0, medetomidineShare: row.total ? row.medetomidine / row.total : 0 }));
  const highestShare = Math.max(0, ...points.flatMap((point) => [point.xylazineShare, point.medetomidineShare])); const maxShare = highestShare === 0 ? .05 : Math.min(1, Math.ceil(highestShare * 20) / 20);
  const y = (share) => top + plotHeight - share / maxShare * plotHeight;
  const series = [['xylazine', 'xylazineShare', colors.xylazine], ['medetomidine', 'medetomidineShare', colors.medetomidine]];
  const lines = series.map(([name, field, color]) => {
    const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${y(point[field]).toFixed(1)}`).join(' ');
    const markers = points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${y(point[field]).toFixed(1)}" r="4" fill="${color}" stroke="var(--surface)" stroke-width="2"><title>${escapeHTML(monthLabel(point.key))}: ${(point[field] * 100).toFixed(1)}% (${point[name]} of ${point.total} samples)</title></circle>`).join('');
    return `<path d="${line}" class="trend-line" stroke="${color}"/>${markers}`;
  }).join('');
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0).map((point) => `<text x="${point.x.toFixed(1)}" y="${height - 14}" text-anchor="middle">${escapeHTML(monthLabel(point.key))}</text>`).join('');
  const grid = [0, .5, 1].map((fraction) => { const gridY = top + plotHeight - fraction * plotHeight; return `<line x1="${left}" y1="${gridY}" x2="${width - right}" y2="${gridY}" class="chart-grid"/><text x="${left - 10}" y="${gridY + 4}" text-anchor="end">${(maxShare * fraction * 100).toFixed(0)}%</text>`; }).join('');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.innerHTML = `${grid}<text x="${left}" y="14" class="axis-title">percent of samples acquired that month</text>${lines}${labels}`;
}
function renderExpectedComparison(records, substance, containerId) {
  const opioidPattern = /\b(fentanyl|heroin|hydrocodone|hydromorphone|oxycodone|oxymorphone|morphine|codeine|methadone|levomethadyl|buprenorphine|suboxone|nitazene|opioid|opiate|percocet|perc30|oc30|m30|vicodin|norco|tramadol|meperidine|tapentadol|oxy)\b/i;
  const group = { label: 'Suspected opioid', total: 0, detections: 0 };
  records.forEach((record) => {
    if (!opioidPattern.test(String(record.suspected || ''))) return;
    group.total += 1; if (new RegExp(substance, 'i').test(record.ftirSubstances || '')) group.detections += 1;
  });
  const rate = group.total ? group.detections / group.total * 100 : 0; const percent = rate.toFixed(1);
  $(containerId).innerHTML = `<div class="expected-row"><div class="expected-row-head"><span>${group.label}</span><strong>${percent}%</strong></div><div class="expected-track" role="progressbar" aria-label="${escapeHTML(substance)} detections among suspected opioid samples" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${rate.toFixed(2)}%"></span></div><p>${group.detections.toLocaleString()} of ${group.total.toLocaleString()} samples</p></div>`;
}
function render(records) {
  const dated = records.map((record) => ({ ...record, month: monthKey(record.acquiredOn) })).filter((record) => record.month).sort((a, b) => a.month.localeCompare(b.month));
  const months = new Map();
  dated.forEach((record) => { if (!months.has(record.month)) months.set(record.month, { key: record.month, total: 0, xylazine: 0, medetomidine: 0 }); const item = months.get(record.month); item.total += 1; if (/xylazine/i.test(record.ftirSubstances || '')) item.xylazine += 1; if (/medetomidine/i.test(record.ftirSubstances || '')) item.medetomidine += 1; });
  const rows = [...months.values()]; const both = records.filter((record) => /xylazine/i.test(record.ftirSubstances || '') && /medetomidine/i.test(record.ftirSubstances || '')).length;
  $('#dateCoverage').textContent = rows.length ? `${monthLabel(rows[0].key)} to ${monthLabel(rows.at(-1).key)}` : 'No dated records';
  $('#overlapCopy').textContent = `${both.toLocaleString()} ${both === 1 ? 'sample mentions' : 'samples mention'} both xylazine and medetomidine in their FTIR substance result.`;
  renderCombinedChart(rows);
  renderExpectedComparison(records, 'xylazine', '#xylazineExpected'); renderExpectedComparison(records, 'medetomidine', '#medetomidineExpected');
}
async function init() {
  try {
    const response = await fetch('data/records.json'); if (!response.ok) throw new Error('Data unavailable'); allRecords = (await response.json()).records || [];
    $('#applyDateRange').addEventListener('click', () => { $('#rangeSixMonths').setAttribute('aria-pressed', 'false'); $('#rangeThreeMonths').setAttribute('aria-pressed', 'false'); applyDateRange(); });
    $('#rangeSixMonths').addEventListener('click', () => { defaultDateRange(6); $('#rangeSixMonths').setAttribute('aria-pressed', 'true'); $('#rangeThreeMonths').setAttribute('aria-pressed', 'false'); applyDateRange(); });
    $('#rangeThreeMonths').addEventListener('click', () => { defaultDateRange(3); $('#rangeSixMonths').setAttribute('aria-pressed', 'false'); $('#rangeThreeMonths').setAttribute('aria-pressed', 'true'); applyDateRange(); });
    document.querySelectorAll('[data-town]').forEach((button) => button.addEventListener('click', () => {
      selectedTown = button.dataset.town;
      document.querySelectorAll('[data-town]').forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
      applyDateRange();
    }));
    defaultDateRange(6); $('#rangeSixMonths').setAttribute('aria-pressed', 'true'); $('#rangeThreeMonths').setAttribute('aria-pressed', 'false'); applyDateRange();
  } catch { document.querySelector('main').replaceWith($('#errorTemplate').content.cloneNode(true)); }
}
init();
