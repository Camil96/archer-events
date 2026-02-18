/* 
  ARCHER CALENDAR MODULE 📅
  - Year View (Heatmap style)
  - Month View (Detail grid)
  - Full Navigation
*/

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export function renderCalendar(container, events, onEventClick) {
    // Internal State
    let currentDate = new Date();
    let currentView = 'month'; // 'month' | 'year'

    // Helper: Get date object from event
    const getEventDate = (e) => new Date(e.start_at || e.event_date);

    function render() {
        container.innerHTML = '';

        // 1. Header (Navigation & View Switch)
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '32px';

        const navLeft = document.createElement('div');
        navLeft.style.display = 'flex';
        navLeft.style.gap = '12px';
        navLeft.style.alignItems = 'center';

        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-ghost';
        btnPrev.innerHTML = '←';
        btnPrev.onclick = () => changeDate(-1);

        const btnNext = document.createElement('button');
        btnNext.className = 'btn-ghost';
        btnNext.innerHTML = '→';
        btnNext.onclick = () => changeDate(1);

        const btnToday = document.createElement('button');
        btnToday.className = 'btn-outline';
        btnToday.textContent = 'Vandaag';
        btnToday.onclick = () => { currentDate = new Date(); render(); };

        const title = document.createElement('h2');
        title.style.margin = '0 0 0 16px';
        title.textContent = getTitle();

        navLeft.append(btnToday, btnPrev, btnNext, title);

        const navRight = document.createElement('div');
        navRight.style.display = 'flex';
        navRight.style.gap = '4px';
        navRight.style.background = 'var(--bg-card)';
        navRight.style.padding = '4px';
        navRight.style.borderRadius = 'var(--radius-xl)';
        navRight.style.border = '1px solid var(--border)';

        ['Maand', 'Jaar'].forEach(view => {
            const btn = document.createElement('button');
            const viewKey = view === 'Maand' ? 'month' : 'year';
            const isActive = currentView === viewKey;
            btn.className = isActive ? 'btn-primary' : 'btn-ghost';
            if (isActive) btn.style.boxShadow = 'none'; // Overwrite primary shadow for toggle

            btn.style.padding = '6px 16px';
            btn.style.fontSize = '0.9rem';
            btn.textContent = view;
            btn.onclick = () => { currentView = viewKey; render(); };
            navRight.appendChild(btn);
        });

        header.append(navLeft, navRight);
        container.appendChild(header);

        // 2. Content
        const content = document.createElement('div');
        content.className = 'calendar-content';
        content.style.animation = 'fadeIn 0.3s ease';

        if (currentView === 'month') {
            renderMonthView(content);
        } else {
            renderYearView(content);
        }

        container.appendChild(content);
    }

    function changeDate(delta) {
        if (currentView === 'month') {
            currentDate.setMonth(currentDate.getMonth() + delta);
        } else {
            currentDate.setFullYear(currentDate.getFullYear() + delta);
        }
        render();
    }

    function getTitle() {
        if (currentView === 'month') {
            return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        } else {
            return `${currentDate.getFullYear()}`;
        }
    }

    /* ── Month View Logic ── */
    function renderMonthView(root) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayM = new Date(year, month, 1);
        const daysInM = new Date(year, month + 1, 0).getDate();

        // Calculate start offset (Monday = 0)
        let startDay = firstDayM.getDay() - 1;
        if (startDay < 0) startDay = 6;

        // Grid container
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(7, 1fr)';
        grid.style.gap = '1px';
        grid.style.background = 'var(--border)';
        grid.style.border = '1px solid var(--border)';
        grid.style.borderRadius = 'var(--radius-lg)';
        grid.style.overflow = 'hidden';

        // Headers
        DAYS.forEach(d => {
            const el = document.createElement('div');
            el.style.background = 'var(--bg-main)';
            el.style.padding = '12px';
            el.style.textAlign = 'center';
            el.style.fontWeight = '700';
            el.style.fontSize = '0.85rem';
            el.style.color = 'var(--text-muted)';
            el.style.textTransform = 'uppercase';
            el.textContent = d;
            grid.appendChild(el);
        });

        // Empty slots
        for (let i = 0; i < startDay; i++) {
            const el = document.createElement('div');
            el.style.background = 'var(--bg-card)';
            el.style.minHeight = '140px';
            grid.appendChild(el);
        }

        // Days
        const today = new Date();
        for (let d = 1; d <= daysInM; d++) {
            const dayEvents = events.filter(e => {
                const eDate = getEventDate(e);
                return eDate.getFullYear() === year && eDate.getMonth() === month && eDate.getDate() === d;
            });

            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

            const el = document.createElement('div');
            el.className = 'cal-day-cell';
            el.style.minHeight = '140px';
            el.style.padding = '8px';
            el.style.position = 'relative';
            if (isToday) el.style.background = 'var(--primary-vlight)';

            el.innerHTML = `<div style="text-align:right; font-weight:${isToday ? '800' : '600'}; color:${isToday ? 'var(--primary)' : 'var(--text-muted)'}; margin-bottom:8px;">${d}</div>`;

            // Event Bars
            dayEvents.forEach(ev => {
                const badge = document.createElement('div');
                badge.textContent = ev.title;
                badge.style.fontSize = '0.75rem';
                badge.style.fontWeight = '600';
                badge.style.padding = '4px 8px';
                badge.style.borderRadius = '4px';
                badge.style.marginBottom = '4px';
                badge.style.cursor = 'pointer';
                badge.style.whiteSpace = 'nowrap';
                badge.style.overflow = 'hidden';
                badge.style.textOverflow = 'ellipsis';

                // Brand Colors
                if (ev.brand === 'Invest') {
                    badge.style.background = '#DCFCE7'; badge.style.color = '#166534';
                } else if (ev.brand === 'Fund') {
                    badge.style.background = '#FEF3C7'; badge.style.color = '#92400E';
                } else {
                    badge.style.background = '#DBEAFE'; badge.style.color = '#1E40AF'; // Academy/Default
                }

                badge.onclick = (e) => { e.stopPropagation(); onEventClick(ev); };
                el.appendChild(badge);
            });

            // Click empty space to create
            el.onclick = (e) => {
                if (e.target === el) {
                    // Create new event on this date
                    // Adjust for timezone offset to keep date correct
                    const targetDate = new Date(year, month, d, 12, 0, 0);
                    const isoStr = targetDate.toISOString().slice(0, 16);
                    onEventClick({ start_at: isoStr });
                }
            };

            grid.appendChild(el);
        }
        root.appendChild(grid);
    }

    /* ── Year View Logic (Heatmap) ── */
    function renderYearView(root) {
        const year = currentDate.getFullYear();
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))'; // Responsive Grid
        grid.style.gap = '24px';

        for (let m = 0; m < 12; m++) {
            const monthContainer = document.createElement('div');
            monthContainer.className = 'card';
            monthContainer.style.padding = '16px';
            monthContainer.style.border = '1px solid var(--border)';

            const mTitle = document.createElement('h4');
            mTitle.textContent = MONTHS[m];
            mTitle.style.marginBottom = '12px';
            mTitle.style.textAlign = 'center';
            mTitle.style.color = 'var(--text-heading)';
            monthContainer.appendChild(mTitle);

            const miniGrid = document.createElement('div');
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            miniGrid.style.gap = '4px';

            // Days of month
            const daysInM = new Date(year, m + 1, 0).getDate();
            const firstDay = new Date(year, m, 1);
            let offset = firstDay.getDay() - 1;
            if (offset < 0) offset = 6;

            // Spacers
            for (let i = 0; i < offset; i++) {
                miniGrid.appendChild(document.createElement('div'));
            }

            // Days
            for (let d = 1; d <= daysInM; d++) {
                const cell = document.createElement('div');
                cell.textContent = d;
                cell.style.fontSize = '0.75rem';
                cell.style.textAlign = 'center';
                cell.style.padding = '4px 0';
                cell.style.borderRadius = '50%';
                cell.style.width = '24px';
                cell.style.height = '24px';
                cell.style.margin = '0 auto';

                // Heatmap Logic: Check if events exist
                const count = events.filter(e => {
                    const ed = getEventDate(e);
                    return ed.getFullYear() === year && ed.getMonth() === m && ed.getDate() === d;
                }).length;

                if (count > 0) {
                    const intensity = Math.min(count, 3); // 1, 2, or 3+
                    if (intensity === 1) cell.style.background = '#93C5FD'; // Light Blue
                    if (intensity === 2) cell.style.background = '#3B82F6'; // Medium Blue
                    if (intensity >= 3) cell.style.background = '#1E40AF'; // Dark Blue

                    cell.style.color = 'white';
                    cell.style.fontWeight = 'bold';
                } else {
                    cell.style.color = 'var(--text-muted)';
                }

                cell.style.cursor = 'pointer';
                cell.onclick = () => {
                    currentDate = new Date(year, m, d);
                    currentView = 'month';
                    render();
                };

                miniGrid.appendChild(cell);
            }
            monthContainer.appendChild(miniGrid);
            grid.appendChild(monthContainer);
        }
        root.appendChild(grid);
    }

    render();
}
