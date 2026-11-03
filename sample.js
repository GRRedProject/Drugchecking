const $ = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
function showRecord(record, records) {
  const labels = { labCode: 'Lab code', acquiredOn: 'Acquired', town: 'Town', neighborhood: 'Neighborhood', sampleForm: 'Sample form', suspected: 'Suspected substance', soldAs: 'Sold as', ftirSubstances: 'FTIR substances', ftsResult: 'Fentanyl test strip', xtsResult: 'Xylazine test strip', btsResult: 'Benzodiazepine test strip', ntsResult: 'Nitazene test strip', mtsResult: 'Medetomidine test strip', phLevel: 'pH level' };
  const fields = Object.entries(record).map(([key, value]) => [labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase()), value]);
  $('#sampleTitle').textContent = `Lab code ${record.labCode || 'not recorded'}`; $('#sampleSubtitle').textContent = 'Test results and other details for this sample.'; $('#sampleFileName').textContent = 'Sample details'; const index = records.indexOf(record); $('#sampleNumber').textContent = `Sample ${index + 1} of ${records.length}`;
  $('#detailGrid').innerHTML = fields.map(([label, value]) => `<article class="detail-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || 'Not recorded')}</strong></article>`).join(''); $('#detailPanel').hidden = false;
}
async function renderSample() {
  try {
    const params = new URLSearchParams(window.location.search); const recordIndex = Number.parseInt(params.get('record'), 10); const code = params.get('code');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    let payload;
    try { const response = await fetch('data/records.json', { cache: 'no-store', signal: controller.signal }); if (!response.ok) throw new Error('Data unavailable'); payload = await response.json(); }
    finally { clearTimeout(timeout); }
    const records = payload.records || [];
    const record = Number.isInteger(recordIndex) && recordIndex >= 0 ? records[recordIndex] : records.find((item) => code && String(item.labCode ?? '') === code);
    if (!record) throw new Error('Sample not found'); showRecord(record, records);
  } catch (error) {
    $('#sampleSubtitle').textContent = error.name === 'AbortError' ? 'This is taking too long. Refresh the page to try again.' : 'We couldn’t load this sample. Return to the sample list and try again.';
    $('#missingSample').hidden = false;
  }
}
renderSample();
