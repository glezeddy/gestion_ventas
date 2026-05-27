function getStoredSectionId() {
    const hashSection = window.location.hash ? window.location.hash.slice(1) : '';
    const savedSection = localStorage.getItem(LAST_ACTIVE_SECTION_KEY) || '';
    const candidate = hashSection || savedSection || DEFAULT_SECTION_ID;
    return document.getElementById(candidate) ? candidate : DEFAULT_SECTION_ID;
}
function rememberActiveSection(sectionId) {
    if (!document.getElementById(sectionId)) return;
    localStorage.setItem(LAST_ACTIVE_SECTION_KEY, sectionId);
    if (window.location.hash !== '#' + sectionId) {
        history.replaceState(null, '', '#' + sectionId);
    }
}
function rememberActiveModal(modalId) {
    if (modalId) localStorage.setItem(LAST_ACTIVE_MODAL_KEY, modalId);
    else localStorage.removeItem(LAST_ACTIVE_MODAL_KEY);
}
function restoreLastView() {
    const sectionId = getStoredSectionId();
    showSection(sectionId, null, { skipRender: true });
    const lastModal = localStorage.getItem(LAST_ACTIVE_MODAL_KEY);
    if (lastModal === 'newOrderModal') {
        setTimeout(openNewOrderModal, 0);
    }
}

// Autenticación
async function checkAuth() {
    const loginScreen = document.getElementById('loginScreen');
    const appContent = document.querySelector('.app');
    if (!isSupabaseReady()) {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContent) appContent.style.display = 'none';
        return;
    }
    const { data } = await supabaseClient.auth.getSession();
    const isLoggedIn = Boolean(data && data.session);
    if (!isLoggedIn) {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContent) appContent.style.display = 'none';
    } else {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appContent) appContent.style.display = 'flex';
        try {
            await loadDataFromDatabase();
            restoreLastView();
        } catch (error) {
            console.error(error);
            loadData();
            renderAll();
            restoreLastView();
            showNotification('No se pudo cargar Supabase. Se muestran datos locales.', 'warning');
        }
    }
}
async function attemptLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    if (!username || !password) {
        errorDiv.textContent = '⚠️ Por favor ingresa usuario y contraseña';
        errorDiv.style.display = 'block';
        return;
    }
    if (!isSupabaseReady()) {
        errorDiv.textContent = 'No se pudo inicializar Supabase.';
        errorDiv.style.display = 'block';
        return;
    }
    const { error } = await supabaseClient.auth.signInWithPassword({ email: username, password });
    if (!error) {
        document.getElementById('loginScreen').style.display = 'none';
        document.querySelector('.app').style.display = 'flex';
        await loadDataFromDatabase();
                restoreLastView();
        showNotification(`✅ Bienvenido, ${username}!`, 'success');
    } else {
        errorDiv.textContent = '❌ Correo o contraseña incorrectos';
        errorDiv.style.display = 'block';
        document.getElementById('loginPassword').value = '';
        const loginForm = document.getElementById('loginForm');
        loginForm.style.animation = 'shake 0.3s ease';
        setTimeout(() => { loginForm.style.animation = ''; }, 300);
    }
}
async function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        if (isSupabaseReady()) await supabaseClient.auth.signOut();
        orders = [];
        customers = [];
        document.querySelector('.app').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').style.display = 'none';
        showNotification('🔒 Sesión cerrada correctamente', 'warning');
    }
}

// Colores
function generateColorSelector(containerId, selectedColor = 'Blanco') {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = '';
    for (const [category, colors] of Object.entries(eurocottonColors)) {
        html += `<div class="color-category-group"><span class="color-category-title">${category}</span><div class="color-swatches">`;
        for (const [colorName, hexColor] of Object.entries(colors)) {
            const isHeather = category === 'Jaspe';
            const isSelected = colorName === selectedColor ? 'selected' : '';
            html += `<div class="color-swatch ${isHeather ? 'heather' : ''} ${isSelected}" style="background-color: ${hexColor};" data-color="${colorName}" title="${colorName}" onclick="selectEurocottonColor(this, '${colorName}', '${containerId}')"></div>`;
        }
        html += '</div></div>';
    }
    container.innerHTML = html;
}
function selectEurocottonColor(element, colorName, containerId) {
    document.querySelectorAll(`#${containerId} .color-swatch`).forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    const row = element.closest('.product-item');
    if (row) { row.querySelector('.product-color').value = colorName; }
}

