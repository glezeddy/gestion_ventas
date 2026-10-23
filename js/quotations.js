/* Prin Epic - módulo independiente de cotizaciones */
let quotationOrderId = null;

const QUOTATION_DEFAULT_CONDITIONS = [
    'Precios expresados en MXN.',
    'No se aceptan cambios ni devoluciones en prendas personalizadas.',
    'El pedido inicia al confirmar el anticipo.',
    'El saldo debe liquidarse antes de la entrega.'
];
const QUOTATION_DEFAULT_TERMS = [
    'No se aceptan cambios ni devoluciones en prendas personalizadas.',
    'El tiempo de entrega inicia tras confirmar el anticipo.',
    'Toda prenda debe liquidarse para su entrega. Conserve esta cotización para cualquier aclaración.'
];

function quotationMoney(value) {
    return `$${(Number(value) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function quotationEscape(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function getQuotationOrder() {
    const id = quotationOrderId || document.getElementById('quotationOrderId')?.value || currentOrderId;
    return orders.find(order => order.id === id) || null;
}

function getQuotationSubtitle(order) {
    const types = [...new Set((order.products || []).map(product => product.type).filter(Boolean))];
    const type = String(types[0] || '').toLowerCase();
    if (types.length === 1 && /(playera|camiseta|polo|dry fit)/.test(type)) return 'PLAYERAS PERSONALIZADAS';
    if (types.length === 1 && /hoodie/.test(type)) return 'HOODIES PERSONALIZADOS';
    return 'PRODUCTOS PERSONALIZADOS';
}

function getQuotationSizes(order) {
    const sizes = new Map();
    (order.products || []).forEach(product => {
        const size = product.size || 'Sin talla';
        sizes.set(size, (sizes.get(size) || 0) + (Number(product.qty) || 0));
    });
    return [...sizes.entries()].map(([size, qty]) => ({ size, qty }));
}

function updateQuotationSummary(order) {
    const total = Number(order.total) || 0;
    const advance = Math.min(total, Math.max(0, Number(order.advance) || 0));
    const productCount = (order.products || []).reduce((sum, product) => sum + (Number(product.qty) || 0), 0);
    document.getElementById('quotationProductsSummary').textContent = `${productCount} pieza${productCount === 1 ? '' : 's'}`;
    document.getElementById('quotationTotal').textContent = quotationMoney(total);
    document.getElementById('quotationAdvance').textContent = quotationMoney(advance);
    document.getElementById('quotationRemaining').textContent = quotationMoney(total - advance);
}

function ensureQuotationTermsField() {
    let field = document.getElementById('quotationTerms');
    if (field) return field;
    const conditions = document.getElementById('quotationConditions');
    if (!conditions || !conditions.parentElement) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group full-width';
    wrapper.innerHTML = '<label for="quotationTerms">Términos y condiciones generales</label><textarea id="quotationTerms" rows="4" placeholder="Términos generales de PRIN EPIC"></textarea>';
    conditions.parentElement.insertAdjacentElement('afterend', wrapper);
    return document.getElementById('quotationTerms');
}

function openQuotationModal() {
    const order = orders.find(item => item.id === currentOrderId);
    if (!order) {
        showNotification('Selecciona un pedido antes de crear una cotización.', 'error');
        return;
    }
    quotationOrderId = order.id;
    document.getElementById('quotationOrderId').value = order.id;
    document.getElementById('quotationCustomerName').value = order.customerName || '';
    document.getElementById('quotationDate').value = getTodayDateString();
    document.getElementById('quotationValidityDays').value = 7;
    document.getElementById('quotationTechnique').value = order.technique || '';
    document.getElementById('quotationSubtitle').value = getQuotationSubtitle(order);
    document.getElementById('quotationPersonalization').value = '';
    document.getElementById('quotationPrintLocation').value = '';
    document.getElementById('quotationDeliveryTime').value = 'Se confirma al recibir el anticipo';
    document.getElementById('quotationDeliveryMethod').value = 'Entrega personal acordada con el cliente';
    document.getElementById('quotationNotes').value = '';
    document.getElementById('quotationConditions').value = QUOTATION_DEFAULT_CONDITIONS.join('\n');
    const termsField = ensureQuotationTermsField();
    if (termsField) termsField.value = QUOTATION_DEFAULT_TERMS.join('\n');
    updateQuotationSummary(order);
    document.getElementById('quotationModal').classList.add('active');
}

function readQuotationDraft() {
    const order = getQuotationOrder();
    if (!order) throw new Error('No se encontró el pedido de origen.');
    const customerName = document.getElementById('quotationCustomerName').value.trim();
    const validityDays = Math.max(1, Number(document.getElementById('quotationValidityDays').value) || 0);
    if (!customerName) throw new Error('Ingresa el nombre del cliente o empresa.');
    if (!(order.products || []).length) throw new Error('El pedido no contiene productos para cotizar.');
    const total = Math.max(0, Number(order.total) || 0);
    const advance = Math.min(total, Math.max(0, Number(order.advance) || 0));
    return {
        order,
        customerName,
        customerPhone: order.customerPhone || '',
        quoteDate: document.getElementById('quotationDate').value || getTodayDateString(),
        validityDays,
        subtitle: document.getElementById('quotationSubtitle').value.trim() || 'PRODUCTOS PERSONALIZADOS',
        technique: document.getElementById('quotationTechnique').value.trim() || 'No especificada',
        personalization: document.getElementById('quotationPersonalization').value.trim(),
        printLocation: document.getElementById('quotationPrintLocation').value.trim(),
        deliveryTime: document.getElementById('quotationDeliveryTime').value.trim(),
        deliveryMethod: document.getElementById('quotationDeliveryMethod').value.trim(),
        notes: document.getElementById('quotationNotes').value.trim(),
        conditions: document.getElementById('quotationConditions').value.trim(),
        termsAndConditions: document.getElementById('quotationTerms')?.value.trim() || QUOTATION_DEFAULT_TERMS.join('\n'),
        products: (order.products || []).map(product => ({
            type: product.type || 'Producto personalizado', color: product.color || '', size: product.size || '',
            qty: Math.max(0, Number(product.qty) || 0), price: Math.max(0, Number(product.price) || 0)
        })),
        subtotal: Math.max(0, Number(order.subtotal) || total),
        discountAmount: Math.max(0, Number(order.couponDiscount) || 0),
        total,
        advance,
        remaining: total - advance
    };
}

async function reserveQuotationFolio(draft) {
    if (!isSupabaseReady()) throw new Error('Supabase no está disponible. Conecta Supabase y ejecuta la migración de cotizaciones antes de generar documentos.');
    const payload = {
        customer_name: draft.customerName, customer_phone: draft.customerPhone, quote_date: draft.quoteDate,
        validity_days: draft.validityDays, subtitle: draft.subtitle, technique: draft.technique,
        personalization: draft.personalization, print_location: draft.printLocation, delivery_time: draft.deliveryTime,
        delivery_method: draft.deliveryMethod, notes: draft.notes, conditions: draft.conditions,
        terms_and_conditions: draft.termsAndConditions,
        subtotal: draft.subtotal, total: draft.total, advance: draft.advance, remaining: draft.remaining,
        discount_amount: Math.max(0, Number(draft.order.couponDiscount) || 0)
    };
    const { data, error } = await supabaseClient.rpc('create_quotation_with_folio', {
        p_order_id: draft.order.id, p_payload: payload, p_items: draft.products
    });
    if (error) throw new Error(`No se pudo crear la cotización en Supabase: ${error.message}`);
    const quote = Array.isArray(data) ? data[0] : data;
    if (!quote || !quote.folio) throw new Error('Supabase no devolvió un folio de cotización. Verifica la migración.');
    return quote;
}

async function imageToDataUrl(src) {
    if (!src) return null;
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
    });
}

function quoteDateLabel(dateString) {
    const [year, month, day] = String(dateString).split('-');
    return year && month && day ? `${day}/${month}/${year}` : String(dateString || '');
}

function quotationAdvancePercentage(draft) {
    return draft.total > 0 ? Math.round((draft.advance / draft.total) * 100) : 0;
}

function quotationDocumentRows(draft) {
    return draft.products.map(product => [
        String(product.qty), `${product.type}${product.color ? ` - ${product.color}` : ''}`, product.size || '-',
        quotationMoney(product.price), quotationMoney(product.qty * product.price)
    ]);
}

function getQuotationLogoSource() {
    return document.querySelector('.logo-icon img')?.src || 'logotipo_sinfondo.png';
}

function addQuoteHeader(doc, draft, folio, logoData, pageNumber) {
    const navy = [17, 34, 64];
    const blue = [91, 113, 153];
    if (logoData) doc.addImage(logoData, 'PNG', 16, 13, 52, 52, undefined, 'FAST');
    doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(25);
    doc.text('COTIZACIÓN', 76, 36);
    doc.setTextColor(...blue); doc.setFontSize(12); doc.text(draft.subtitle.toUpperCase(), 76, 45);
    doc.setTextColor(...blue); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    drawQuotationMetaBlock(doc, { folio, date: quoteDateLabel(draft.quoteDate), client: draft.customerName, technique: draft.technique, validity: `${draft.validityDays} días` });
    doc.setDrawColor(139, 166, 209); doc.setLineWidth(.6); doc.line(16, 69, 194, 69);
    if (pageNumber > 1) { doc.setTextColor(...blue); doc.setFontSize(8); doc.text(`Página ${pageNumber}`, 188, 10, { align: 'right' }); }
}

function addQuoteWatermark(doc, logoData) {
    if (!logoData || typeof doc.setGState !== 'function' || !window.jspdf?.GState) return;
    doc.saveGraphicsState(); doc.setGState(new window.jspdf.GState({ opacity: 0.055 }));
    doc.addImage(logoData, 'PNG', 53, 103, 105, 105, undefined, 'FAST'); doc.restoreGraphicsState();
}

function addQuoteSectionTitle(doc, title, x, y) {
    doc.setTextColor(17, 34, 64); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(title, x, y);
}

function addQuoteFooter(doc, folio) {
    doc.setDrawColor(210, 220, 237); doc.line(16, 274, 194, 274);
    doc.setTextColor(17, 34, 64); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('Gracias por tu confianza', 18, 282);
    doc.setFontSize(8); doc.text('PRIN EPIC - Cotizaciones y pedidos', 18, 288);
    doc.setTextColor(91, 113, 153); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(`Documento de cotización\nFolio ${folio}`, 192, 282, { align: 'right', lineHeightFactor: 1.25 });
}

function buildQuotationPdf(draft, folio, logoData) {
    if (!window.jspdf?.jsPDF) throw new Error('La biblioteca de PDF no se cargó. Revisa tu conexión e inténtalo de nuevo.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const navy = [17, 34, 64]; const soft = [245, 247, 251]; const blue = [91, 113, 153];
    let page = 1;
    addQuoteWatermark(doc, logoData); addQuoteHeader(doc, draft, folio, logoData, page);
    doc.setFillColor(...soft); doc.setDrawColor(210, 220, 237); doc.rect(13, 77, 111, 45, 'FD'); doc.rect(127, 77, 67, 45, 'FD');
    addQuoteSectionTitle(doc, 'DETALLES DEL PEDIDO', 16, 85); addQuoteSectionTitle(doc, 'TALLAS', 130, 85);
    doc.setTextColor(...navy); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const products = draft.products; const garments = [...new Set(products.map(product => product.type))].join(', '); const colors = [...new Set(products.map(product => product.color).filter(Boolean))].join(', ');
    const detailLines = [
        ['Prenda:', garments], ['Color:', colors || 'Por confirmar'], ['Personalización:', draft.personalization || 'Por confirmar'], ['Técnica:', draft.technique], ['Ubicación:', draft.printLocation || 'Por confirmar']
    ];
    let detailY = 93; detailLines.forEach(([label, value]) => { doc.setFont('helvetica', 'bold'); doc.text(label, 16, detailY); doc.setFont('helvetica', 'normal'); const lines = doc.splitTextToSize(value, 72); doc.text(lines, 43, detailY); detailY += Math.max(7, lines.length * 4.3); });
    let sizeY = 94; getQuotationSizes(draft).slice(0, 4).forEach(item => { doc.setFont('helvetica', 'bold'); doc.text(`${item.qty} x ${item.size}`, 130, sizeY); sizeY += 6.5; });
    const pieces = products.reduce((sum, product) => sum + product.qty, 0); doc.setTextColor(...blue); doc.text(`Total: ${pieces} pieza${pieces === 1 ? '' : 's'}`, 130, 117);
    let y = 128;
    const headers = ['CANTIDAD', 'DESCRIPCIÓN', 'TALLA', 'PRECIO UNITARIO', 'IMPORTE']; const widths = [22, 67, 22, 35, 35];
    const drawTableHeader = () => { doc.setFillColor(...navy); doc.rect(13, y, 181, 10, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); let x = 13; headers.forEach((header, i) => { doc.text(header, x + widths[i] / 2, y + 6.4, { align: 'center' }); x += widths[i]; }); y += 10; };
    const newPage = () => { doc.addPage(); page += 1; addQuoteWatermark(doc, logoData); addQuoteHeader(doc, draft, folio, logoData, page); y = 78; drawTableHeader(); };
    drawTableHeader(); doc.setFontSize(8.5);
    quotationDocumentRows(draft).forEach(row => {
        const description = doc.splitTextToSize(row[1], 63); const rowHeight = Math.max(9, description.length * 4.5 + 4);
        if (y + rowHeight > 230) newPage();
        doc.setDrawColor(210, 220, 237); let x = 13; widths.forEach(width => { doc.rect(x, y, width, rowHeight); x += width; });
        doc.setTextColor(...navy); doc.setFont('helvetica', 'normal'); doc.text(row[0], 24, y + 6, { align: 'center' }); doc.text(description, 37, y + 5.7); doc.text(row[2], 113, y + 6, { align: 'center' }); doc.text(row[3], 159, y + 6, { align: 'right' }); doc.setFont('helvetica', 'bold'); doc.text(row[4], 190, y + 6, { align: 'right' }); y += rowHeight;
    });
    const discountAmount = Math.max(0, Number(draft.discountAmount) || 0);
    const summaryHeight = discountAmount > 0 ? 47 : 40;
    if (y + summaryHeight + 27 > 267) { doc.addPage(); page += 1; addQuoteWatermark(doc, logoData); addQuoteHeader(doc, draft, folio, logoData, page); y = 80; }
    const percent = quotationAdvancePercentage(draft); doc.setFillColor(...soft); doc.setDrawColor(210, 220, 237); doc.rect(13, y + 7, 105, 25, 'FD');
    doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(`ANTICIPO (${percent}%)`, 16, y + 16); doc.text(quotationMoney(draft.advance), 105, y + 16, { align: 'right' }); doc.text(`SALDO RESTANTE (${100 - percent}%)`, 16, y + 27); doc.text(quotationMoney(draft.remaining), 105, y + 27, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.text('Subtotal', 124, y + 14); doc.setFont('helvetica', 'bold'); doc.text(quotationMoney(draft.subtotal), 178, y + 14, { align: 'right' });
    if (discountAmount > 0) {
        doc.setFont('helvetica', 'normal'); doc.text('Descuento:', 124, y + 21); doc.setTextColor(170, 55, 55); doc.text(`-${quotationMoney(discountAmount)}`, 178, y + 21, { align: 'right' });
    }
    const totalBoxY = y + (discountAmount > 0 ? 24 : 19);
    doc.setFillColor(...soft); doc.rect(121, totalBoxY, 73, 20, 'F'); doc.setTextColor(...navy); doc.setFontSize(14); doc.text('TOTAL', 124, totalBoxY + 13); doc.text(`${quotationMoney(draft.total)}\nMXN`, 177, totalBoxY + 9, { align: 'right', lineHeightFactor: 1.2 });
    y += discountAmount > 0 ? 57 : 52;
    const columns = [{ x: 15, width: 48, title: 'TIEMPO DE ENTREGA', text: draft.deliveryTime || 'Por confirmar' }, { x: 70, width: 48, title: 'ENTREGA', text: draft.deliveryMethod || 'Por confirmar' }, { x: 124, width: 57, title: 'CONDICIONES', text: draft.conditions || 'Sin condiciones adicionales.' }];
    const columnLines = columns.map(column => doc.splitTextToSize(column.text, column.width));
    const lowerSectionHeight = 15 + Math.max(...columnLines.map(lines => lines.length)) * 4.5;
    if (y + lowerSectionHeight > 251) { doc.addPage(); page += 1; addQuoteWatermark(doc, logoData); addQuoteHeader(doc, draft, folio, logoData, page); y = 80; }
    const lowerBottom = y + lowerSectionHeight;
    columns.forEach((column, index) => { doc.setTextColor(...blue); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(column.title, column.x, y); doc.setFont('helvetica', 'normal'); doc.text(columnLines[index], column.x, y + 9, { lineHeightFactor: 1.35 }); });
    doc.setDrawColor(210, 220, 237); doc.setLineWidth(.35); doc.line(64, y - 3, 64, lowerBottom); doc.line(118, y - 3, 118, lowerBottom);
    let nextY = lowerBottom + 8;
    if (draft.notes) { const noteLines = doc.splitTextToSize(draft.notes, 170); doc.setTextColor(...blue); doc.setFont('helvetica', 'bold'); doc.text('OBSERVACIONES', 15, nextY); doc.setFont('helvetica', 'normal'); doc.text(noteLines, 15, nextY + 7, { lineHeightFactor: 1.35 }); nextY += 14 + noteLines.length * 4; }
    const terms = draft.termsAndConditions || QUOTATION_DEFAULT_TERMS.join('\n');
    const termLines = terms.split(/\r?\n/).flatMap(line => doc.splitTextToSize(line.trim() ? `• ${line.trim()}` : '', 170));
    const termsHeight = 17 + termLines.length * 4.2;
    if (nextY + termsHeight > 269) { doc.addPage(); page += 1; addQuoteWatermark(doc, logoData); addQuoteHeader(doc, draft, folio, logoData, page); nextY = 80; }
    doc.setDrawColor(210, 220, 237); doc.setLineWidth(.35); doc.line(16, nextY, 194, nextY);
    doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('Términos y condiciones', 105, nextY + 7, { align: 'center' });
    doc.setTextColor(...blue); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(termLines, 18, nextY + 14, { lineHeightFactor: 1.3 });
    doc.setDrawColor(210, 220, 237); doc.line(16, nextY + termsHeight - 3, 194, nextY + termsHeight - 3);
    addQuoteFooter(doc, folio); return doc;
}

function quotationProductSummary(products) {
    const types = [...new Set((products || []).map(product => String(product.type || '').trim()).filter(Boolean))];
    if (types.length === 1) return types[0];
    if (types.length <= 3 && types.join(', ').length <= 52) return types.join(', ');
    return 'Productos personalizados';
}

function drawSingleLineValue(doc, text, x, y, maxRight = 195, initialSize = 7.2, minSize = 6.2) {
    const value = String(text || '—');
    let fontSize = initialSize;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    while (x + doc.getTextWidth(value) > maxRight && fontSize > minSize) {
        fontSize -= 0.2;
        doc.setFontSize(fontSize);
    }
    doc.text(value, x, y);
    return fontSize;
}

function drawQuotationMetaBlock(doc, { folio, date, client, technique, validity }) {
    const labelX = 137;
    const valueX = 153;
    const startY = 18;
    const rowGap = 4.2;
    const labelFontSize = 7.2;
    const valueFontSize = 7.2;
    const rows = [
        ['Folio:', folio || '—'], ['Fecha:', date || '—'], ['Cliente:', client || '—'],
        ['Técnica:', technique || '—'], ['Vigencia:', validity || '—']
    ];
    rows.forEach(([label, value], index) => {
        const y = startY + (index * rowGap);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(labelFontSize);
        doc.setTextColor(91, 107, 139);
        doc.text(label, labelX, y);
        doc.setTextColor(14, 35, 69);
        drawSingleLineValue(doc, value, valueX, y, 195, valueFontSize, 6.2);
    });
}

function buildQuotationPdfCompact(draft, folio, logoData) {
    if (!window.jspdf?.jsPDF) throw new Error('La biblioteca de PDF no se cargó. Revisa tu conexión e inténtalo de nuevo.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const PAGE_WIDTH = 210; const PAGE_HEIGHT = 297; const LEFT = 15; const RIGHT = 195; const CONTENT_WIDTH = 180; const FOOTER_TOP = 276; const CONTENT_BOTTOM = 272;
    const navy = [17, 34, 64]; const blue = [91, 113, 153]; const soft = [245, 247, 251]; const line = [210, 220, 237];
    let page = 1; let currentY = 0;
    const watermark = () => { if (!logoData || typeof doc.setGState !== 'function' || !window.jspdf?.GState) return; doc.saveGraphicsState(); doc.setGState(new window.jspdf.GState({ opacity: 0.03 })); doc.addImage(logoData, 'PNG', 30, 73.5, 150, 150, undefined, 'FAST'); doc.restoreGraphicsState(); };
    const fullHeader = () => {
        if (logoData) doc.addImage(logoData, 'PNG', 16, 12, 22, 22, undefined, 'FAST');
        const headerCenterX = (40 + 137) / 2;
        doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text('COTIZACIÓN', headerCenterX, 22, { align: 'center' });
        doc.setTextColor(...blue); doc.setFontSize(9); doc.text(String(draft.subtitle || 'PRODUCTOS PERSONALIZADOS').toUpperCase(), headerCenterX, 30, { align: 'center' });
        drawQuotationMetaBlock(doc, { folio, date: quoteDateLabel(draft.quoteDate), client: draft.customerName, technique: draft.technique, validity: `${draft.validityDays} días` });
        doc.setDrawColor(139, 166, 209); doc.setLineWidth(.55); doc.line(15, 60, 195, 60);
    };
    const continuationHeader = () => { doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(`PRIN EPIC | COTIZACIÓN ${folio}`, LEFT, 10); doc.setTextColor(...blue); doc.setFont('helvetica', 'normal'); doc.text(`Página ${page}`, RIGHT, 10, { align: 'right' }); doc.setDrawColor(139, 166, 209); doc.setLineWidth(.4); doc.line(15, 15, 195, 15); };
    const newPage = (continuation = true) => { doc.addPage(); page += 1; watermark(); continuation ? continuationHeader() : fullHeader(); currentY = continuation ? 21 : 64; };
    const ensureSpace = required => { if (currentY + required <= CONTENT_BOTTOM) return true; newPage(true); return false; };
    const drawFooter = () => { doc.setDrawColor(...line); doc.setLineWidth(.35); doc.line(15, FOOTER_TOP, 195, FOOTER_TOP); doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Gracias por tu confianza', 17, 284); doc.setFontSize(8); doc.text('PRIN EPIC - Cotizaciones y pedidos', 17, 290); doc.setTextColor(...blue); doc.setFont('helvetica', 'normal'); doc.text('Documento de cotización\nFolio ' + folio, 193, 284, { align: 'right', lineHeightFactor: 1.25 }); };
    const drawTableHeader = y => { doc.setFillColor(...navy); doc.rect(15, y, CONTENT_WIDTH, 8, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); const heads = ['CANTIDAD', 'DESCRIPCIÓN', 'TALLA', 'PRECIO UNITARIO', 'IMPORTE']; const widths = [22, 66, 22, 35, 35]; let x = 15; heads.forEach((head, i) => { doc.text(head, x + widths[i] / 2, y + 5.2, { align: 'center' }); x += widths[i]; }); return y + 8; };
    const drawRows = () => { const widths = [22, 66, 22, 35, 35]; for (const product of draft.products) { const desc = doc.splitTextToSize(`${product.type}${product.color ? ` - ${product.color}` : ''}`, 62); const height = Math.max(8, desc.length * 3.8 + 3); if (currentY + height > 248) { newPage(true); currentY = drawTableHeader(21); } doc.setDrawColor(...line); doc.setLineWidth(.25); let x = 15; widths.forEach(width => { doc.rect(x, currentY, width, height); x += width; }); doc.setTextColor(...navy); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(String(product.qty), 26, currentY + 5.2, { align: 'center' }); doc.text(desc, 39, currentY + 4.8, { lineHeightFactor: 1.15 }); doc.text(product.size || '-', 114, currentY + 5.2, { align: 'center' }); doc.text(quotationMoney(product.price), 160, currentY + 5.2, { align: 'right' }); doc.setFont('helvetica', 'bold'); doc.text(quotationMoney(product.qty * product.price), 192, currentY + 5.2, { align: 'right' }); currentY += height; } };
    watermark(); fullHeader(); currentY = 65;
    const products = draft.products || []; const garment = quotationProductSummary(products); const colors = [...new Set(products.map(product => product.color).filter(Boolean))].join(', ') || 'Por confirmar'; const detailLines = [['Prenda:', garment], ['Color:', colors], ['Personalización:', draft.personalization || 'Por confirmar'], ['Técnica:', draft.technique], ['Ubicación:', draft.printLocation || 'Por confirmar']];
    const detailWrapped = detailLines.map(([label, value]) => [label, doc.splitTextToSize(String(value), 67)]); const sizes = getQuotationSizes(draft); const detailHeight = Math.max(39, 25 + detailWrapped.reduce((sum, item) => sum + Math.max(1, item[1].length) * 3.4, 0), 20 + Math.ceil(sizes.length / 2) * 5.5); ensureSpace(detailHeight + 5);
    doc.setFillColor(...soft); doc.setDrawColor(...line); doc.rect(15, currentY, 116, detailHeight, 'FD'); doc.rect(134, currentY, 61, detailHeight, 'FD'); addQuoteSectionTitle(doc, 'DETALLES DEL PEDIDO', 18, currentY + 8); addQuoteSectionTitle(doc, 'TALLAS', 137, currentY + 8);
    let dy = currentY + 16; detailWrapped.forEach(([label, lines]) => { doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.text(label, 18, dy); doc.setFont('helvetica', 'normal'); doc.text(lines, 45, dy, { lineHeightFactor: 1.1 }); dy += Math.max(5.5, lines.length * 3.4); });
    doc.setFontSize(8.2); sizes.forEach((item, index) => { const col = index % 2; const row = Math.floor(index / 2); doc.setFont('helvetica', 'bold'); doc.text(`${item.qty} x ${item.size}`, 137 + col * 27, currentY + 16 + row * 5.5); }); const pieces = products.reduce((sum, product) => sum + product.qty, 0); doc.setTextColor(...blue); doc.text(`Total: ${pieces} pieza${pieces === 1 ? '' : 's'}`, 137, currentY + detailHeight - 5);
    currentY += detailHeight + 5; currentY = drawTableHeader(currentY); drawRows();
    const discount = Math.max(0, Number(draft.discountAmount) || 0); const summaryHeight = discount > 0 ? 34 : 29; ensureSpace(summaryHeight + 8); const summaryY = currentY + 6; const percent = quotationAdvancePercentage(draft); doc.setFillColor(...soft); doc.setDrawColor(...line); doc.rect(15, summaryY, 105, summaryHeight, 'FD'); doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(`ANTICIPO (${percent}%)`, 18, summaryY + 10); doc.text(quotationMoney(draft.advance), 102, summaryY + 10, { align: 'right' }); doc.text(`SALDO RESTANTE (${100 - percent}%)`, 18, summaryY + 22); doc.text(quotationMoney(draft.remaining), 102, summaryY + 22, { align: 'right' }); doc.setFont('helvetica', 'normal'); doc.text('Subtotal', 126, summaryY + 8); doc.setFont('helvetica', 'bold'); doc.text(quotationMoney(draft.subtotal), 192, summaryY + 8, { align: 'right' }); if (discount > 0) { doc.setFont('helvetica', 'normal'); doc.text('Descuento:', 126, summaryY + 15); doc.setTextColor(170, 55, 55); doc.text(`-${quotationMoney(discount)}`, 192, summaryY + 15, { align: 'right' }); } const totalY = summaryY + (discount > 0 ? 18 : 13); doc.setFillColor(...soft); doc.setTextColor(...navy); doc.rect(123, totalY, 72, 18, 'F'); doc.setFontSize(12); doc.text('TOTAL', 126, totalY + 11); doc.text(`${quotationMoney(draft.total)}\nMXN`, 192, totalY + 8, { align: 'right', lineHeightFactor: 1.1 }); currentY = summaryY + summaryHeight + 6;
    const columns = [{ x: 17, width: 51, title: 'TIEMPO DE ENTREGA', text: draft.deliveryTime || 'Por confirmar' }, { x: 73, width: 51, title: 'ENTREGA', text: draft.deliveryMethod || 'Por confirmar' }, { x: 129, width: 64, title: 'CONDICIONES', text: draft.conditions || 'Sin condiciones adicionales.' }]; const colLines = columns.map(column => doc.splitTextToSize(column.text, column.width)); const colHeight = 10 + Math.max(...colLines.map(lines => lines.length)) * 3.6; ensureSpace(colHeight + 7); columns.forEach((column, index) => { doc.setTextColor(...blue); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(column.title, column.x, currentY); doc.setFont('helvetica', 'normal'); doc.text(colLines[index], column.x, currentY + 8, { lineHeightFactor: 1.15 }); }); doc.setDrawColor(...line); doc.line(67, currentY - 3, 67, currentY + colHeight); doc.line(125, currentY - 3, 125, currentY + colHeight); currentY += colHeight + 5;
    const terms = (draft.termsAndConditions || QUOTATION_DEFAULT_TERMS.join('\n')).split(/\r?\n/).flatMap(line => doc.splitTextToSize(line.trim(), 174)).filter(Boolean); const termsHeight = 14 + terms.length * 3.5; ensureSpace(termsHeight + 4); doc.setDrawColor(...line); doc.line(15, currentY, 195, currentY); doc.setTextColor(...navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('Términos y condiciones', 105, currentY + 6, { align: 'center' }); doc.setTextColor(...blue); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.text(terms, 17, currentY + 12, { lineHeightFactor: 1.15 }); doc.line(15, currentY + termsHeight - 2, 195, currentY + termsHeight - 2);
    drawFooter(); return doc;
}

async function generateQuotationPdf() {
    try {
        const draft = readQuotationDraft();
        const quote = await reserveQuotationFolio(draft);
        const logoData = await imageToDataUrl(getQuotationLogoSource());
        const documentPdf = buildQuotationPdfCompact(draft, quote.folio, logoData);
        documentPdf.save(`Cotizacion_PRIN_EPIC_${quote.folio}.pdf`);
        closeModal('quotationModal');
        showNotification(`Cotización ${quote.folio} generada correctamente.`, 'success');
    } catch (error) {
        console.error(error);
        showNotification(error.message || 'No se pudo generar la cotización.', 'error');
    }
}
