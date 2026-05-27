const CALCULATOR_INPUT_IDS = ['tipo', 'cantidad', 'precio', 'dtf', 'camiseta', 'otros'];
const margenMinimoDeseado = 30;
const ANTICIPO_BASE = 70;

function getCalculatorElement(id) {
    return document.getElementById(id);
}

function getCalculatorNumber(id) {
    const element = getCalculatorElement(id);
    return element ? parseFloat(element.value) || 0 : 0;
}

function formatCurrency(value) {
    return '$' + (Number(value) || 0).toFixed(2);
}

function setCalculatorText(id, value) {
    const element = getCalculatorElement(id);
    if (element) element.textContent = value;
}

function getGarmentLabel(type) {
    if (type === 'basica') return 'Playera básica';
    if (type === 'polo') return 'Polo';
    if (type === 'dryfit') return 'Dry Fit';
    if (type === 'hoodie') return 'Hoodie';
    return 'Prenda personalizada';
}

function obtenerPrecio(tipo, cantidad) {
    const productType = mapCalculatorTypeToOrderType(tipo);
    return getUnitPrice(productType, cantidad);
}

function updateCalculatorVisualState(state) {
    const gaugeFill = getCalculatorElement('gauge-fill');
    const alertBox = getCalculatorElement('calc-alert-box');
    const alertTitle = getCalculatorElement('calc-alert-title');
    const marginBox = getCalculatorElement('alerta-margen-bajo');
    const marginTitle = getCalculatorElement('alerta-margen-title');
    const gradients = {
        green: 'linear-gradient(135deg, #10b981, #059669)',
        yellow: 'linear-gradient(135deg, #f59e0b, #d97706)',
        red: 'linear-gradient(135deg, #ef4444, #dc2626)'
    };

    if (gaugeFill) gaugeFill.style.background = gradients[state] || gradients.green;

    if (alertBox) {
        alertBox.className = 'calc-accent-box' + (state === 'yellow' ? ' warning' : '');
        if (state === 'red') {
            alertBox.style.background = 'linear-gradient(135deg, #fef2f2, #fee2e2)';
            alertBox.style.borderColor = '#fca5a5';
        } else {
            alertBox.style.background = '';
            alertBox.style.borderColor = '';
        }
    }

    if (marginBox) {
        marginBox.className = 'calc-accent-box' + (state === 'green' ? '' : ' warning');
        if (state === 'red') {
            marginBox.style.background = 'linear-gradient(135deg, #fef2f2, #fee2e2)';
            marginBox.style.borderColor = '#fca5a5';
        } else {
            marginBox.style.background = '';
            marginBox.style.borderColor = '';
        }
    }

    if (alertTitle) alertTitle.textContent = state === 'red' ? 'Revisa tu precio' : state === 'yellow' ? 'Margen ajustado' : 'Negocio saludable';
    if (marginTitle) marginTitle.textContent = state === 'green' ? 'Margen recomendado' : 'Margen bajo';
}

function calculateIntegratedCalculator() {
    
	const productGrids = document.querySelectorAll('#calc-products-container .form-grid');

let totalPedido = 0;
let totalCantidad = 0;
let totalCostoCamisetas = 0;
let totalDTF = 0;
let totalOtros = 0;
let hasManualPrice = false;

    productGrids.forEach((grid, index) => {

    const tipoSelect = grid.querySelector('select[id^="tipo"]');
    const cantidadInput = grid.querySelector('input[id^="cantidad"]');
    const precioInput = grid.querySelector('input[id^="precio"]');
    const dtfInput = grid.querySelector('input[id^="dtf"]');
    const camisetaInput = grid.querySelector('input[id^="camiseta"]');
    const otrosInput = grid.querySelector('input[id^="otros"]');

    if (!tipoSelect || !cantidadInput || !precioInput) return;

    const tipo = tipoSelect.value;

    const cantidad = Math.max(1, Number(cantidadInput.value) || 1);

    if (String(cantidadInput.value).trim() === '' || Number(cantidadInput.value) < 1) {
        cantidadInput.value = cantidad;
    }

    const precioAuto = obtenerPrecio(tipo, cantidad);

    const precioManual = Number(precioInput.value) || 0;

    const useAutoPrice = precioManual <= 0;
    if (!useAutoPrice) hasManualPrice = true;

    const precio = useAutoPrice ? precioAuto : precioManual;

    if (useAutoPrice) {
        precioInput.value = precioAuto ? precioAuto.toFixed(2) : '';
        precioInput.dataset.auto = 'true';
    } else {
        precioInput.dataset.auto = 'false';
    }

    const dtf = Number(dtfInput?.value) || 0;

    const camiseta = Number(camisetaInput?.value) || 0;

    const otros = Number(otrosInput?.value) || 0;

    const costoCamisetas = camiseta * cantidad;

    const costoDTF = dtf;

    const otrosGastos = otros;

    const subtotal = precio * cantidad;

    totalCantidad += cantidad;

    totalPedido += subtotal;

    totalCostoCamisetas += costoCamisetas;

    totalDTF += costoDTF;

    totalOtros += otrosGastos;

});

const costoTotalPedido = totalCostoCamisetas + totalDTF + totalOtros;

const costoBaseMargen = totalCantidad > 0 ? costoTotalPedido / totalCantidad : 0;

const gananciaTotal = totalPedido - costoTotalPedido;

const ganancia = totalCantidad > 0 ? gananciaTotal / totalCantidad : 0;

const margen = totalPedido > 0 ? (gananciaTotal / totalPedido) * 100 : 0;

const precioMinimo = costoBaseMargen > 0 ? costoBaseMargen / (1 - margenMinimoDeseado / 100) : 0;

const anticipoMinimo = totalPedido > 0 ? Math.min(Math.ceil((costoTotalPedido / totalPedido) * 100), 100) : 0;

const anticipoRecomendado = totalPedido > 0 ? Math.max(ANTICIPO_BASE, Math.min(anticipoMinimo + 5, 100)) : 0;

const anticipoPorPieza = totalCantidad > 0 ? totalPedido * (anticipoRecomendado / 100) / totalCantidad : 0;

const anticipoTotal = totalPedido * (anticipoRecomendado / 100);

const gastoCubiertoConAnticipo = Math.min(anticipoTotal, costoTotalPedido);

const restante = totalPedido - anticipoTotal;

    setCalculatorText('calc-precio-auto', formatCurrency(totalPedido > 0 ? totalPedido / totalCantidad : 0));
    setCalculatorText('mini-camisetas-total', formatCurrency(totalCostoCamisetas));
    setCalculatorText('mini-dtf-total', formatCurrency(totalDTF));
    setCalculatorText('mini-otros-total', formatCurrency(totalOtros));
    setCalculatorText('mini-costo-total', formatCurrency(costoTotalPedido));
    setCalculatorText('mini-costo-anticipo', formatCurrency(gastoCubiertoConAnticipo));
    setCalculatorText('mini-ganancia-total', formatCurrency(gananciaTotal));
    setCalculatorText('mini-pct', totalPedido > 0 ? margen.toFixed(1) + '%' : '0.0%');
    setCalculatorText('r-costo', formatCurrency(costoTotalPedido));
    setCalculatorText('r-ganancia', formatCurrency(ganancia));
    setCalculatorText('r-pct', totalPedido > 0 ? margen.toFixed(1) + '%' : '0.0%');
    setCalculatorText('r-margen', totalPedido > 0 ? margen.toFixed(1) + '%' : '0.0%');
    setCalculatorText('r-ganancia-total', formatCurrency(gananciaTotal));
    setCalculatorText('r-total', formatCurrency(totalPedido));
    setCalculatorText('r-total-sub', totalCantidad + ' pieza(s)');
    setCalculatorText('r-precio-min', formatCurrency(precioMinimo));
    setCalculatorText('r-precio-min-sub', precioMinimo > 0 ? 'Para lograr ' + margenMinimoDeseado + '% de margen.' : 'Con tus costos actuales.');
    setCalculatorText('r-ant-min', anticipoMinimo + '%');
    setCalculatorText('r-ant-rec', anticipoRecomendado + '%');
    setCalculatorText('r-ant-pesos', formatCurrency(anticipoPorPieza));
    setCalculatorText('r-ant-pesos-sub', 'por pieza');
    setCalculatorText('r-ant-total', formatCurrency(anticipoTotal));
    setCalculatorText('gauge-mid', anticipoRecomendado + '%');
    setCalculatorText('alerta-margen-valor', 'Precio sugerido: ' + formatCurrency(precioMinimo));
    setCalculatorText('calc-restante-badge', 'Restante: ' + formatCurrency(restante));

	let productosTexto = '';

productGrids.forEach((grid) => {

    const tipoSelect = grid.querySelector('select[id^="tipo"]');
    const cantidadInput = grid.querySelector('input[id^="cantidad"]');
    const precioInput = grid.querySelector('input[id^="precio"]');

    if (!tipoSelect || !cantidadInput || !precioInput) return;

    const tipo = tipoSelect.options[tipoSelect.selectedIndex].text;
    const cantidad = Number(cantidadInput.value) || 0;
    const precio = Number(precioInput.value) || 0;

    const subtotal = cantidad * precio;

    productosTexto += `
👕 Prenda: ${tipo}
📦 Cantidad: ${cantidad} pieza(s)
💲 Subtotal: ${formatCurrency(subtotal)}

`;
});

const mensaje = `
🧾 *Cotización de pedido*

${productosTexto}
💰 Total: ${formatCurrency(totalPedido)}
💵 Anticipo (${anticipoRecomendado}%): ${formatCurrency(anticipoTotal)}
💳 Restante: ${formatCurrency(restante)}

✅ Para iniciar el pedido se requiere el anticipo.
`;

const copyMsg = document.getElementById('copy-msg');

if (copyMsg) {
    copyMsg.textContent = mensaje;
}

    const gaugeFill = getCalculatorElement('gauge-fill');
    if (gaugeFill) gaugeFill.style.width = anticipoRecomendado + '%';

    const priceSource = getCalculatorElement('calc-price-source');
    if (priceSource) {
        priceSource.textContent = hasManualPrice ? 'Precio manual' : 'Precio por tabulador';
        priceSource.style.background = hasManualPrice ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)';
        priceSource.style.color = hasManualPrice ? '#1e40af' : '#166534';
    }

    const gananciaEl = getCalculatorElement('r-ganancia-total');
    if (gananciaEl) {
        gananciaEl.style.color = gananciaTotal < 0 ? '#dc2626' : gananciaTotal === 0 ? '#475569' : '#059669';
    }

    let state = 'green';
    let alertMessage = 'El anticipo sugerido cubre costos y deja margen de seguridad.';
    let marginMessage = 'Tu precio actual ya protege el margen recomendado.';

    if (totalPedido <= 0 || gananciaTotal < 0 || anticipoTotal < costoTotalPedido) {
        state = 'red';
        alertMessage = 'El precio actual no cubre bien los costos o está dejando pérdida.';
        marginMessage = 'Sube tu precio o reduce costos antes de confirmar el pedido.';
    } else if (margen < margenMinimoDeseado) {
        state = 'yellow';
        alertMessage = 'El pedido cubre costos, pero el margen todavía está apretado.';
        marginMessage = 'Conviene cobrar al menos ' + formatCurrency(precioMinimo) + ' por pieza para llegar al margen meta.';
    }

    updateCalculatorVisualState(state);
    setCalculatorText('alerta-msg', alertMessage);
    setCalculatorText('alerta-margen-msg', marginMessage);

    syncDatosPedido();
}

function resetIntegratedCalculator() {
    CALCULATOR_INPUT_IDS.forEach(id => {
        const element = getCalculatorElement(id);
        if (!element) return;
        if (id === 'tipo') {
            element.value = 'basica';
        } else if (id === 'cantidad') {
            element.value = '1';
        } else {
            element.value = '';
        }
    });
    calculateIntegratedCalculator();
}

function copyIntegratedCalculatorMessage() {
    const copyMsg = getCalculatorElement('copy-msg');
    const button = getCalculatorElement('btn-copy');
    if (!copyMsg) return;

    const text = copyMsg.dataset.copy || copyMsg.textContent || '';
    const onCopied = () => {
        if (!button) return;
        const original = button.innerHTML;
        button.textContent = 'Copiado';
        setTimeout(() => {
            button.innerHTML = original;
        }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onCopied);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    onCopied();
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.app').style.display = 'none';
    checkAuth();
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    initDashboardDateControls();
    const loginPassword = document.getElementById('loginPassword');
    const loginUsername = document.getElementById('loginUsername');
    if (loginPassword) loginPassword.addEventListener('keypress', function(e) { if (e.key === 'Enter') attemptLogin(); });
    if (loginUsername) loginUsername.addEventListener('keypress', function(e) { if (e.key === 'Enter') attemptLogin(); });
    
    CALCULATOR_INPUT_IDS.forEach(id => {
        const element = getCalculatorElement(id);
        if (!element) return;
        element.addEventListener('input', calculateIntegratedCalculator);
        element.addEventListener('change', calculateIntegratedCalculator);
    });

    const copyButton = getCalculatorElement('btn-copy');
    if (copyButton) copyButton.addEventListener('click', copyIntegratedCalculatorMessage);

    const clearButton = getCalculatorElement('btn-limpiar-calculadora');
    if (clearButton) clearButton.addEventListener('click', resetIntegratedCalculator);

    calculateIntegratedCalculator();
});

let calcProductCounter = 1;

function addCalcProduct() {
    calcProductCounter++;

    const container = document.getElementById('calc-products-container');
    if (!container) return;

    const firstProductBlock = container.querySelector('.calc-product-block');
    if (!firstProductBlock) return;

    const clone = firstProductBlock.cloneNode(true);

    clone.querySelectorAll('input, select').forEach(element => {
        if (element.id) {
            element.id = element.id + '-' + calcProductCounter;
        }

        if (element.tagName === 'INPUT' && element.type === 'number') {
            element.value = element.id.includes('cantidad') ? 1 : 0;
        } else if (element.tagName === 'SELECT') {
            element.selectedIndex = 0;
        }

        element.addEventListener('input', calculateIntegratedCalculator);
        element.addEventListener('change', calculateIntegratedCalculator);
    });

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger';
    removeButton.style.marginTop = '15px';
    removeButton.innerHTML = 'Eliminar producto';
    removeButton.onclick = function () {
        clone.remove();
        calculateIntegratedCalculator();
    };

    clone.appendChild(removeButton);
    container.appendChild(clone);
    calculateIntegratedCalculator();
}

