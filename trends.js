const $ = (selector) => document.querySelector(selector);
const colors = { xylazine: '#d8fa66', medetomidine: '#ff796a' };
const themeToggle = $('#themeToggle');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; const dark = theme === 'dark'; themeToggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark'; themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`); themeToggle.title = themeToggle.getAttribute('aria-label'); }
applyTheme(localStorage.getItem('streetcheck-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('streetcheck-theme', next); applyTheme(next); });
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
function monthKey(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { const [year, month] = key.split('-').map(Number); return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); }
function renderChart(id, rows, substance, color) {
  const svg = $(id); const width = 720; const height = 270; const left = 42; const right = 42; const top = 18; const bottom = 42; const plotWidth = width - left - right; const plotHeight = height - top - bottom; const maxCount = Math.max(1, ...rows.map((row) => row[substance]));
  const points = rows.map((row, index) => ({ ...row, x: left + (rows.length <= 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1)), share: row.total ? row[substance] / row.total : 0 }));
  const barWidth = Math.max(2, Math.min(18, plotWidth / Math.max(rows.length, 1) * .62));
  const bars = points.map((point) => { const barHeight = point[substance] / maxCount * plotHeight; return `<rect x="${(point.x - barWidth / 2).toFixed(1)}" y="${(top + plotHeight - barHeight).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="2" fill="${color}" opacity=".78"><title>${escapeHTML(monthLabel(point.key))}: ${point[substance]} detections / ${point.total} samples, ${(point.share * 100).toFixed(1)}%</title></rect>`; }).join('');
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${(top + plotHeight - point.share * plotHeight).toFixed(1)}`).join(' ');
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 5) === 0).map((point) => `<text x="${point.x.toFixed(1)}" y="${height - 12}" text-anchor="middle">${escapeHTML(monthLabel(point.key))}</text>`).join('');
  const grid = [0, .5, 1].map((fraction) => { const y = top + plotHeight - fraction * plotHeight; return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" class="chart-grid"/><text x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(maxCount * fraction)}</text><text x="${width - right + 8}" y="${y + 4}">${Math.round(fraction * 100)}%</text>`; }).join('');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.innerHTML = `${grid}${bars}<path d="${line}" class="trend-line"/><text x="${left}" y="12" class="axis-title">detections (bars) · share of monthly samples (line)</text>${labels}`;
}
function renderExpectedComparison(records, substance, containerId) {
  const opioidPattern = /\b(fentanyl|heroin|hydrocodone|hydromorphone|oxycodone|oxymorphone|morphine|codeine|methadone|levomethadyl|buprenorphine|suboxone|nitazene|opioid|opiate|percocet|perc30|oc30|m30|vicodin|norco|tramadol|meperidine|tapentadol|oxy)\b/i;
  const groups = { opioid: { label: 'Suspected opioid', total: 0, detections: 0 }, other: { label: 'No opioid listed', total: 0, detections: 0 } };
  records.forEach((record) => {
    const group = opioidPattern.test(String(record.suspected || '')) ? groups.opioid : groups.other;
    group.total += 1; if (new RegExp(substance, 'i').test(record.ftirSubstances || '')) group.detections += 1;
  });
  $(containerId).innerHTML = Object.values(groups).map((group) => {
    const rate = group.total ? group.detections / group.total * 100 : 0; const percent = rate.toFixed(1);
    return `<div class="expected-row"><div class="expected-row-head"><span>${group.label}</span><strong>${percent}%</strong></div><div class="expected-track" role="progressbar" aria-label="${escapeHTML(substance)} detections among ${escapeHTML(group.label.toLowerCase())} samples" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${rate.toFixed(2)}%"></span></div><p>${group.detections.toLocaleString()} of ${group.total.toLocaleString()} samples</p></div>`;
  }).join('');
}
function render(records) {
  const dated = records.map((record) => ({ ...record, month: monthKey(record.acquiredOn) })).filter((record) => record.month).sort((a, b) => a.month.localeCompare(b.month));
  const months = new Map();
  dated.forEach((record) => { if (!months.has(record.month)) months.set(record.month, { key: record.month, total: 0, xylazine: 0, medetomidine: 0 }); const item = months.get(record.month); item.total += 1; if (/xylazine/i.test(record.ftirSubstances || '')) item.xylazine += 1; if (/medetomidine/i.test(record.ftirSubstances || '')) item.medetomidine += 1; });
  const rows = [...months.values()]; const xylazine = records.filter((record) => /xylazine/i.test(record.ftirSubstances || '')).length; const medetomidine = records.filter((record) => /medetomidine/i.test(record.ftirSubstances || '')).length; const both = records.filter((record) => /xylazine/i.test(record.ftirSubstances || '') && /medetomidine/i.test(record.ftirSubstances || '')).length;
  $('#metrics').innerHTML = [[records.length.toLocaleString(), 'Samples in dataset'], [xylazine.toLocaleString(), 'FTIR results mentioning xylazine'], [medetomidine.toLocaleString(), 'FTIR results mentioning medetomidine'], [`${rows.length ? monthLabel(rows[0].key) : '—'} – ${rows.length ? monthLabel(rows.at(-1).key) : '—'}`, 'Date range']].map(([value, label], index) => `<article class="metric ${index === 2 ? 'highlight' : ''}"><span class="value">${escapeHTML(value)}</span><span class="label">${label}</span></article>`).join('');
  $('#refreshNote').textContent = `${records.length.toLocaleString()} published records loaded`; $('#dateCoverage').textContent = rows.length ? `${monthLabel(rows[0].key)} to ${monthLabel(rows.at(-1).key)}` : 'No dated records'; $('#xylazineTotal').textContent = `${xylazine.toLocaleString()} mentions`; $('#medetomidineTotal').textContent = `${medetomidine.toLocaleString()} mentions`;
  $('#overlapCopy').textContent = `${both.toLocaleString()} ${both === 1 ? 'sample mentions' : 'samples mention'} both xylazine and medetomidine in their FTIR substance result.`;
  renderChart('#xylazineChart', rows, 'xylazine', colors.xylazine); renderChart('#medetomidineChart', rows, 'medetomidine', colors.medetomidine);
  renderExpectedComparison(records, 'xylazine', '#xylazineExpected'); renderExpectedComparison(records, 'medetomidine', '#medetomidineExpected');
}
async function init() { try { const response = await fetch('data/records.json'); if (!response.ok) throw new Error('Data unavailable'); render((await response.json()).records || []); } catch { document.querySelector('main').replaceWith($('#errorTemplate').content.cloneNode(true)); } }
init();
