function exportBackup() {
    const backupData = { orders, customers, coupons, exportDate: new Date().toISOString() };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prin-epic-backup-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('✅ Backup exportado correctamente', 'success');
}
function importBackup(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            if (!backupData.orders || !backupData.customers) throw new Error('Archivo no válido');
            if (confirm('⚠️ Esta acción reemplazará todos los datos actuales. ¿Estás seguro?')) {
                orders = backupData.orders;
                customers = backupData.customers;
                coupons = backupData.coupons || [];
                saveData();
                renderAll();
                showNotification('✅ Backup importado correctamente', 'success');
            }
        } catch (error) {
            console.error(error);
            showNotification('❌ Archivo no válido o corrupto', 'error');
        }
        input.value = '';
    };
    reader.readAsText(file);
}

// Funciones auxiliares
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        rememberActiveModal(modalId);
        modal.classList.add('active');
    }
}
function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (modalId === localStorage.getItem(LAST_ACTIVE_MODAL_KEY)) rememberActiveModal(null);
}
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => { notification.style.display = 'none'; }, 3000);
}
function openMobileMenu() {
    document.body.classList.add('mobile-menu-open');
}
function closeMobileMenu() {
    document.body.classList.remove('mobile-menu-open');
}
function toggleMobileMenu() {
    document.body.classList.toggle('mobile-menu-open');
}
function updateHomeButtonVisibility(sectionId) {
    const homeButton = document.getElementById('homeFab');
    if (!homeButton) return;
    homeButton.classList.toggle('visible', sectionId !== DEFAULT_SECTION_ID);
}
function goHome() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
    rememberActiveModal(null);
    showSection(DEFAULT_SECTION_ID, null);
}
function showSection(sectionId, navElement, options = {}) {
    const targetSectionId = document.getElementById(sectionId) ? sectionId : DEFAULT_SECTION_ID;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(targetSectionId);
    if (section) section.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const resolvedNav = navElement || Array.from(document.querySelectorAll('.nav-item')).find(item => item.getAttribute('onclick') && item.getAttribute('onclick').includes("showSection('" + targetSectionId + "'"));
    if (resolvedNav) resolvedNav.classList.add('active');
    rememberActiveSection(targetSectionId);
    updateHomeButtonVisibility(targetSectionId);
    if (window.innerWidth <= 1024) closeMobileMenu();
    if (!options.skipRender) renderAll();
}
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMobileMenu();
});

// Renderizado
function getOrderCostTotal(order) {
    const possibleCost = [
        order && order.costTotal,
        order && order.totalCost,
        order && order.costoTotal,
        order && order.productionCost,
        order && order.costoProduccion
    ].find(value => typeof value === 'number' && !Number.isNaN(value));
    return typeof possibleCost === 'number' ? possibleCost : null;
}
function getOrderNetProfit(order) {
    const possibleNet = [
        order && order.netProfit,
        order && order.gananciaNeta,
        order && order.profit,
        order && order.ganancia
    ].find(value => typeof value === 'number' && !Number.isNaN(value));
    if (typeof possibleNet === 'number') return possibleNet;
    const costTotal = getOrderCostTotal(order);
    if (costTotal === null) return null;
    return Math.max(0, (Number(order && order.total) || 0) - costTotal);
}
function getOrderCollectedAmount(order) {
    if (order && order.paid) return Number(order.total) || 0;
    return Math.max(0, Number(order && order.advance) || 0);
}
function getOrderCollectedNet(order) {
    const netProfit = getOrderNetProfit(order);
    const collectedAmount = getOrderCollectedAmount(order);
    if (netProfit === null) return collectedAmount;
    const totalAmount = Number(order && order.total) || 0;
    if (totalAmount <= 0) return 0;
    const collectedRatio = Math.min(1, collectedAmount / totalAmount);
    return netProfit * collectedRatio;
}
function renderAll() { 
    renderDashboard(); 
    renderOrders(); 
    renderHistory();
    renderCustomers(); 
    renderFinance(); 
    renderCoupons();
    renderCharts(); 
    saveData(); 
}
function normalizeDateValue(dateValue, fallback = '') {
    if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) return toDateInputValue(dateValue);
    const raw = String(dateValue || '').trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    const parsed = raw ? new Date(raw) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) return toDateInputValue(parsed);
    return fallback || getTodayDateString();
}
function getUtcDateString(dateValue = new Date()) {
    return new Date(dateValue).toISOString().slice(0, 10);
}
function normalizeOrderDateForLocalTimezone(dateValue) {
    const normalized = normalizeDateValue(dateValue);
    const localToday = getTodayDateString();
    const utcToday = getUtcDateString();
    return normalized === utcToday && utcToday !== localToday ? localToday : normalized;
}
function formatDateTitle(dateValue) {
    const date = new Date(normalizeDateValue(dateValue) + 'T00:00:00');
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
function toDateInputValue(dateValue) {
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function addDays(dateValue, days) {
    const date = new Date(dateValue);
    date.setDate(date.getDate() + days);
    return date;
}
function getTodayDateString() {
    return toDateInputValue(new Date());
}
function getMonthName(monthIndex) {
    return new Date(2026, monthIndex, 1).toLocaleDateString('es-MX', { month: 'long' });
}
let dashboardCalendarViewDate = new Date();
let dashboardRangePickStep = 'start';
const DASHBOARD_PRESET_LABELS = {
    today: 'Hoy',
    yesterday: 'Ayer',
    last7: 'Últimos 7 días',
    last30: 'Últimos 30 días',
    month: 'Mes seleccionado',
    day: 'Día seleccionado',
    custom: 'Personalizado'
};
function initDashboardDateControls() {
    const monthSelect = document.getElementById('dashboardMonth');
    const yearSelect = document.getElementById('dashboardYear');
    if (!monthSelect || !yearSelect) return;
    const today = new Date();
    monthSelect.innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index}">${getMonthName(index)}</option>`).join('');
    const years = new Set([today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]);
    orders.forEach(order => {
        const year = Number(normalizeDateValue(order.date, '').slice(0, 4));
        if (year) years.add(year);
    });
    yearSelect.innerHTML = Array.from(years).sort((a, b) => b - a).map(year => `<option value="${year}">${year}</option>`).join('');
    monthSelect.value = String(today.getMonth());
    yearSelect.value = String(today.getFullYear());
    updateDashboardDayOptions(today.getDate());
    const fromInput = document.getElementById('dashboardDateFrom');
    const toInput = document.getElementById('dashboardDateTo');
    if (fromInput) fromInput.value = getTodayDateString();
    if (toInput) toInput.value = getTodayDateString();
    dashboardCalendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    renderDashboardDatePicker();
}
function updateDashboardDayOptions(selectedDay) {
    const daySelect = document.getElementById('dashboardDay');
    const monthSelect = document.getElementById('dashboardMonth');
    const yearSelect = document.getElementById('dashboardYear');
    if (!daySelect || !monthSelect || !yearSelect) return;
    const year = Number(yearSelect.value) || new Date().getFullYear();
    const month = Number(monthSelect.value) || 0;
    const totalDays = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(Number(selectedDay) || Number(daySelect.value) || 1, totalDays);
    daySelect.innerHTML = Array.from({ length: totalDays }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('');
    daySelect.value = String(safeDay);
}
function getDashboardDateRange() {
    const preset = document.getElementById('dashboardDatePreset')?.value || 'today';
    const today = new Date();
    const todayValue = getTodayDateString();
    let start = todayValue;
    let end = todayValue;
    let label = 'Ventas de hoy';
    if (preset === 'yesterday') {
        start = end = toDateInputValue(addDays(today, -1));
        label = `Ventas de ayer (${formatDateTitle(start)})`;
    } else if (preset === 'last7') {
        start = toDateInputValue(addDays(today, -6));
        label = `Ventas de los últimos 7 días (${formatDateTitle(start)} - ${formatDateTitle(end)})`;
    } else if (preset === 'last30') {
        start = toDateInputValue(addDays(today, -29));
        label = `Ventas de los últimos 30 días (${formatDateTitle(start)} - ${formatDateTitle(end)})`;
    } else if (preset === 'month') {
        const year = Number(document.getElementById('dashboardYear')?.value) || today.getFullYear();
        const month = Number(document.getElementById('dashboardMonth')?.value) || today.getMonth();
        start = toDateInputValue(new Date(year, month, 1));
        end = toDateInputValue(new Date(year, month + 1, 0));
        label = `Ventas de ${getMonthName(month)} ${year}`;
    } else if (preset === 'day') {
        const year = Number(document.getElementById('dashboardYear')?.value) || today.getFullYear();
        const month = Number(document.getElementById('dashboardMonth')?.value) || today.getMonth();
        const day = Number(document.getElementById('dashboardDay')?.value) || today.getDate();
        start = end = toDateInputValue(new Date(year, month, day));
        label = `Ventas del ${formatDateTitle(start)}`;
    } else if (preset === 'custom') {
        start = normalizeDateValue(document.getElementById('dashboardDateFrom')?.value, todayValue);
        end = normalizeDateValue(document.getElementById('dashboardDateTo')?.value, start);
        if (start > end) [start, end] = [end, start];
        label = `Ventas de ${formatDateTitle(start)} a ${formatDateTitle(end)}`;
    }
    return { start, end, label, preset };
}
function handleDashboardDatePresetChange() {
    renderDashboardDatePicker();
    applyDashboardDateFilter();
}
function handleDashboardDatePartsChange() {
    updateDashboardDayOptions();
    const preset = document.getElementById('dashboardDatePreset');
    if (preset && !['month', 'day'].includes(preset.value)) preset.value = 'day';
    const year = Number(document.getElementById('dashboardYear')?.value) || new Date().getFullYear();
    const month = Number(document.getElementById('dashboardMonth')?.value) || new Date().getMonth();
    dashboardCalendarViewDate = new Date(year, month, 1);
    syncDashboardInputsFromPreset();
    renderDashboardDatePicker();
    applyDashboardDateFilter();
}
function handleDashboardCustomRangeChange() {
    const preset = document.getElementById('dashboardDatePreset');
    if (preset) preset.value = 'custom';
    dashboardRangePickStep = 'start';
    renderDashboardDatePicker();
    applyDashboardDateFilter();
}
function toggleDashboardDatePanel() {
    const panel = document.getElementById('dashboardDatePanel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) renderDashboardDatePicker();
}
function closeDashboardDatePanel() {
    const panel = document.getElementById('dashboardDatePanel');
    if (panel) panel.hidden = true;
}
function syncDashboardInputsFromPreset() {
    const preset = document.getElementById('dashboardDatePreset')?.value || 'today';
    const today = new Date();
    let start = getTodayDateString();
    let end = start;
    if (preset === 'yesterday') {
        start = end = toDateInputValue(addDays(today, -1));
    } else if (preset === 'last7') {
        start = toDateInputValue(addDays(today, -6));
    } else if (preset === 'last30') {
        start = toDateInputValue(addDays(today, -29));
    } else if (preset === 'month') {
        const year = Number(document.getElementById('dashboardYear')?.value) || today.getFullYear();
        const month = Number(document.getElementById('dashboardMonth')?.value) || today.getMonth();
        start = toDateInputValue(new Date(year, month, 1));
        end = toDateInputValue(new Date(year, month + 1, 0));
    } else if (preset === 'day') {
        const year = Number(document.getElementById('dashboardYear')?.value) || today.getFullYear();
        const month = Number(document.getElementById('dashboardMonth')?.value) || today.getMonth();
        const day = Number(document.getElementById('dashboardDay')?.value) || today.getDate();
        start = end = toDateInputValue(new Date(year, month, day));
    } else if (preset === 'custom') {
        start = normalizeDateValue(document.getElementById('dashboardDateFrom')?.value, start);
        end = normalizeDateValue(document.getElementById('dashboardDateTo')?.value, start);
        if (start > end) [start, end] = [end, start];
    }
    const fromInput = document.getElementById('dashboardDateFrom');
    const toInput = document.getElementById('dashboardDateTo');
    if (fromInput) fromInput.value = start;
    if (toInput) toInput.value = end;
}
function setDashboardPreset(preset) {
    const presetSelect = document.getElementById('dashboardDatePreset');
    if (presetSelect) presetSelect.value = preset;
    dashboardRangePickStep = 'start';
    if (preset !== 'custom') syncDashboardInputsFromPreset();
    if (preset === 'month' || preset === 'day') {
        const year = Number(document.getElementById('dashboardYear')?.value) || new Date().getFullYear();
        const month = Number(document.getElementById('dashboardMonth')?.value) || new Date().getMonth();
        dashboardCalendarViewDate = new Date(year, month, 1);
    }
    renderDashboardDatePicker();
    applyDashboardDateFilter();
}
function shiftDashboardCalendar(delta) {
    dashboardCalendarViewDate = new Date(dashboardCalendarViewDate.getFullYear(), dashboardCalendarViewDate.getMonth() + delta, 1);
    const monthSelect = document.getElementById('dashboardMonth');
    const yearSelect = document.getElementById('dashboardYear');
    if (monthSelect) monthSelect.value = String(dashboardCalendarViewDate.getMonth());
    if (yearSelect) yearSelect.value = String(dashboardCalendarViewDate.getFullYear());
    updateDashboardDayOptions();
    renderDashboardDatePicker();
}
function chooseDashboardCalendarDate(dateValue) {
    const presetSelect = document.getElementById('dashboardDatePreset');
    const date = new Date(`${dateValue}T00:00:00`);
    const monthSelect = document.getElementById('dashboardMonth');
    const yearSelect = document.getElementById('dashboardYear');
    if (monthSelect) monthSelect.value = String(date.getMonth());
    if (yearSelect) yearSelect.value = String(date.getFullYear());
    updateDashboardDayOptions(date.getDate());
    if (presetSelect && presetSelect.value === 'custom') {
        const fromInput = document.getElementById('dashboardDateFrom');
        const toInput = document.getElementById('dashboardDateTo');
        if (dashboardRangePickStep === 'start') {
            if (fromInput) fromInput.value = dateValue;
            if (toInput) toInput.value = dateValue;
            dashboardRangePickStep = 'end';
        } else {
            let start = fromInput?.value || dateValue;
            let end = dateValue;
            if (start > end) [start, end] = [end, start];
            if (fromInput) fromInput.value = start;
            if (toInput) toInput.value = end;
            dashboardRangePickStep = 'start';
        }
    } else {
        if (presetSelect) presetSelect.value = 'day';
        const fromInput = document.getElementById('dashboardDateFrom');
        const toInput = document.getElementById('dashboardDateTo');
        if (fromInput) fromInput.value = dateValue;
        if (toInput) toInput.value = dateValue;
    }
    renderDashboardDatePicker();
    applyDashboardDateFilter();
}
function renderDashboardDatePicker() {
    const panel = document.getElementById('dashboardDatePanel');
    const calendarContainer = document.getElementById('dashboardCalendars');
    const title = document.getElementById('dashboardCalendarTitle');
    const preset = document.getElementById('dashboardDatePreset')?.value || 'today';
    const range = getDashboardDateRange();
    const buttonText = document.getElementById('dashboardRangeButtonText');
    if (buttonText) buttonText.textContent = range.label.replace(/^Ventas de\s*/i, '').replace(/^Ventas del\s*/i, '');
    document.querySelectorAll('.dashboard-preset-option').forEach(button => {
        button.classList.toggle('active', button.dataset.preset === preset);
    });
    if (!calendarContainer) return;
    if (title) {
        const next = new Date(dashboardCalendarViewDate.getFullYear(), dashboardCalendarViewDate.getMonth() + 1, 1);
        title.textContent = `${getMonthName(dashboardCalendarViewDate.getMonth())} ${dashboardCalendarViewDate.getFullYear()} - ${getMonthName(next.getMonth())} ${next.getFullYear()}`;
    }
    calendarContainer.innerHTML = [0, 1].map(offset => renderDashboardCalendarMonth(new Date(dashboardCalendarViewDate.getFullYear(), dashboardCalendarViewDate.getMonth() + offset, 1), range)).join('');
    if (panel && panel.hidden) return;
}
function renderDashboardCalendarMonth(monthDate, range) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (firstDay.getDay() + 6) % 7;
    const today = getTodayDateString();
    const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const blanks = Array.from({ length: leading }, () => '<button type="button" class="dashboard-calendar-day is-muted" disabled></button>').join('');
    const days = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const dateValue = toDateInputValue(new Date(year, month, day));
        const selected = dateValue === range.start || dateValue === range.end;
        const inRange = dateValue > range.start && dateValue < range.end;
        const classes = [
            'dashboard-calendar-day',
            selected ? 'is-selected' : '',
            inRange ? 'is-in-range' : '',
            dateValue === today ? 'is-today' : ''
        ].filter(Boolean).join(' ');
        return `<button type="button" class="${classes}" onclick="chooseDashboardCalendarDate('${dateValue}')">${day}</button>`;
    }).join('');
    return `
        <div class="dashboard-calendar-month">
            <h4>${getMonthName(month)} ${year}</h4>
            <div class="dashboard-calendar-grid">
                ${weekdays.map(day => `<div class="dashboard-calendar-weekday">${day}</div>`).join('')}
                ${blanks}${days}
            </div>
        </div>
    `;
}
function applyDashboardDateFilter(closePanelAfterApply = false) {
    renderDashboard();
    renderDashboardDatePicker();
    if (closePanelAfterApply) closeDashboardDatePanel();
}
function renderHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    if (!orders.length) {
        container.innerHTML = '<div class="empty-state"><h3>No hay pedidos registrados</h3><p>Los pedidos aparecerán aquí organizados por fecha.</p></div>';
        return;
    }
    const grouped = orders.reduce((map, order) => {
        const date = normalizeDateValue(order.date);
        if (!map[date]) map[date] = [];
        map[date].push(order);
        return map;
    }, {});
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    container.innerHTML = sortedDates.map(date => `
        <div class="history-date-group">
            <h2 class="history-date-title">${formatDateTitle(date)}</h2>
            ${grouped[date].map(order => {
                const safeOrderId = jsStringEscape(order.id);
                const normalizedStatus = normalizeOrderStatus(order.status);
                return `
                <div class="history-order-card">
                    <div class="history-order-header">
                        <div>
                            <h3>${ticketEscape(order.customerName)}</h3>
                            <p style="color:#64748b; margin-top:4px;">${ticketEscape(order.id)} · ${ticketEscape(order.technique || '-')}</p>
                        </div>
                        <div class="action-buttons">
                            <button onclick="viewOrder('${safeOrderId}')" class="btn btn-primary btn-sm">Ver</button>
                            <button onclick="openEditOrderModal('${safeOrderId}')" class="btn btn-info btn-sm">Editar</button>
                        </div>
                    </div>
                    <div class="history-order-grid">
                        <div><strong>Total</strong>$${(Number(order.total) || 0).toLocaleString()}</div>
                        <div><strong>Anticipo</strong>$${(Number(order.advance) || 0).toLocaleString()}</div>
                        <div><strong>Restante</strong>$${(Number(order.remaining) || 0).toLocaleString()}</div>
                        <div><strong>Estado</strong><span class="status-badge status-${getOrderStatusClass(normalizedStatus)}">${ticketEscape(normalizedStatus)}</span></div>
                    </div>
                    <div class="history-products">
                        ${(order.products || []).map(product => `${ticketEscape(product.qty)}x ${ticketEscape(product.type)} ${ticketEscape(product.color || '')} talla ${ticketEscape(product.size || '')} - $${(Number(product.price) || 0).toLocaleString()}`).join('<br>')}
                    </div>
                </div>
            `}).join('')}
        </div>
    `).join('');
}
function renderDashboard() {
    const range = getDashboardDateRange();
    const periodOrders = orders.filter(order => {
        const date = normalizeDateValue(order.date, '');
        return date >= range.start && date <= range.end;
    });
    const financialPeriodOrders = periodOrders.filter(order => !isCancelledOrder(order));
    const periodNet = financialPeriodOrders.reduce((sum, order) => sum + getOrderCollectedNet(order), 0);
    const periodCustomers = new Set(periodOrders.map(order => String(order.customerName || '').trim().toLowerCase()).filter(Boolean));
    const filterLabel = document.getElementById('dashboardFilterLabel');
    if (filterLabel) filterLabel.textContent = range.label;
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) currentDateEl.textContent = range.label.replace(/^Ventas de\s*/i, '').replace(/^Ventas del\s*/i, '');
    document.getElementById('daily-orders').textContent = periodOrders.length;
    document.getElementById('daily-sales').textContent = '$' + financialPeriodOrders.reduce((s,o) => s + Number(o.total || 0), 0).toLocaleString();
    document.getElementById('daily-advance').textContent = '$' + financialPeriodOrders.reduce((s,o) => s + Number(o.advance || 0), 0).toLocaleString();
    document.getElementById('daily-net').textContent = '$' + Math.round(periodNet).toLocaleString();
    document.getElementById('stat-new').textContent = periodOrders.length;
    document.getElementById('stat-pending').textContent = periodOrders.filter(o => isPendingOrderStatus(o.status) || ['En Producción', 'Listo para Entregar'].includes(normalizeOrderStatus(o.status))).length;
    document.getElementById('stat-delivered').textContent = periodOrders.filter(o => normalizeOrderStatus(o.status) === 'Entregado').length;
    document.getElementById('stat-income').textContent = '$' + financialPeriodOrders.reduce((s,o) => s + Number(o.advance || 0), 0).toLocaleString();
    document.getElementById('stat-net').textContent = '$' + Math.round(periodNet).toLocaleString();
    document.getElementById('stat-remaining').textContent = '$' + financialPeriodOrders.reduce((s,o) => s + Number(o.remaining || 0), 0).toLocaleString();
    document.getElementById('stat-customers').textContent = periodCustomers.size;
    const tbody = document.getElementById('dashboard-orders');
    if (tbody) {
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px;">No hay pedidos registrados</td></tr>';
        } else if (periodOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">No hay pedidos en este periodo: ${ticketEscape(range.label)}. Elige otro rango en el selector de fechas.</td></tr>`;
        } else {
            tbody.innerHTML = periodOrders.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0,5).map(order => {
                const safeOrderId = jsStringEscape(order.id);
                const normalizedStatus = normalizeOrderStatus(order.status);
                return `
                <tr onclick="viewOrder('${safeOrderId}')" style="cursor:pointer;">
                    <td><strong>${ticketEscape(order.id)}</strong><br><small>${ticketEscape(order.date)}</small></td>
                    <td>${ticketEscape(order.customerName)}</td>
                    <td>${order.products ? order.products.map(p=>`${ticketEscape(p.qty)}x ${ticketEscape(p.type)}`).join(', ') : ''}</td>
                    <td>$${Number(order.total || 0).toLocaleString()}</td>
                    <td><span class="payment-badge payment-${order.paid?'paid':order.advance>0?'partial':'pending'}">${order.paid?'Saldado':order.advance>0?'Con Anticipo':'Pendiente'}</span></td>
                    <td><span class="status-badge status-${getOrderStatusClass(normalizedStatus)}">${ticketEscape(normalizedStatus)}</span></td>
                    <td><button onclick="event.stopPropagation(); viewOrder('${safeOrderId}')" class="btn btn-primary btn-sm">Ver</button></td>
                </tr>
            `}).join('');
        }
    }
}
function viewOrder(orderId) {
    currentOrderId = orderId;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    document.getElementById('detailOrderId').textContent = `Pedido #${order.id}`;
    let productsHTML = '';
    if (order.products && order.products.length > 0) {
        productsHTML = order.products.map(p => `
            <div style="background:#f8fafc; padding:15px; border-radius:10px; margin-bottom:10px;">
                <strong>${ticketEscape(p.qty)}x ${ticketEscape(p.type)}</strong> - ${ticketEscape(p.color)} - Talla ${ticketEscape(p.size)} - Género: ${ticketEscape(p.gender || 'No especificado')}<br>
                Precio unitario: $${p.price}
            </div>
        `).join('');
    }
    const relatedCoupon = coupons.find(coupon => coupon.orderId === order.id);
    const couponButton = getOrderCouponEligibility(order)
        ? `<button class="btn btn-success" onclick="generateCouponForCurrentOrder()" style="margin-top:10px;">${relatedCoupon ? 'Ver cupón generado' : 'Generar cupón $100'}</button>`
        : '';
    document.getElementById('orderDetailContent').innerHTML = `
        <div>
            <h3>Cliente: ${ticketEscape(order.customerName)}</h3>
            <p>Teléfono: ${ticketEscape(order.customerPhone || '-')}</p>
            <p>Fecha: ${ticketEscape(order.date)}</p>
            <p>Técnica: ${ticketEscape(order.technique)}</p>
            <p>Total: $${order.total.toLocaleString()}</p>
            <p>Anticipo: $${order.advance.toLocaleString()}</p>
            <p>Restante: $${order.remaining.toLocaleString()}</p>
            <p>Costo total: $${(order.costTotal || 0).toLocaleString()}</p>
            <p>Neto para ti: $${(order.netProfit || Math.max(0, order.total - (order.costTotal || 0))).toLocaleString()}</p>
            <p>Estado: ${ticketEscape(normalizeOrderStatus(order.status))}</p>
            <h4>Productos:</h4>
            ${productsHTML}
            ${couponButton}
        </div>
    `;
    document.getElementById('orderDetailModal').classList.add('active');
}
async function markAsPaid() {
    const order = orders.find(o => o.id === currentOrderId);
    if (order) { 
        order.paid = true; 
        order.remaining = 0; 
        order.advance = order.total; 
        order.status = 'Entregado'; 
        try {
            await persistOrderToDatabase(order);
        } catch (error) {
            console.error(error);
            showNotification('No se pudo actualizar el pedido en Supabase.', 'error');
            return;
        }
        saveData(); 
        maybeCreateCouponFromOrder(order);
        saveData();
        renderAll(); 
        viewOrder(currentOrderId); 
        showNotification('✅ Pedido marcado como saldado', 'success'); 
    }
}
function filterOrders(filter, element) { 
    currentFilter = filter; 
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); 
    element.classList.add('active'); 
    renderOrders(); 
}
function renderOrders() {
    const tbody = document.getElementById('orders-table');
    if (!tbody) return;
    let filtered = orders;
    if (currentFilter === 'pending') filtered = orders.filter(o => isPendingOrderStatus(o.status));
    else if (currentFilter === 'production') filtered = orders.filter(o => ['En Producción', 'Listo para Entregar'].includes(o.status));
    else if (currentFilter === 'completed') filtered = orders.filter(o => normalizeOrderStatus(o.status) === 'Entregado');
    else if (currentFilter === 'paid') filtered = orders.filter(o => o.paid === true);
    else if (currentFilter === 'cancelled') filtered = orders.filter(o => normalizeOrderStatus(o.status) === 'Cancelado');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px;">No hay pedidos en esta categoría</td></tr>';
    } else {
        tbody.innerHTML = filtered.map(order => {
            const safeOrderId = jsStringEscape(order.id);
            const normalizedStatus = normalizeOrderStatus(order.status);
            return `
            <tr>
                <td><strong>${ticketEscape(order.id)}</strong><br><small>${ticketEscape(order.date)}</small></td>
                <td>${ticketEscape(order.customerName)}</td>
                <td>${order.products ? order.products.map(p=>`${ticketEscape(p.qty)}x ${ticketEscape(p.type)}`).join(', ') : ''}</td>
                <td>$${order.total.toLocaleString()}</td>
                <td>$${order.advance.toLocaleString()}</td>
                <td>$${order.remaining.toLocaleString()}</td>
                <td><span class="status-badge status-${getOrderStatusClass(normalizedStatus)}">${ticketEscape(normalizedStatus)}</span></td>
                <td><div class="action-buttons"><button onclick="viewOrder('${safeOrderId}')" class="btn btn-primary btn-sm">Ver</button><button onclick="openEditOrderModal('${safeOrderId}')" class="btn btn-info btn-sm">Editar</button><button onclick="deleteOrder('${safeOrderId}')" class="btn btn-danger btn-sm">Eliminar</button></div></td>
            </tr>
        `}).join('');
    }
}
async function deleteOrder(orderId) {
    if (confirm('¿Estás seguro de eliminar este pedido?')) {
        try {
            await deleteOrderFromDatabase(orderId);
        } catch (error) {
            console.error(error);
            showNotification('No se pudo eliminar el pedido en Supabase.', 'error');
            return;
        }
        orders = orders.filter(o => o.id !== orderId);
        saveData();
        renderAll();
        showNotification('🗑️ Pedido eliminado', 'success');
    }
}
function renderCustomers() {
    const tbody = document.getElementById('customers-table');
    if (!tbody) return;
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;">No hay clientes registrados</td></tr>';
    } else {
        tbody.innerHTML = customers.map(customer => {
            const customerName = String(customer.name || '').trim().toLowerCase();
            const orderCount = orders.filter(o => String(o.customerName || '').trim().toLowerCase() === customerName).length;
            const safeCustomerId = String(customer.id).replace(/'/g, "\\'");
            return `
                <tr>
                    <td><strong>${ticketEscape(customer.name)}</strong></td>
                    <td>${ticketEscape(customer.phone || '-')}</td>
                    <td>${ticketEscape(customer.email || '-')}</td>
                    <td>${ticketEscape(customer.date)}</td>
                    <td>${orderCount} pedidos</td>
                    <td><div class="action-buttons"><button onclick="openEditCustomerModal('${safeCustomerId}')" class="btn btn-info btn-sm">Editar</button><button onclick="deleteCustomer('${safeCustomerId}')" class="btn btn-danger btn-sm">Eliminar</button></div></td>
                </tr>
            `;
        }).join('');
    }
}
function openEditCustomerModal(id) {
    const customer = customers.find(c => String(c.id) === String(id));
    if (!customer) {
        showNotification('Cliente no encontrado', 'error');
        return;
    }
    editingCustomerId = String(customer.id);
    const title = document.querySelector('#newCustomerModal .modal-header h2');
    if (title) title.textContent = 'Editar Cliente';
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const emailInput = document.getElementById('customerEmail');
    if (nameInput) nameInput.value = customer.name || '';
    if (phoneInput) phoneInput.value = customer.phone || '';
    if (emailInput) emailInput.value = customer.email || '';
    rememberActiveModal('newCustomerModal');
    const modal = document.getElementById('newCustomerModal');
    if (modal) modal.classList.add('active');
}
function deleteCustomer(id) {
    const customer = customers.find(c => String(c.id) === String(id));
    if (!customer) {
        showNotification('Cliente no encontrado', 'error');
        return;
    }
    const normalizedName = String(customer.name || '').trim().toLowerCase();
    const relatedOrders = orders.filter(o => String(o.customerName || '').trim().toLowerCase() === normalizedName);
    if (relatedOrders.length > 0) {
        showNotification('No puedes eliminar este cliente mientras tenga pedidos asociados.', 'warning');
        return;
    }
    if (confirm('¿Eliminar este cliente?')) {
        customers = customers.filter(c => String(c.id) !== String(id));
        saveData();
        renderAll();
        showNotification('Cliente eliminado', 'success');
    }
}
async function saveCustomer() {
    const name = document.getElementById('customerName').value.trim();
    if (!name) { showNotification('Ingresa el nombre del cliente', 'error'); return; }
    const phone = document.getElementById('customerPhone') ? document.getElementById('customerPhone').value.trim() : '';
    const email = document.getElementById('customerEmail').value.trim();
    if (editingCustomerId) {
        const customer = customers.find(c => String(c.id) === String(editingCustomerId));
        if (!customer) {
            showNotification('Cliente no encontrado', 'error');
            return;
        }
        const previousName = String(customer.name || '').trim();
        const previousPhone = String(customer.phone || '').trim();
        customer.name = name;
        customer.phone = phone;
        customer.email = email;
        const previousKey = previousName.toLowerCase();
        const relatedOrders = orders.filter(order => String(order.customerName || '').trim().toLowerCase() === previousKey);
        relatedOrders.forEach(order => {
            order.customerName = name;
            if (!order.customerPhone || String(order.customerPhone).trim() === previousPhone) order.customerPhone = phone;
        });
        coupons.forEach(coupon => {
            if (String(coupon.customerName || '').trim().toLowerCase() === previousKey) {
                coupon.customerName = name;
                if (!coupon.customerPhone || String(coupon.customerPhone).trim() === previousPhone) coupon.customerPhone = phone;
            }
        });
        try {
            await Promise.all(relatedOrders.map(order => persistOrderToDatabase(order)));
            await persistCustomerToDatabase(customer);
        } catch (error) {
            console.error(error);
            showNotification('No se pudieron actualizar los datos del cliente en Supabase.', 'error');
            return;
        }
        editingCustomerId = null;
        showNotification('Cliente actualizado correctamente', 'success');
    } else {
        const newCustomer = {
            id: Date.now(),
            name,
            phone,
            email,
            date: getTodayDateString()
        };
        customers.push(newCustomer);
        await persistCustomerToDatabase(newCustomer);
        showNotification('Cliente registrado', 'success');
    }
    saveData();
    closeModal('newCustomerModal');
    document.getElementById('customerForm').reset();
    const title = document.querySelector('#newCustomerModal .modal-header h2');
    if (title) title.textContent = 'Nuevo Cliente';
    renderAll();
}
function openNewCustomerModal() { 
    editingCustomerId = null;
    const form = document.getElementById('customerForm');
    if (form) form.reset();
    const title = document.querySelector('#newCustomerModal .modal-header h2');
    if (title) title.textContent = 'Nuevo Cliente';
    const modal = document.getElementById('newCustomerModal');
    if (modal) {
        rememberActiveModal('newCustomerModal');
        modal.classList.add('active');
    }
}
function renderFinance() {
    const financeOrders = orders.filter(order => !isCancelledOrder(order));
    const totalSold = financeOrders.reduce((s,o) => s + o.total, 0);
    const totalAdvance = financeOrders.reduce((s,o) => s + o.advance, 0);
    const pending = financeOrders.reduce((s,o) => s + o.remaining, 0);
    const paidCount = financeOrders.filter(o => o.paid).length;
    document.getElementById('finance-total').textContent = '$' + totalSold.toLocaleString();
    document.getElementById('finance-advance').textContent = '$' + totalAdvance.toLocaleString();
    document.getElementById('finance-pending').textContent = '$' + pending.toLocaleString();
    document.getElementById('finance-paid').textContent = paidCount;
    const tbody = document.getElementById('finance-table');
    if (tbody) {
        if (financeOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;">No hay movimientos registrados</td></tr>';
        } else {
            tbody.innerHTML = financeOrders.map(order => `
                <tr>
                    <td>${ticketEscape(order.date)}</td>
                    <td><strong>${ticketEscape(order.id)}</strong></td>
                    <td>${ticketEscape(order.customerName)}</td>
                    <td>Anticipo - Pedido</td>
                    <td style="color:#10b981;">+$${order.advance.toLocaleString()}</td>
                    <td><span class="payment-badge payment-${order.paid?'paid':order.advance>0?'partial':'pending'}">${order.paid?'Saldado':order.advance>0?'Con Anticipo':'Pendiente'}</span></td>
                </tr>
            `).join('');
        }
    }
}
function renderCharts() {
    const techniqueContainer = document.getElementById('technique-chart');
    const paymentContainer = document.getElementById('payment-chart');
    const chartOrders = orders.filter(order => !isCancelledOrder(order));
    if (techniqueContainer) {
        const techniques = {};
        chartOrders.forEach(o => { techniques[o.technique] = (techniques[o.technique] || 0) + (o.products ? o.products.reduce((s,p)=>s+p.qty,0) : 1); });
        const total = Object.values(techniques).reduce((a,b) => a + b, 0);
        if (total === 0) {
            techniqueContainer.innerHTML = '<div class="chart-placeholder">No hay datos suficientes</div>';
        } else {
            techniqueContainer.innerHTML = Object.entries(techniques).map(([tech, qty]) => {
                const percent = Math.round((qty / total) * 100);
                return `<div class="report-progress"><div class="label"><span>${ticketEscape(tech)}</span><span>${qty} prendas (${percent}%)</span></div><div class="bar"><div class="fill" style="width: ${percent}%; background: linear-gradient(135deg, #6366f1, #8b5cf6);"></div></div></div>`;
            }).join('');
        }
    }
    if (paymentContainer) {
        const paid = chartOrders.filter(o => o.paid).length;
        const partial = chartOrders.filter(o => !o.paid && o.advance > 0).length;
        const pending = chartOrders.filter(o => o.advance === 0).length;
        const total = chartOrders.length;
        if (total === 0) {
            paymentContainer.innerHTML = '<div class="chart-placeholder">No hay datos suficientes</div>';
        } else {
            paymentContainer.innerHTML = `
                <div class="report-progress"><div class="label"><span>✅ Saldados</span><span>${paid} (${Math.round((paid/total)*100)}%)</span></div><div class="bar"><div class="fill" style="width: ${(paid/total)*100}%; background: linear-gradient(135deg, #10b981, #059669);"></div></div></div>
                <div class="report-progress"><div class="label"><span>⏳ Con Anticipo</span><span>${partial} (${Math.round((partial/total)*100)}%)</span></div><div class="bar"><div class="fill" style="width: ${(partial/total)*100}%; background: linear-gradient(135deg, #3b82f6, #1d4ed8);"></div></div></div>
                <div class="report-progress"><div class="label"><span>⚠️ Pendientes</span><span>${pending} (${Math.round((pending/total)*100)}%)</span></div><div class="bar"><div class="fill" style="width: ${(pending/total)*100}%; background: linear-gradient(135deg, #f59e0b, #d97706);"></div></div></div>
            `;
        }
    }
}
function exportToExcel() {
    let csv = 'Fecha,Pedido,Cliente,Total,Anticipo,Restante,Estado,Pago\n';
    orders.forEach(order => {
        csv += [order.date, order.id, order.customerName, order.total, order.advance, order.remaining, normalizeOrderStatus(order.status), order.paid ? 'Saldado' : 'Pendiente']
            .map(value => `"${String(value ?? '').replace(/"/g, '""')}"`)
            .join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-${getTodayDateString()}.csv`;
    link.click();
    showNotification('Reporte descargado', 'success');
}
function clearAllData() {
    if (confirm('⚠️ ¿Eliminar los datos locales de este navegador? Esto NO borra registros guardados en Supabase y podrían volver a cargarse al sincronizar.')) {
        orders = [];
        customers = [];
        coupons = [];
        currentCouponForOrder = null;
        saveData();
        renderAll();
        showNotification('Datos locales eliminados en este navegador. Supabase no fue modificado.', 'warning');
    }
}
