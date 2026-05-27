function ticketEscape(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[char]));
}

function jsStringEscape(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '')
        .replace(/\n/g, '\\n');
}

function normalizeOrderStatus(status) {
    const value = String(status || '').trim();
    if (value === 'Diseño Pendiente') return 'Pendiente';
    return value || 'En espera de Anticipo';
}

function isPendingOrderStatus(status) {
    return ['En espera de Anticipo', 'Pendiente', 'Diseño Pendiente'].includes(String(status || '').trim());
}

function getOrderStatusClass(status) {
    const normalizedStatus = normalizeOrderStatus(status);
    if (normalizedStatus === 'Entregado') return 'completed';
    if (normalizedStatus === 'Cancelado') return 'cancelled';
    if (['En Producción', 'Listo para Entregar'].includes(normalizedStatus)) return 'production';
    return 'pending';
}

function isCancelledOrder(order) {
    return normalizeOrderStatus(order && order.status) === 'Cancelado';
}

function formatTicketMoney(value) {
    return '$' + (Number(value) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCurrentOrderForTicket() {
    const order = orders.find(o => o.id === currentOrderId);
    if (!order) showNotification('No se encontró el pedido', 'error');
    return order;
}

function getTicketLogoSrc() {
    const sidebarLogo = document.querySelector('.logo-icon img');
    return sidebarLogo && sidebarLogo.src ? sidebarLogo.src : '';
}

function getTicketProductRows(order) {
    const products = Array.isArray(order.products) && order.products.length > 0
        ? order.products
        : [{
            qty: order.qty || 1,
            type: order.type || 'Producto',
            color: order.color || 'N/A',
            size: order.size || 'N/A',
            price: order.unitPrice || order.total || 0
        }];

    return products.map(product => {
        const qty = Number(product.qty) || 0;
        const price = Number(product.price) || 0;
        const lineTotal = qty * price;
        return `
            <div class="ticket-product-row">
                <div class="ticket-product-main">
                    <strong>${ticketEscape(qty)}x ${ticketEscape(product.type || 'Producto')}</strong>
                    <span>${ticketEscape(product.color || 'N/A')} / Talla ${ticketEscape(product.size || 'N/A')}</span>
                </div>
                <div class="ticket-product-price">
                    <span>${formatTicketMoney(price)} c/u</span>
                    <strong>${formatTicketMoney(lineTotal)}</strong>
                </div>
            </div>
        `;
    }).join('');
}

function getTicketStyles() {
    return `
        @page { size: auto; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #eef2f7; }
        .ticket-export-page { min-height: 100vh; padding: 18px; display: flex; align-items: flex-start; justify-content: center; background: #eef2f7; }
        .ticket { width: min(100%, 190mm); max-width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 14px 30px rgba(15,23,42,0.13); overflow-wrap: anywhere; }
        .ticket-header { text-align: center; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
        .ticket-logo { display: block; width: 104px; max-width: 48%; height: auto; max-height: 104px; object-fit: contain; margin: 0 auto 8px; }
        .ticket-brand { margin: 0; font-size: 22px; line-height: 1.1; letter-spacing: 0; color: #111827; }
        .ticket-subtitle { margin: 4px 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .ticket-section { padding: 12px 0; border-bottom: 1px dashed #cbd5e1; }
        .ticket-section:last-child { border-bottom: 0; padding-bottom: 0; }
        .ticket-info-row, .ticket-total-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; line-height: 1.35; margin-bottom: 7px; }
        .ticket-info-row:last-child, .ticket-total-row:last-child { margin-bottom: 0; }
        .ticket-info-row span:first-child, .ticket-total-row span:first-child { color: #64748b; }
        .ticket-info-row strong, .ticket-total-row strong { text-align: right; color: #0f172a; }
        .ticket-products-title { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #475569; }
        .ticket-product-row { display: grid; grid-template-columns: minmax(0, 1fr) max-content; gap: 12px; padding: 10px 0; border-top: 1px solid #f1f5f9; break-inside: avoid; page-break-inside: avoid; }
        .ticket-product-row:first-of-type { border-top: 0; padding-top: 0; }
        .ticket-product-main { min-width: 0; display: flex; flex-direction: column; gap: 3px; font-size: 12px; overflow-wrap: anywhere; }
        .ticket-product-main span { color: #64748b; font-size: 11px; }
        .ticket-product-price { min-width: 76px; display: flex; flex-direction: column; gap: 3px; text-align: right; font-size: 11px; color: #64748b; }
        .ticket-product-price strong { color: #0f172a; font-size: 12px; }
        .ticket-total-row.highlight { margin-top: 8px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 15px; }
        .ticket-total-row.highlight strong { color: #4f46e5; }
        .ticket-total-row.discount span { color: #334155; }
        .ticket-total-row.discount strong { color: #dc2626; }
        .ticket-total-row.muted span, .ticket-total-row.muted strong { color: #94a3b8; }
        .ticket-total-row.payable { font-weight: 800; }
        .ticket-terms { font-size: 10px; line-height: 1.45; color: #64748b; text-align: left; }
        .ticket-terms strong { display: block; text-align: center; color: #334155; margin-bottom: 5px; }
        .ticket-footer { text-align: center; font-size: 10px; color: #64748b; padding-top: 11px; }
        @media print {
            @page { size: auto; margin: 6mm; }
            html, body { width: 100%; min-width: 0; background: #fff; }
            body { display: block; margin: 0; }
            .ticket-export-page { width: 100%; min-height: auto; padding: 0; background: #fff; display: block; }
            .ticket { width: 100%; max-width: none; margin: 0; border: 0; border-radius: 0; box-shadow: none; padding: 8mm; }
            .ticket-header { padding-bottom: 14px; }
            .ticket-logo { width: 120px; max-height: 120px; }
            .ticket-brand { font-size: 26px; }
            .ticket-section { padding: 14px 0; }
            .ticket-product-row { grid-template-columns: minmax(0, 1fr) 120px; gap: 18px; padding: 12px 0; }
            .ticket-product-main { font-size: 13px; }
            .ticket-product-main span { font-size: 12px; }
            .ticket-product-price { min-width: 120px; font-size: 12px; }
            .ticket-product-price strong { font-size: 13px; }
            .ticket-info-row, .ticket-total-row { font-size: 13px; }
            .ticket-total-row.highlight { font-size: 16px; }
            .ticket-product-row, .ticket-section { break-inside: avoid; page-break-inside: avoid; }
        }
    `;
}

function getTicketTotals(order) {
    const subtotalOriginal = Math.max(0, Number(order.subtotal) || Number(order.total) || 0);
    const couponDiscount = Math.max(0, Number(order.couponDiscount) || 0);
    const couponCode = String(order.couponCode || '').trim().toUpperCase();
    const finalTotal = Math.max(0, Number(order.total) || subtotalOriginal - couponDiscount);

    return {
        subtotalOriginal,
        couponDiscount,
        couponCode,
        finalTotal,
        hasCoupon: Boolean(couponCode || couponDiscount > 0)
    };
}

function buildTicketMarkup(order) {
    const logoSrc = getTicketLogoSrc();
    const safeId = ticketEscape(order.id);
    const safeDate = ticketEscape(normalizeDateValue(order.date));
    const totals = getTicketTotals(order);
    const discountLabel = totals.hasCoupon
        ? 'Cupón $100 MXN aplicado'
        : 'Cupón $100 MXN No aplica';
    const discountRowClass = totals.hasCoupon ? 'discount' : 'muted';
    const discountAmount = totals.hasCoupon ? `-${formatTicketMoney(totals.couponDiscount)}` : formatTicketMoney(0);
    return `
        <article class="ticket" aria-label="Ticket de pedido ${safeId}">
            <header class="ticket-header">
                ${logoSrc ? `<img class="ticket-logo" src="${logoSrc}" alt="Prin Epic Logo">` : ''}
                <h1 class="ticket-brand">PRIN EPIC</h1>
                <p class="ticket-subtitle">Comprobante de pedido</p>
            </header>
            <section class="ticket-section">
                <div class="ticket-info-row"><span>Pedido</span><strong>${safeId}</strong></div>
                <div class="ticket-info-row"><span>Cliente</span><strong>${ticketEscape(order.customerName)}</strong></div>
                <div class="ticket-info-row"><span>Fecha</span><strong>${safeDate}</strong></div>
                <div class="ticket-info-row"><span>Técnica</span><strong>${ticketEscape(order.technique || 'DTF')}</strong></div>
                <div class="ticket-info-row"><span>Estado</span><strong>${ticketEscape(order.status)}</strong></div>
            </section>
            <section class="ticket-section">
                <h2 class="ticket-products-title">Productos</h2>
                ${getTicketProductRows(order)}
            </section>
            <section class="ticket-section">
                <div class="ticket-total-row"><span>Subtotal original</span><strong>${formatTicketMoney(totals.subtotalOriginal)}</strong></div>
                <div class="ticket-total-row ${discountRowClass}"><span>${discountLabel}</span><strong>${discountAmount}</strong></div>
                ${totals.hasCoupon ? `<div class="ticket-total-row"><span>Código aplicado</span><strong>${ticketEscape(totals.couponCode || 'aplicado')}</strong></div>` : ''}
                <div class="ticket-total-row payable"><span>Subtotal a pagar</span><strong>${formatTicketMoney(totals.finalTotal)}</strong></div>
                <div class="ticket-total-row"><span>Anticipo</span><strong>${formatTicketMoney(order.advance)}</strong></div>
                <div class="ticket-total-row highlight"><span>Saldo restante</span><strong>${formatTicketMoney(order.remaining)}</strong></div>
            </section>
            <section class="ticket-section ticket-terms">
                <strong>Términos y condiciones</strong>
                No se aceptan cambios ni devoluciones en prendas personalizadas.<br>
                El tiempo de entrega inicia tras confirmar el anticipo.<br>
                Toda prenda debe liquidarse para su entrega. Conserve este ticket para cualquier aclaración.
            </section>
            <footer class="ticket-footer">
                Gracias por tu confianza<br>
                ${ticketEscape(new Date().toLocaleString('es-MX'))}
            </footer>
        </article>
    `;
}

function buildTicketDocument(order) {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket - ${ticketEscape(order.id)}</title>
            <style>${getTicketStyles()}</style>
        </head>
        <body><main class="ticket-export-page">${buildTicketMarkup(order)}</main></body>
        </html>
    `;
}

function printTicket() {
    const order = getCurrentOrderForTicket();
    if (!order) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Por favor permite las ventanas emergentes para imprimir', 'error');
        return;
    }

    printWindow.document.open();
    printWindow.document.write(buildTicketDocument(order));
    printWindow.document.close();
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    };
}

async function renderTicketCanvas(order) {
    if (typeof html2canvas !== 'function') {
        throw new Error('html2canvas no está disponible');
    }

    const exportScale = 4;
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-9999px';
    host.style.top = '0';
    host.style.width = '420px';
    host.style.zIndex = '-1';
    host.style.background = '#ffffff';
    host.innerHTML = `<style>${getTicketStyles()}</style><main class="ticket-export-page">${buildTicketMarkup(order)}</main>`;
    document.body.appendChild(host);

    const target = host.querySelector('.ticket');
    const images = Array.from(host.querySelectorAll('img'));
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
    })));

    const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        scale: exportScale,
        useCORS: true,
        logging: false
    });
    host.remove();
    return canvas;
}

async function downloadTicket() {
    const order = getCurrentOrderForTicket();
    if (!order) return;

    try {
        const canvas = await renderTicketCanvas(order);
        const link = document.createElement('a');
        const fileId = String(order.id || 'pedido').replace(/[^a-z0-9-_]/gi, '-');
        link.download = `ticket-${fileId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showNotification('Ticket descargado correctamente', 'success');
    } catch (error) {
        console.error(error);
        showNotification('No se pudo descargar el ticket', 'error');
    }
}

function buildWhatsAppTicketMessage(order) {
    const products = Array.isArray(order.products) && order.products.length > 0
        ? order.products.map(product => `• ${product.qty || 0}x ${product.type || 'Producto'} ${product.color || ''} talla ${product.size || ''} - ${formatTicketMoney((Number(product.qty) || 0) * (Number(product.price) || 0))}`).join('\n')
        : '• Producto personalizado';
    const totals = getTicketTotals(order);
    const discountLine = totals.hasCoupon
        ? `Cupón $100 MXN aplicado: -${formatTicketMoney(totals.couponDiscount)}\nCódigo aplicado: ${totals.couponCode || 'aplicado'}`
        : `Cupón $100 MXN No aplica: ${formatTicketMoney(0)}`;

    return `Hola ${order.customerName || ''}, te comparto el resumen de tu pedido Prin Epic:\n\nPedido: ${order.id}\nFecha: ${order.date || ''}\nEstado: ${order.status || ''}\n\nProductos:\n${products}\n\nSubtotal original: ${formatTicketMoney(totals.subtotalOriginal)}\n${discountLine}\nSubtotal a pagar: ${formatTicketMoney(totals.finalTotal)}\nAnticipo: ${formatTicketMoney(order.advance)}\nSaldo restante: ${formatTicketMoney(order.remaining)}\n\nTambién puedo enviarte la imagen del ticket si la necesitas.`;
}

async function shareTicketWhatsApp() {
    const order = getCurrentOrderForTicket();
    if (!order) return;

    const message = buildWhatsAppTicketMessage(order);

    try {
        if (navigator.share && navigator.canShare && window.File) {
            const canvas = await renderTicketCanvas(order);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const fileId = String(order.id || 'pedido').replace(/[^a-z0-9-_]/gi, '-');
                const file = new File([blob], `ticket-${fileId}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: `Ticket ${order.id}`, text: message, files: [file] });
                    showNotification('Ticket listo para compartir', 'success');
                    return;
                }
            }
        }
    } catch (error) {
        console.warn('No se pudo compartir archivo directamente; se usará WhatsApp con texto.', error);
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    showNotification('WhatsApp abierto con el mensaje del ticket', 'success');
}
