import { getBrandColor, getBrandLabel } from "./config.js";

export function renderTimeline(container, events, onEventClick) {
    container.innerHTML = '<h3>Tijdlijn Weergave</h3><div id="timeline-chart"></div>';

    const chart = container.querySelector('#timeline-chart');
    chart.style.marginTop = '20px';
    chart.style.borderLeft = '2px solid var(--border)';
    chart.style.paddingLeft = '20px';

    // Sort events by date
    const sorted = [...events].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

    sorted.forEach(ev => {
        const el = document.createElement('div');
        el.className = 'card';
        el.style.marginBottom = '12px';
        el.style.padding = '12px';
        el.style.borderLeft = `4px solid ${getBrandColor(ev.brand)}`;
        el.style.cursor = 'pointer';

        const dateStr = new Date(ev.start_at || ev.event_date).toLocaleDateString();

        el.innerHTML = `
      <div style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</div>
      <div style="font-weight:bold; font-size:1rem;">${ev.title}</div>
      <div style="display:flex; gap:8px; margin-top:4px;">
        <span class="badge" style="background:var(--bg-main);">${getBrandLabel(ev.brand)}</span>
        <span class="badge" style="background:var(--bg-main);">${ev.location || 'Online'}</span>
      </div>
    `;

        el.onclick = () => onEventClick(ev);
        chart.appendChild(el);
    });
}
