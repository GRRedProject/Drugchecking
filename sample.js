const $ = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
function showRecord(record, records) {
  const labels = { labCode: 'Lab code', acquiredOn: 'Acquired', town: 'Town', neighborhood: 'Neighborhood', sampleForm: 'Sample form', suspected: 'Suspected substance', soldAs: 'Sold as', ftirSubstances: 'FTIR substances', ftsResult: 'Fentanyl test strip', xtsResult: 'Xylazine test strip', btsResult: 'Benzodiazepine test strip', ntsResult: 'Nitazene test strip', mtsResult: 'Medetomidine test strip', phLevel: 'pH level' };
  const fields = Object.entries(record).map(([key, value]) => [labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase()), value]);
  $('#sampleTitle').textContent = `Lab code ${record.labCode || 'not recorded'}`; $('#sampleSubtitle').textContent = 'Published analytical fields for this sample.'; $('#sampleFileName').textContent = 'StreetCheck published snapshot'; const index = records.indexOf(record); $('#sampleNumber').textContent = `Record ${index + 1} of ${records.length}`;
  $('#detailGrid').innerHTML = fields.map(([label, value]) => `<article class="detail-item"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value || 'Not recorded')}</strong></article>`).join(''); $('#detailPanel').hidden = false;
}
async function renderSample() {
  try {
    const params = new URLSearchParams(window.location.search); const recordIndex = Number.parseInt(params.get('record'), 10); const code = params.get('code');
    const response = await fetch('data/records.json'); if (!response.ok) throw new Error('Data unavailable'); const records = (await response.json()).records || [];
    const record = Number.isInteger(recordIndex) && recordIndex >= 0 ? records[recordIndex] : records.find((item) => code && String(item.labCode ?? '') === code);
    if (!record) throw new Error('Sample not found'); showRecord(record, records);
  } catch { $('#missingSample').hidden = false; }
}
renderSample();
