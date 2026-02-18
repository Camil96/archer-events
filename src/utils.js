export function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatDate(dt) {
  if (!dt) return '-';
  return new Date(dt).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(dt) {
  if (!dt) return '-';
  return new Date(dt).toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function downloadCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
  a.click();
}
