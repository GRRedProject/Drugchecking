const $ = (selector) => document.querySelector(selector);
const seriesColors = ['#2068a8', '#dc5147', '#448353', '#8657a6', '#d18b25', '#168c8c', '#b24f83', '#66727f', '#8b6d36', '#417ca3'];
const opioidPattern = /\b(fentanyl|heroin|hydrocodone|hydromorphone|oxycodone|oxymorphone|morphine|codeine|methadone|levomethadyl|buprenorphine|suboxone|nitazene|opioid|opiate|percocet|perc30|oc30|m30|vicodin|norco|tramadol|meperidine|tapentadol|oxy)\b/i;
let allRecords = [];
let selectedTown = 'grand rapids';
let contaminantNames = [];
let selectedContaminants = new Set();
const themeToggle = $('#themeToggle');
function applyTheme(theme) { document.documentElement.dataset.theme = theme; const dark = theme === 'dark'; themeToggle.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark'; themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`); themeToggle.title = themeToggle.getAttribute('aria-label'); }
applyTheme(localStorage.getItem('streetcheck-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('streetcheck-theme', next); applyTheme(next); });
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
function parseSampleDate(value) {
  const raw = String(value || '').trim();
  const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?$/i);
  if (usDate) {
    const [, month, day, year, hour = '0', minute = '0', second = '0', meridiem = ''] = usDate;
    let hours = Number(hour);
    if (meridiem) hours = hours % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
    const date = new Date(Number(year), Number(month) - 1, Number(day), hours, Number(minute), Number(second));
    if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
    return date;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
function monthKey(value) { const date = parseSampleDate(value); return !date ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { const [year, month] = key.split('-').map(Number); return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); }
function splitNames(value) { return String(value || '').split('|').map((name) => name.trim()).filter(Boolean); }
const labAliases = new Map([
  ['3,4-mdma', 'MDMA'], ['acetyl fentanyl', 'Acetylfentanyl'], ['aspirin', 'Acetylsalicylic Acid (Aspirin)'],
  ['acetylsalicylic acid', 'Acetylsalicylic Acid (Aspirin)'], ['benadryl', 'Diphenhydramine'],
  ['dimethyl sulfone (methylsulfonemethane, msm)', 'Dimethyl Sulfone (MSM)'],
  ['dimethyl sulfone (methylsulfonylmethane msm)', 'Dimethyl Sulfone (MSM)'],
  ['methylsulfonylmethane (msm or dimethyl sulfone)', 'Dimethyl Sulfone (MSM)'],
  ['methyl ecgonidine (med)', 'Methylecgonidine'], ['niacinamide', 'Nicotinamide'],
  ['n,n-dimethyltryptamine (dmt)', 'DMT'], ['6-monoacetylmorphine', '6-Monoacetylmorphine (6-MAM)'],
  ['6-mono acetyl morphine', '6-Monoacetylmorphine (6-MAM)'], ['3-monoacetylmorphine (3-mam)', '3-Monoacetylmorphine (3-MAM)'],
  ['n-pyrrolidino protonitazene', 'N-Pyrrolidino-Protonitazene'], ['p-fluorofentanyl', 'Para-fluorofentanyl'],
  ['para-fluorofentanyl', 'Para-fluorofentanyl'], ['despropionyl-para-fluorofentanyl', 'Despropionyl P-Fluorofentanyl'],
  ['1-(2-chlorophenyl)(methylimino)methylcyclopentanol.', '1-(2-chlorophenyl)(methylimino)methylcyclopentanol'],
  ['1-phenethyl-4-propionyloxypiperidine.', '1-Phenethyl-4-Propionyloxypiperidine'],
  ['n-phenethyl-n-phenylprionamide', 'N-Phenethyl-N-Phenylpropionamide'],
  ['n-phenethyl-n-phenylpropionamide', 'N-Phenethyl-N-Phenylpropionamide'],
  ['bs(2,2,6,6-tetramethyl-4-piperidyl) sebacate', 'Bis(2,2,6,6-Tetramethyl-4-Piperidyl) Sebacate'],
  ['hydrocodone', 'Hydrocodone'], ['diphenhydramine (benadryl)', 'Diphenhydramine'],
  ['paracetamol (acetaminophen)', 'Acetaminophen'], ['ibuprofen (advil, motrin)', 'Ibuprofen']
]);
const nonDrugLabOptions = new Set(['no compounds of interest detected', 'pending identification', 'pending nitazene', 'sample damaged in transit']);
const labKey = (name) => name.toLocaleLowerCase().replace(/[.]+$/g, '').replace(/\s+/g, ' ').trim();
function canonicalLabName(name) {
  const cleaned = name.replace(/\s+\((?:primary|trace|major)\)$/i, '').trim();
  const key = labKey(cleaned);
  return nonDrugLabOptions.has(key) ? '' : (labAliases.get(key) || cleaned.replace(/[.]+$/g, '').trim());
}
function labSubstances(record) { return splitNames(record.labTestingSubstances || record.labTestingResults).map(canonicalLabName).filter(Boolean); }
function uniqueNames(records, field) {
  const names = new Map();
  records.forEach((record) => splitNames(record[field]).forEach((name) => { const key = name.toLocaleLowerCase(); if (!names.has(key)) names.set(key, name); }));
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
function uniqueLabNames(records) {
  const names = new Map();
  records.forEach((record) => labSubstances(record).forEach((name) => { const key = labKey(name); if (!names.has(key)) names.set(key, name); }));
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
function populateTrendFilters(records) {
  const suspectedSelect = $('#suspectedDrugFilter');
  const labResultKeys = new Set(records.flatMap((record) => labSubstances(record).map(labKey)));
  uniqueNames(records, 'suspected').filter((name) => labResultKeys.has(labKey(canonicalLabName(name)))).forEach((name) => { const option = document.createElement('option'); option.value = labKey(canonicalLabName(name)); option.textContent = name; suspectedSelect.append(option); });
  contaminantNames = uniqueLabNames(records);
  selectedContaminants = new Set(contaminantNames.filter((name) => ['xylazine', 'medetomidine'].includes(name.toLocaleLowerCase())).map((name) => name.toLocaleLowerCase()));
  renderContaminantOptions();
  $('#contaminantSearch').addEventListener('input', renderContaminantOptions);
  $('#clearContaminants').addEventListener('click', () => { selectedContaminants.clear(); renderContaminantOptions(); applyDateRange(); });
  suspectedSelect.addEventListener('change', applyDateRange);
}
function renderContaminantOptions() {
  const options = $('#contaminantOptions'); const query = $('#contaminantSearch').value.trim().toLocaleLowerCase(); options.replaceChildren();
  const visibleNames = contaminantNames.filter((name) => name.toLocaleLowerCase().includes(query));
  visibleNames.forEach((name) => {
    const label = document.createElement('label'); label.className = 'contaminant-option';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = name.toLocaleLowerCase(); checkbox.checked = selectedContaminants.has(checkbox.value);
    checkbox.addEventListener('change', () => { if (checkbox.checked) selectedContaminants.add(checkbox.value); else selectedContaminants.delete(checkbox.value); updateContaminantCount(); applyDateRange(); });
    const text = document.createElement('span'); text.textContent = name; label.append(checkbox, text); options.append(label);
  });
  if (!visibleNames.length) { const empty = document.createElement('p'); empty.className = 'contaminant-empty'; empty.textContent = 'No matching lab results.'; options.append(empty); }
  updateContaminantCount();
}
function updateContaminantCount() { const count = selectedContaminants.size; $('#contaminantSelectionCount').textContent = count ? `${count} selected` : 'Select lab results'; }
function selectedSuspectedLabel() { return $('#suspectedDrugFilter').selectedOptions[0]?.textContent || 'selected suspected drugs'; }
function filterSuspectedRecords(records) {
  const value = $('#suspectedDrugFilter').value;
  if (value === '__opioids__') return records.filter((record) => opioidPattern.test(String(record.suspected || '')));
  if (value === '__all__') return records.filter((record) => splitNames(record.suspected).length);
  return records.filter((record) => splitNames(record.suspected).some((name) => labKey(canonicalLabName(name)) === value));
}
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
    const acquired = parseSampleDate(record.acquiredOn); if (!acquired) return false;
    return (!start || acquired >= start) && (!end || acquired <= end);
  });
  render(selected);
  const from = start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'earliest record';
  const through = end ? end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'latest record';
  const townLabel = selectedTown === 'both' ? 'Muskegon + Grand Rapids' : selectedTown === 'muskegon' ? 'Muskegon' : 'Grand Rapids';
  $('#dateRangeStatus').textContent = `Showing ${selected.length.toLocaleString()} samples · ${townLabel} · ${from} to ${through}`;
}
function renderCombinedChart(rows, contaminants) {
  const svg = $('#combinedTrendChart'); const width = 900; const height = 320; const left = 54; const right = 24; const top = 28; const bottom = 48; const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const series = contaminants.map((name, index) => ({ name, key: name.toLocaleLowerCase(), color: seriesColors[index % seriesColors.length] }));
  const legend = $('#trendLegend'); legend.replaceChildren();
  series.forEach((item) => { const entry = document.createElement('span'); const swatch = document.createElement('i'); swatch.className = 'trend-legend-swatch'; swatch.style.backgroundColor = item.color; entry.append(swatch, document.createTextNode(item.name)); legend.append(entry); });
  const points = rows.map((row, index) => ({ ...row, x: left + (rows.length <= 1 ? plotWidth / 2 : index * plotWidth / (rows.length - 1)), shares: series.map((item) => row.total ? (row.detections[item.key] || 0) / row.total : 0) }));
  const highestShare = Math.max(0, ...points.flatMap((point) => point.shares)); const maxShare = highestShare === 0 ? .05 : Math.min(1, Math.ceil(highestShare * 20) / 20);
  const y = (share) => top + plotHeight - share / maxShare * plotHeight;
  const lines = series.map((item, seriesIndex) => {
    const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${y(point.shares[seriesIndex]).toFixed(1)}`).join(' ');
    const markers = points.map((point) => { const hits = point.detections[item.key] || 0; return `<circle cx="${point.x.toFixed(1)}" cy="${y(point.shares[seriesIndex]).toFixed(1)}" r="4" fill="${item.color}" stroke="var(--surface)" stroke-width="2"><title>${escapeHTML(monthLabel(point.key))}: ${(point.shares[seriesIndex] * 100).toFixed(1)}% (${hits} of ${point.total} samples)</title></circle>`; }).join('');
    return line ? `<path d="${line}" class="trend-line" stroke="${item.color}"/>${markers}` : '';
  }).join('');
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0).map((point) => `<text x="${point.x.toFixed(1)}" y="${height - 14}" text-anchor="middle">${escapeHTML(monthLabel(point.key))}</text>`).join('');
  const grid = [0, .5, 1].map((fraction) => { const gridY = top + plotHeight - fraction * plotHeight; return `<line x1="${left}" y1="${gridY}" x2="${width - right}" y2="${gridY}" class="chart-grid"/><text x="${left - 10}" y="${gridY + 4}" text-anchor="end">${(maxShare * fraction * 100).toFixed(0)}%</text>`; }).join('');
  const message = !series.length ? 'Select at least one lab result to display the chart.' : !rows.length ? 'No dated samples match these filters.' : '';
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('aria-label', `Monthly percentage of ${selectedSuspectedLabel()} samples with selected lab results`); svg.innerHTML = `${grid}<text x="${left}" y="14" class="axis-title">Percent of selected samples collected that month</text>${lines}${message ? `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" class="chart-empty-message">${message}</text>` : labels}`;
}
function renderExpectedComparison(records, substance, containerId) {
  const group = { label: 'Suspected opioid', total: 0, detections: 0 };
  records.forEach((record) => {
    if (!opioidPattern.test(String(record.suspected || ''))) return;
    group.total += 1; if (new RegExp(substance, 'i').test(record.ftirSubstances || '')) group.detections += 1;
  });
  const rate = group.total ? group.detections / group.total * 100 : 0; const percent = rate.toFixed(1);
  $(containerId).innerHTML = `<div class="expected-row"><div class="expected-row-head"><span>${group.label}</span><strong>${percent}%</strong></div><div class="expected-track" role="progressbar" aria-label="${escapeHTML(substance)} detections among suspected opioid samples" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${rate.toFixed(2)}%"></span></div><p>${group.detections.toLocaleString()} of ${group.total.toLocaleString()} samples</p></div>`;
}
function renderLabSubstanceAverage(records) {
  const counts = records.flatMap((record) => {
    if (!/\b(?:heroin|fentanyl)\b/i.test(String(record.suspected || ''))) return [];
    const raw = String(record.labTestingSubstances || record.labTestingResults || '').trim();
    if (!raw) return [];
    const substances = new Set(raw.split('|').map((name) => name.trim().replace(/\s+\((?:primary|trace|major)\)$/i, '').toLowerCase()).filter(Boolean));
    return substances.size ? [substances.size] : [];
  });
  $('#labSubstanceAverage').textContent = counts.length ? (counts.reduce((sum, count) => sum + count, 0) / counts.length).toFixed(1) : '—';
  $('#labSubstanceSampleCount').textContent = `${counts.length.toLocaleString()} samples with complementary lab results`;
}
function render(records) {
  const contaminants = contaminantNames.filter((name) => selectedContaminants.has(name.toLocaleLowerCase()));
  const chartRecords = filterSuspectedRecords(records);
  const dated = chartRecords.map((record) => ({ ...record, month: monthKey(record.acquiredOn) })).filter((record) => record.month).sort((a, b) => a.month.localeCompare(b.month));
  const months = new Map();
  dated.forEach((record) => {
    if (!months.has(record.month)) months.set(record.month, { key: record.month, total: 0, detections: Object.create(null) });
    const item = months.get(record.month); item.total += 1;
    const detected = new Set(labSubstances(record).map((name) => name.toLocaleLowerCase()));
    contaminants.forEach((name) => { const key = name.toLocaleLowerCase(); if (detected.has(key)) item.detections[key] = (item.detections[key] || 0) + 1; });
  });
  const rows = [...months.values()];
  $('#dateCoverage').textContent = rows.length ? `${monthLabel(rows[0].key)} to ${monthLabel(rows.at(-1).key)}` : 'No dated records';
  renderCombinedChart(rows, contaminants);
  renderExpectedComparison(records, 'xylazine', '#xylazineExpected'); renderExpectedComparison(records, 'medetomidine', '#medetomidineExpected');
  renderLabSubstanceAverage(records);
}
async function init() {
  try {
    const response = await fetch('data/records.json'); if (!response.ok) throw new Error('Data unavailable'); allRecords = (await response.json()).records || [];
    populateTrendFilters(allRecords);
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
