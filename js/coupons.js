function isTestOrder(order) {
    return String(order && order.id || '').startsWith(TEST_DATA_PREFIX) ||
        String(order && order.customerName || '').includes('TEST');
}
function isTestCustomer(customer) {
    return String(customer && customer.name || '').includes('TEST');
}
function isTestCoupon(coupon) {
    return String(coupon && coupon.code || '').startsWith(TEST_COUPON_PREFIX) ||
        String(coupon && coupon.customerName || '').includes('TEST') ||
        String(coupon && coupon.id || '').startsWith(TEST_DATA_PREFIX);
}
function priceProductsForTest(products) {
    const totalsByType = products.reduce((map, product) => {
        const type = normalizeProductType(product.type);
        map[type] = (map[type] || 0) + (Number(product.qty) || 0);
        return map;
    }, {});
    return products.map(product => {
        const type = normalizeProductType(product.type);
        return {
            type,
            gender: product.gender || 'Caballero',
            color: product.color || 'Blanco',
            size: product.size || 'M',
            qty: Number(product.qty) || 1,
            price: getUnitPrice(type, totalsByType[type] || product.qty || 1),
            customPrice: false
        };
    });
}
function buildTestOrder(config) {
    const products = priceProductsForTest(config.products);
    const subtotal = products.reduce((sum, product) => sum + (product.qty * product.price), 0);
    const couponDiscount = config.couponCode ? Math.min(COUPON_FIXED_AMOUNT, subtotal) : 0;
    const total = Math.max(0, subtotal - couponDiscount);
    const advance = config.paid ? total : Math.min(total, Math.max(0, Math.round(total * (config.advanceRate ?? 0.7))));
    const totalQty = products.reduce((sum, product) => sum + product.qty, 0);
    const shirtCost = Number(config.shirtCost) || 100;
    const dtfCost = Number(config.dtfCost) || Math.round(totalQty * 35);
    const extraCosts = Number(config.extraCosts) || 0;
    const orderCosts = calculateOrderCosts(totalQty, shirtCost, dtfCost, extraCosts);

    return sanitizeOrder({
        id: config.id,
        customerName: config.customerName,
        customerPhone: config.customerPhone,
        date: normalizeDateValue(config.date),
        products,
        technique: 'DTF',
        subtotal,
        couponCode: config.couponCode || '',
        couponId: config.couponId || '',
        couponDiscount,
        total,
        totalQty,
        advance,
        remaining: total - advance,
        status: config.status,
        paid: Boolean(config.paid || advance >= total),
        shirtCost,
        dtfCost,
        extraCosts,
        costTotal: orderCosts.costTotal,
        netProfit: total - orderCosts.costTotal
    });
}
function buildTestOrders() {
    const today = getTodayDateString();
    return [
        buildTestOrder({ id: 'TEST-001', customerName: 'Cliente TEST 01', customerPhone: '+5216640000001', status: 'En espera de Anticipo', advanceRate: 0, products: [{ type: 'Playera Básica', qty: 1, color: 'Blanco', size: 'M' }], date: today }),
        buildTestOrder({ id: 'TEST-002', customerName: 'Cliente TEST 02', customerPhone: '+5216640000002', status: 'Pendiente', advanceRate: 0.5, products: [{ type: 'Playera Básica', qty: 5, color: 'Negro', size: 'L' }], date: today }),
        buildTestOrder({ id: 'TEST-003', customerName: 'Cliente TEST 03', customerPhone: '+5216640000003', status: 'En Producción', advanceRate: 0.7, products: [{ type: 'Playera Básica', qty: 6, color: 'Botella', size: 'M' }], date: today }),
        buildTestOrder({ id: 'TEST-004', customerName: 'Cliente TEST 04', customerPhone: '+5216640000004', status: 'Listo para Entregar', advanceRate: 0.4, products: [{ type: 'Playera Básica', qty: 11, color: 'Marino', size: 'XL' }], date: today }),
        buildTestOrder({ id: 'TEST-005', customerName: 'Cliente TEST 05', customerPhone: '+5216640000005', status: 'Entregado', paid: false, advanceRate: 0.7, couponCode: 'TEST100-APLICADO', couponId: 'TEST-CP-APLICADO', products: [{ type: 'Playera Básica', qty: 3, color: 'Rojo', size: 'M' }], date: today }),
        buildTestOrder({ id: 'TEST-006', customerName: 'Cliente TEST 06', customerPhone: '+5216640000006', status: 'Entregado', paid: true, products: [{ type: 'Playera Básica', qty: 24, color: 'Oxford', size: 'L' }], date: today }),
        buildTestOrder({ id: 'TEST-007', customerName: 'Cliente TEST 07', customerPhone: '+5216640000007', status: 'Entregado', advanceRate: 0.8, products: [{ type: 'Playera Básica', qty: 50, color: 'Negro', size: 'XL' }], date: today }),
        buildTestOrder({ id: 'TEST-008', customerName: 'Cliente TEST 08', customerPhone: '+5216640000008', status: 'En Producción', advanceRate: 0.5, products: [{ type: 'Camiseta tipo Polo', qty: 6, color: 'Blanco', size: 'L' }], date: today }),
        buildTestOrder({ id: 'TEST-009', customerName: 'Cliente TEST 09', customerPhone: '+5216640000009', status: 'Entregado', advanceRate: 0.7, products: [{ type: 'Hoodie', qty: 6, color: 'Negro', size: 'XL' }], date: today }),
        buildTestOrder({ id: 'TEST-010', customerName: 'Cliente TEST 10', customerPhone: '+5216640000010', status: 'Cancelado', advanceRate: 0, products: [{ type: 'Sudadera', qty: 5, color: 'Oxford', size: 'M' }], date: today }),
        buildTestOrder({ id: 'TEST-011', customerName: 'Cliente TEST 11', customerPhone: '+5216640000011', status: 'Entregado', paid: true, couponCode: 'TEST100-USADO', couponId: 'TEST-CP-USADO', products: [{ type: 'Dry Fit', qty: 3, color: 'Rey/Royal Blue', size: 'L' }], date: today }),
        buildTestOrder({ id: 'TEST-012', customerName: 'Cliente TEST 12', customerPhone: '+5216640000012', status: 'En espera de Anticipo', advanceRate: 0.3, products: [{ type: 'Playera Básica', qty: 3, color: 'Blanco', size: 'M' }, { type: 'Playera Básica', qty: 3, color: 'Negro', size: 'L' }, { type: 'Polo Niño', qty: 6, color: 'Marino', size: 'S' }], date: today })
    ].filter(Boolean);
}
function buildTestCoupons() {
    return [
        sanitizeCoupon({ id: 'TEST-CP-APLICADO', code: 'TEST100-APLICADO', customerName: 'Cliente TEST 05', customerPhone: '+5216640000005', orderId: 'TEST-005', discountAmount: COUPON_FIXED_AMOUNT, status: 'used', used: true, usedAt: new Date().toISOString(), usedOrderId: 'TEST-005', requirements: getDefaultCouponRequirements() }),
        sanitizeCoupon({ id: 'TEST-CP-USADO', code: 'TEST100-USADO', customerName: 'Cliente TEST 11', customerPhone: '+5216640000011', orderId: 'TEST-011', discountAmount: COUPON_FIXED_AMOUNT, status: 'used', used: true, usedAt: new Date().toISOString(), usedOrderId: 'TEST-011', requirements: getDefaultCouponRequirements() }),
        sanitizeCoupon({ id: 'TEST-CP-ACTIVO', code: 'TEST100-ACTIVO', customerName: 'Cliente TEST 12', customerPhone: '+5216640000012', orderId: 'TEST-012', discountAmount: COUPON_FIXED_AMOUNT, status: 'active', used: false, requirements: Object.fromEntries(Object.keys(getDefaultCouponRequirements()).map(key => [key, true])) }),
        sanitizeCoupon({ id: 'TEST-CP-PENDIENTE', code: 'TEST100-PENDIENTE', customerName: 'Cliente TEST 03', customerPhone: '+5216640000003', orderId: 'TEST-003', discountAmount: COUPON_FIXED_AMOUNT, status: 'pending', used: false, requirements: getDefaultCouponRequirements() })
    ].filter(Boolean);
}
async function removeTestData(options = {}) {
    const { ask = true, notify = true } = options;
    const testOrders = orders.filter(isTestOrder);
    const testCoupons = coupons.filter(isTestCoupon);
    const testCustomers = customers.filter(isTestCustomer);
    if (ask && !testOrders.length && !testCoupons.length && !testCustomers.length) {
        showNotification('No hay datos TEST para eliminar', 'info');
        return { removed: 0 };
    }
    if (ask && !confirm(`Eliminar ${testOrders.length} pedido(s), ${testCustomers.length} cliente(s) y ${testCoupons.length} cupón(es) TEST?`)) return { removed: 0, cancelled: true };

    for (const order of testOrders) {
        try {
            await deleteOrderFromDatabase(order.id);
        } catch (error) {
            console.warn('No se pudo eliminar pedido TEST en Supabase:', order.id, error);
        }
    }
    orders = orders.filter(order => !isTestOrder(order));
    customers = customers.filter(customer => !isTestCustomer(customer));
    coupons = coupons.filter(coupon => !isTestCoupon(coupon));
    saveData();
    renderAll();
    if (notify) showNotification('Datos TEST eliminados', 'success');
    return { removed: testOrders.length };
}
async function seedTestData() {
    if (!confirm('Esto cargará clientes, pedidos y cupones TEST identificados claramente. ¿Continuar?')) return;
    await removeTestData({ ask: false, notify: false });
    const testOrders = buildTestOrders();
    const testCoupons = buildTestCoupons();
    const persisted = [];
    try {
        for (const order of testOrders) {
            await persistOrderToDatabase(order);
            persisted.push(order.id);
        }
    } catch (error) {
        console.error(error);
        for (const orderId of persisted) {
            try { await deleteOrderFromDatabase(orderId); } catch (cleanupError) { console.warn(cleanupError); }
        }
        showNotification('No se pudieron guardar los datos TEST en Supabase.', 'error');
        return;
    }
    orders = [...testOrders, ...orders.filter(order => !isTestOrder(order))];
    coupons = [...testCoupons, ...coupons.filter(coupon => !isTestCoupon(coupon))];
    syncCustomersFromOrders();
    saveData();
    renderAll();
    showSection('orders');
    showNotification(`${testOrders.length} pedidos TEST cargados correctamente`, 'success');
}
async function deleteTestData() {
    await removeTestData({ ask: true, notify: true });
}
function buildProductListDocument(order) {
    const products = Array.isArray(order.products) && order.products.length > 0
        ? order.products
        : [{
            qty: order.qty || 1,
            type: order.type || 'Producto personalizado',
            color: order.color || 'N/A',
            size: order.size || 'N/A',
            gender: order.gender || 'N/A',
            price: order.unitPrice || order.total || 0
        }];

    const rows = products.map((product, index) => {
        const qty = Number(product.qty) || 0;
        const price = Number(product.price) || 0;
        const lineTotal = qty * price;
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${ticketEscape(product.type || 'Producto')}</strong></td>
                <td>${ticketEscape(product.color || 'N/A')}</td>
                <td>${ticketEscape(product.size || 'N/A')}</td>
                <td>${ticketEscape(product.gender || 'N/A')}</td>
                <td>${qty}</td>
                <td>${formatTicketMoney(price)}</td>
                <td>${formatTicketMoney(lineTotal)}</td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lista de productos - ${ticketEscape(order.id)}</title>
            <style>
                * { box-sizing: border-box; }
                body { margin: 0; padding: 24px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #f8fafc; }
                .sheet { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px; box-shadow: 0 12px 28px rgba(15,23,42,0.08); }
                header { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; margin-bottom: 22px; }
                h1 { margin: 0 0 6px; font-size: 28px; }
                p { margin: 4px 0; color: #64748b; }
                .meta { text-align: right; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                th, td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; vertical-align: top; }
                th { background: #f1f5f9; color: #334155; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
                tfoot td { font-weight: 800; background: #f8fafc; }
                .notes { margin-top: 24px; padding: 16px; border-radius: 12px; background: #f8fafc; color: #475569; font-size: 13px; line-height: 1.5; }
                @media print {
                    body { background: #fff; padding: 0; }
                    .sheet { box-shadow: none; border: 0; border-radius: 0; padding: 0; max-width: none; }
                }
                @media (max-width: 700px) {
                    body { padding: 12px; }
                    .sheet { padding: 18px; }
                    header { flex-direction: column; }
                    .meta { text-align: left; }
                    table { display: block; overflow-x: auto; white-space: nowrap; }
                }
            </style>
        </head>
        <body>
            <main class="sheet">
                <header>
                    <div>
                        <h1>Lista de productos</h1>
                        <p>Pedido ${ticketEscape(order.id)} - ${ticketEscape(order.customerName || 'Cliente')}</p>
                    </div>
                    <div class="meta">
                        <p><strong>Fecha:</strong> ${ticketEscape(order.date || '')}</p>
                        <p><strong>Técnica:</strong> ${ticketEscape(order.technique || 'DTF')}</p>
                        <p><strong>Estado:</strong> ${ticketEscape(order.status || '')}</p>
                    </div>
                </header>
                <table>
                    <thead>
                        <tr><th>#</th><th>Producto</th><th>Color</th><th>Talla</th><th>Género</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr><td colspan="5">Totales</td><td>${products.reduce((sum, product) => sum + (Number(product.qty) || 0), 0)}</td><td></td><td>${formatTicketMoney(order.total)}</td></tr>
                    </tfoot>
                </table>
                <div class="notes">
                    Usa esta lista para preparar producción, revisar tallas/colores y validar que el pedido esté completo antes de entrega.
                </div>
            </main>
        </body>
        </html>
    `;
}

function downloadProductList() {
    const order = getCurrentOrderForTicket();
    if (!order) return;

    const html = buildProductListDocument(order);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileId = String(order.id || 'pedido').replace(/[^a-z0-9-_]/gi, '-');
    link.href = url;
    link.download = `lista-productos-${fileId}.html`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Lista de productos descargada', 'success');
}

function getDefaultCouponRequirements() {
    return {
        photoUploaded: false,
        likedPost: false,
        commentedPost: false,
        sharedPost: false,
        screenshotSent: false
    };
}
const COUPON_REQUIREMENT_LABELS = {
    photoUploaded: 'Subió foto usando prenda Prin Epic',
    likedPost: 'Dio like a una publicación',
    commentedPost: 'Dejó comentario en publicación',
    sharedPost: 'Compartió una publicación',
    screenshotSent: 'Envió captura por WhatsApp'
};
function normalizePhoneForWhatsApp(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return '52' + digits;
    return digits;
}
function getCustomerPhoneByName(name) {
    const key = String(name || '').trim().toLowerCase();
    const customer = customers.find(c => String(c.name || '').trim().toLowerCase() === key);
    return customer ? customer.phone || '' : '';
}
function getOrderCouponEligibility(order) {
    if (!order || order.status !== 'Entregado') return false;
    if ((Number(order.total) || 0) < COUPON_MIN_PURCHASE) return false;
    if (hasWholesalePricing(order.products || [])) return false;
    if (hasCustomPromotionalPricing(order.products || [])) return false;
    return true;
}
function generateCouponCode() {
    let code = '';
    do {
        const random = Math.random().toString(36).slice(2, 8).toUpperCase();
        const stamp = new Date().getFullYear().toString().slice(-2);
        code = `PRI100-${random}${stamp}`;
    } while (coupons.some(coupon => coupon.code === code));
    return code;
}
function maybeCreateCouponFromOrder(order) {
    if (!getOrderCouponEligibility(order)) return null;
    const existing = coupons.find(coupon => coupon.orderId === order.id);
    if (existing) return existing;
    const coupon = sanitizeCoupon({
        id: `CP-${Date.now()}`,
        code: generateCouponCode(),
        customerName: order.customerName,
        customerPhone: order.customerPhone || getCustomerPhoneByName(order.customerName),
        orderId: order.id,
        discountType: 'fixed',
        discountAmount: COUPON_FIXED_AMOUNT,
        minPurchase: COUPON_MIN_PURCHASE,
        notStackableWithWholesale: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
        requirements: getDefaultCouponRequirements(),
        used: false
    });
    coupons.unshift(coupon);
    saveData();
    persistCouponToDatabase(coupon).catch(console.error);
    showNotification('Cupón pendiente generado para este cliente', 'success');
    return coupon;
}
function generateCouponForCurrentOrder() {
    const order = orders.find(item => item.id === currentOrderId);
    if (!order) return;
    if (!getOrderCouponEligibility(order)) {
        showNotification('El pedido debe estar entregado, ser de mínimo $600 y no tener mayoreo ni promociones', 'warning');
        return;
    }
    maybeCreateCouponFromOrder(order);
    saveData();
    renderAll();
    showSection('coupons');
    closeModal('orderDetailModal');
}
function validateCouponForOrder() {
    const input = document.getElementById('orderCouponCode');
    const message = document.getElementById('couponValidationMessage');
    const code = String(input ? input.value : '').trim().toUpperCase();
    const coupon = coupons.find(item => item.code === code);
    const couponValidation = getCouponValidation(coupon, getProductsFromForm());
    if (!couponValidation.valid) {
        currentCouponForOrder = null;
        if (message) {
            message.textContent = couponValidation.message;
            message.style.color = '#ef4444';
        }
        calculatePrices();
        showNotification(couponValidation.message, 'error');
        return;
    }
    currentCouponForOrder = coupon;
    if (input) input.value = coupon.code;
    if (message) {
        message.textContent = couponValidation.message;
        message.style.color = '#10b981';
    }
    calculatePrices();
    showNotification('Cupón aplicado correctamente', 'success');
}
function clearOrderCoupon() {
    currentCouponForOrder = null;
    const input = document.getElementById('orderCouponCode');
    const message = document.getElementById('couponValidationMessage');
    if (input) input.value = '';
    if (message) message.textContent = '';
    calculatePrices();
}
function markCouponAsUsed(couponId, orderId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    coupon.status = 'used';
    coupon.used = true;
    coupon.usedAt = new Date().toISOString();
    coupon.usedOrderId = orderId;
    saveData();
    persistCouponToDatabase(coupon).catch(console.error);
}
function toggleCouponRequirement(couponId, requirementKey, checked) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    coupon.requirements = { ...getDefaultCouponRequirements(), ...(coupon.requirements || {}) };
    coupon.requirements[requirementKey] = Boolean(checked);
    if (coupon.status === 'active' && !Object.values(coupon.requirements).every(Boolean)) coupon.status = 'pending';
    saveData();
    persistCouponToDatabase(coupon).catch(console.error);
    renderCoupons();
}
function activateCoupon(couponId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    coupon.requirements = { ...getDefaultCouponRequirements(), ...(coupon.requirements || {}) };
    if (!Object.values(coupon.requirements).every(Boolean)) {
        showNotification('Primero marca todos los requisitos como cumplidos', 'warning');
        return;
    }
    coupon.status = 'active';
    saveData();
    persistCouponToDatabase(coupon).catch(console.error);
    renderCoupons();
    showNotification('Cupón activado correctamente', 'success');
}
function copyCouponCode(code) {
    copyTextToClipboard(code, 'Código copiado');
}
function copyTextToClipboard(text, successMessage = 'Copiado correctamente') {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showNotification(successMessage, 'success'))
            .catch(() => fallbackCopyText(text, successMessage));
        return;
    }
    fallbackCopyText(text, successMessage);
}
function fallbackCopyText(text, successMessage) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showNotification(successMessage, 'success');
    } catch (error) {
        showNotification('No se pudo copiar el texto', 'error');
    }
    document.body.removeChild(textarea);
}
function getCouponStatusLabel(status) {
    return ({ pending: 'Pendiente', active: 'Activo', used: 'Usado', expired: 'Vencido' })[status] || 'Pendiente';
}
function buildCouponInvitationMessage(coupon) {
    return `¡Hola! 👋😄
Esperamos que estés disfrutando tu prenda de Prin Epic 👕🔥

Queremos agradecerte por tu compra y además darte la oportunidad de obtener un cupón de $100 MXN de descuento para tu próxima orden 🎉

Para participar solo necesitas entrar a nuestra página de Facebook:

https://www.facebook.com/printepic494

Y realizar los siguientes pasos:

✅ Subir una foto usando tu camiseta, hoodie o prenda de Prin Epic en nuestra página.
✅ Darle like a una publicación de la página.
✅ Dejar un comentario en tu publicación o en cualquier post de Prin Epic.
✅ Compartir una publicación de nuestra página.
✅ Enviarnos vía WhatsApp una captura de pantalla de la publicación que compartiste.

📲 Una vez que validemos los requisitos, te enviaremos tu cupón de descuento directamente por este medio.

⚠️ Importante:
• El cupón es personal e intransferible.
• Solo puede usarse una vez.
• Válido en compra mínima de $600 MXN.
• No acumulable con precios de mayoreo, promociones u otros descuentos.

¡Gracias por apoyar a Prin Epic! 💯🔥`;
}
function openWhatsAppMessage(phone, message) {
    const normalized = normalizePhoneForWhatsApp(phone);
    const base = normalized ? `https://wa.me/${normalized}` : 'https://wa.me/';
    window.open(`${base}?text=${encodeURIComponent(message)}`, '_blank');
}
function sendCouponInvitationWhatsApp(couponId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    openWhatsAppMessage(coupon.customerPhone, buildCouponInvitationMessage(coupon));
}
function showCouponInvitationMessage(couponId) {
    const messageBox = document.getElementById(`coupon-invitation-${couponId}`);
    if (!messageBox) return;
    messageBox.hidden = false;
    messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showNotification('Mensaje de invitación generado', 'success');
}
function copyCouponInvitationMessage(couponId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    copyTextToClipboard(buildCouponInvitationMessage(coupon), 'Mensaje copiado correctamente');
}
function buildCouponWhatsAppMessage(coupon) {
    return `¡Hola! 👋😄
Ya validamos tus requisitos y tu cupón de descuento está listo 🎉

Tu cupón es de $100 MXN de descuento para tu próxima compra en Prin Epic.

Código: ${coupon.code}

Condiciones:
• Compra mínima de $600 MXN.
• Válido una sola vez.
• Personal e intransferible.
• No acumulable con precios de mayoreo, promociones u otros descuentos.

¡Gracias por apoyar a Prin Epic! 👕🔥`;
}
function sendCouponWhatsApp(couponId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    if (coupon.status !== 'active') {
        showNotification('El cupón debe estar activo antes de enviarlo', 'warning');
        return;
    }
    openWhatsAppMessage(coupon.customerPhone, buildCouponWhatsAppMessage(coupon));
}
function buildCouponArt(coupon) {
    const logo = getTicketLogoSrc();
    return `
        <div class="coupon-art">
            <div class="coupon-art-watermark">${logo ? `<img src="${logo}" alt="">` : ''}</div>
            <div class="coupon-ticket">
                <h2>CUPÓN</h2>
                <h3>$100 MXN</h3>
                <h2>DE DESCUENTO</h2>
                <p>aplica este código para acceder al descuento en tu próxima compra:</p>
                <div class="coupon-art-code">${ticketEscape(coupon.code)}</div>
                <p class="coupon-art-small">${ticketEscape(coupon.customerName)} · ${getCouponStatusLabel(coupon.status)} · ${new Date(coupon.createdAt).toLocaleDateString('es-MX')}</p>
                <p class="coupon-art-small">Compra mínima $600 MXN. No acumulable con mayoreo.</p>
                <p class="coupon-art-small">Personal e intransferible. Válido una sola vez.</p>
            </div>
            <div class="coupon-facebook">www.facebook.com/printepic494</div>
        </div>
    `;
}
async function downloadCouponImage(couponId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    const host = document.createElement('div');
    host.className = 'coupon-preview-stage';
    host.innerHTML = buildCouponArt(coupon);
    document.body.appendChild(host);
    try {
        const canvas = await html2canvas(host.querySelector('.coupon-art'), { scale: 3, backgroundColor: '#202124', useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = `cupon-${coupon.code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showNotification('Cupón descargado como imagen', 'success');
    } catch (error) {
        console.error(error);
        showNotification('No se pudo descargar el cupón', 'error');
    } finally {
        host.remove();
    }
}
function openEditCoupon(couponId) {
    const coupon = coupons.find(item => item.id === couponId);
    if (!coupon) return;
    editingCouponId = coupon.id;
    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    };
    setValue('editCouponCustomerName', coupon.customerName);
    setValue('editCouponCustomerPhone', coupon.customerPhone);
    setValue('editCouponCode', coupon.code);
    setValue('editCouponDiscount', getCouponAmount(coupon));
    setValue('editCouponStatus', coupon.status || 'pending');
    setValue('editCouponOrderId', coupon.orderId);
    openModal('editCouponModal');
}
function saveCouponEdit() {
    const coupon = coupons.find(item => item.id === editingCouponId);
    if (!coupon) return;

    const getValue = id => {
        const element = document.getElementById(id);
        return element ? String(element.value || '').trim() : '';
    };
    const nextCode = getValue('editCouponCode').toUpperCase();
    if (!nextCode) {
        showNotification('El cupón necesita un código válido', 'warning');
        return;
    }
    if (coupons.some(item => item.id !== coupon.id && item.code === nextCode)) {
        showNotification('Ya existe otro cupón con ese código', 'error');
        return;
    }

    const nextStatus = getValue('editCouponStatus') || 'pending';
    coupon.customerName = getValue('editCouponCustomerName') || coupon.customerName;
    coupon.customerPhone = getValue('editCouponCustomerPhone');
    coupon.code = nextCode;
    coupon.discountType = 'fixed';
    coupon.discountAmount = COUPON_FIXED_AMOUNT;
    coupon.minPurchase = COUPON_MIN_PURCHASE;
    coupon.notStackableWithWholesale = true;
    coupon.status = ['pending', 'active', 'used', 'expired'].includes(nextStatus) ? nextStatus : 'pending';
    coupon.orderId = getValue('editCouponOrderId');
    coupon.used = coupon.status === 'used';
    if (coupon.used && !coupon.usedAt) coupon.usedAt = new Date().toISOString();
    if (!coupon.used) {
        coupon.usedAt = null;
        coupon.usedOrderId = '';
    }

    editingCouponId = null;
    saveData();
    persistCouponToDatabase(coupon).catch(console.error);
    closeModal('editCouponModal');
    renderCoupons();
    showNotification('Cupón actualizado correctamente', 'success');
}
function clearAllCoupons() {
    if (!coupons.length) {
        showNotification('No hay cupones para borrar', 'info');
        return;
    }
    const confirmed = window.confirm('¿Seguro que quieres borrar todos los cupones? Esta acción limpiará la ventana y eliminará la lista interna de cupones guardados.');
    if (!confirmed) return;
    coupons = [];
    currentCouponForOrder = null;
    editingCouponId = null;
    saveData();
    deleteAllCouponsFromDatabase().catch(console.error);
    renderCoupons();
    showNotification('Todos los cupones fueron borrados', 'success');
}
function renderCoupons() {
    const container = document.getElementById('coupons-container');
    if (!container) return;
    document.getElementById('coupon-active-count').textContent = coupons.filter(c => c.status === 'active').length;
    document.getElementById('coupon-pending-count').textContent = coupons.filter(c => c.status === 'pending').length;
    document.getElementById('coupon-used-count').textContent = coupons.filter(c => c.status === 'used' || c.used).length;
    if (!coupons.length) {
        container.innerHTML = '<div class="empty-state"><h3>No hay cupones generados</h3><p>Marca como entregado un pedido de mínimo $600 sin mayoreo ni promociones para generar un cupón pendiente.</p></div>';
        return;
    }
    container.innerHTML = coupons.map(coupon => {
        const req = { ...getDefaultCouponRequirements(), ...(coupon.requirements || {}) };
        const safeCouponId = jsStringEscape(coupon.id);
        const safeCouponCode = jsStringEscape(coupon.code);
        const couponBoxId = ticketEscape(coupon.id);
        const reqHtml = Object.entries(COUPON_REQUIREMENT_LABELS).map(([key, label]) => `
            <label class="coupon-req"><input type="checkbox" ${req[key] ? 'checked' : ''} onchange="toggleCouponRequirement('${safeCouponId}', '${jsStringEscape(key)}', this.checked)"> ${ticketEscape(label)}</label>
        `).join('');
        return `
            <article class="coupon-card">
                <div class="coupon-card-header"><div><h3>${ticketEscape(coupon.customerName || 'Cliente')}</h3><p style="color:#64748b;">Pedido ${ticketEscape(coupon.orderId || '-')}</p></div><span class="status-badge ${coupon.status === 'active' ? 'status-completed' : coupon.status === 'used' ? 'status-production' : 'status-pending'}">${getCouponStatusLabel(coupon.status)}</span></div>
                <div class="coupon-code-box">${ticketEscape(coupon.code)}</div>
                <div class="coupon-meta">
                    <div><strong>Descuento</strong>${formatTicketMoney(getCouponAmount(coupon))}</div>
                    <div><strong>Compra mínima</strong>${formatTicketMoney(getCouponMinimum(coupon))}</div>
                    <div><strong>No acumulable</strong>Mayoreo/promos</div>
                    <div><strong>Teléfono</strong>${ticketEscape(coupon.customerPhone || '-')}</div>
                    <div><strong>Generado</strong>${new Date(coupon.createdAt).toLocaleDateString('es-MX')}</div>
                    <div><strong>Usado</strong>${coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString('es-MX') : 'No'}</div>
                </div>
                <div class="coupon-requirements">${reqHtml}</div>
                <div class="coupon-message-box" id="coupon-invitation-${couponBoxId}" hidden>
                    <h4>Mensaje de invitación</h4>
                    <div class="coupon-message-text">${ticketEscape(buildCouponInvitationMessage(coupon))}</div>
                    <div class="coupon-message-actions">
                        <button class="btn btn-secondary btn-sm" onclick="copyCouponInvitationMessage('${safeCouponId}')">Copiar mensaje</button>
                    </div>
                </div>
                <div class="coupon-actions">
                    <button class="btn btn-secondary btn-sm" onclick="copyCouponCode('${safeCouponCode}')">Copiar código</button>
                    <button class="btn btn-secondary btn-sm" onclick="openEditCoupon('${safeCouponId}')">Editar</button>
                    <button class="btn btn-info btn-sm" onclick="showCouponInvitationMessage('${safeCouponId}')">Generar mensaje</button>
                    <button class="btn btn-success btn-sm" onclick="activateCoupon('${safeCouponId}')">Activar</button>
                    <button class="btn btn-primary btn-sm" onclick="downloadCouponImage('${safeCouponId}')">Descargar cupón</button>
                    <button class="btn btn-warning btn-sm" onclick="sendCouponWhatsApp('${safeCouponId}')">Enviar cupón</button>
                </div>
            </article>
        `;
    }).join('');
}
function searchDashboard(q) { renderDashboard(); }
