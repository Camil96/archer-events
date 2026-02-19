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

export function showToast(message, type = "success") {
  if (!message) return;

  if (typeof document === "undefined") {
    const logger = type === "error" ? console.error : console.log;
    logger(message);
    return;
  }

  const containerId = "app-toast-container";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.right = "16px";
    container.style.bottom = "16px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.zIndex = "9999";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const bg = type === "error" ? "#dc2626" : type === "warning" ? "#d97706" : "#16a34a";
  toast.textContent = String(message);
  toast.style.background = bg;
  toast.style.color = "#fff";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 6px 18px rgba(0,0,0,.18)";
  toast.style.fontSize = "14px";
  toast.style.maxWidth = "360px";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(8px)";
  toast.style.transition = "opacity .2s ease, transform .2s ease";

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => {
      toast.remove();
      if (!container.children.length) container.remove();
    }, 200);
  }, 2800);
}
