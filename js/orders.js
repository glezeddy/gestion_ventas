let orderAdvanceManual = false;
let editAdvanceManual = false;

function getAutomaticAdvance(total) {
    return Math.round(Math.max(0, Number(total) || 0) * 0.7);
}
function markOrderAdvanceManual() {
    orderAdvanceManual = true;
}
function markEditAdvanceManual() {
    editAdvanceManual = true;
}
function addProductRow() {
    productCounter++;
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    const productItem = document.createElement('div');
    productItem.className = 'product-item';
    productItem.id = `product-${productCounter}`;
    productItem.innerHTML = `
        <div class="form-group"><label>👕 Prenda</label><select class="product-type" onchange="refreshProductPrices()"><option>Playera Básica</option><option>Dry Fit</option><option>Camiseta tipo Polo</option><option>Hoodie</option><option>Sudadera</option><option>Playera Niño</option><option>Polo Niño</option><option>Dry Fit Niño</option><option>Hoodie Niño</option></select></div>
        <div class="form-group"><label>👥 Género</label><select class="product-gender"><option value="Caballero">Caballero</option><option value="Dama">Dama</option><option value="Niño">Niño</option></select></div>
		<div class="form-group"><label>🎨 Color</label><select class="product-color">${Object.values(eurocottonColors).flatMap(cat => Object.keys(cat)).map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="form-group"><label>📏 Talla</label><select class="product-size"><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option><option>XXXL</option></select></div>
        <div class="form-group"><label>🔢 Cantidad</label><input type="number" class="product-qty" value="1" min="1" onchange="refreshProductPrices()" oninput="refreshProductPrices()"></div>
        <div class="form-group"><label>💲 Precio</label><input type="number" class="product-price" value="300" min="0" onchange="markProductCustomPrice(${productCounter}, true)" oninput="markProductCustomPrice(${productCounter}, true)"><div class="price-mode-note">Automático por mayoreo si no activas precio personalizado.</div></div>
        <label class="price-mode-toggle"><input type="checkbox" class="product-custom-price" onchange="toggleProductCustomPrice(${productCounter}, this.checked)"> Precio personalizado</label>
        <button type="button" class="btn-remove" onclick="removeProductRow(${productCounter})">✖</button>
        <div id="colorSwatches-${productCounter}" class="color-swatches-container"></div>
    `;
    productsList.appendChild(productItem);
    generateColorSelector(`colorSwatches-${productCounter}`);
    refreshProductPrices();
}
function getProductTypeTotals(containerSelector, typeSelector, qtySelector) {
    const totals = {};
    document.querySelectorAll(`${containerSelector} .product-item`).forEach(item => {
        const type = normalizeProductType(item.querySelector(typeSelector).value);
        const qty = parseInt(item.querySelector(qtySelector).value, 10) || 0;
        totals[type] = (totals[type] || 0) + Math.max(0, qty);
    });
    return totals;
}
function isProductCustomPrice(productItem) {
    const toggle = productItem ? productItem.querySelector('.product-custom-price') : null;
    return Boolean(toggle && toggle.checked);
}
function markProductCustomPrice(productId, custom) {
    const productItem = document.getElementById(`product-${productId}`);
    if (!productItem) return;
    const toggle = productItem.querySelector('.product-custom-price');
    if (toggle) toggle.checked = Boolean(custom);
    calculatePrices();
}
function toggleProductCustomPrice(productId, custom) {
    if (!custom) updateProductPrice(productId);
    else calculatePrices();
}
function refreshProductPrices() {
    document.querySelectorAll('#productsList .product-item').forEach(item => {
        const productId = Number(String(item.id || '').replace('product-', ''));
        if (productId) updateProductPrice(productId);
    });
    calculatePrices();
}
function updateProductPrice(productId) {
    const productItem = document.getElementById(`product-${productId}`);
    if (!productItem) return;
    if (isProductCustomPrice(productItem)) {
        calculatePrices();
        return;
    }
    const productType = normalizeProductType(productItem.querySelector('.product-type').value);
    const typeTotals = getProductTypeTotals('#productsList', '.product-type', '.product-qty');
    const quantity = typeTotals[productType] || parseInt(productItem.querySelector('.product-qty').value) || 1;
    const priceInput = productItem.querySelector('.product-price');
    const unitPrice = getUnitPrice(productType, quantity);
    priceInput.value = unitPrice;
    calculatePrices();
}
function removeProductRow(id) { const item = document.getElementById(`product-${id}`); if (item) item.remove(); refreshProductPrices(); }
function getProductsFromForm() {
    const products = [];
    document.querySelectorAll('#productsList .product-item').forEach(item => {
        const type = normalizeProductType(item.querySelector('.product-type').value);
        const gender = item.querySelector('.product-gender').value;
        const color = item.querySelector('.product-color').value;
        const size = item.querySelector('.product-size').value;
        const qty = parseInt(item.querySelector('.product-qty').value, 10) || 0;
        const price = parseFloat(item.querySelector('.product-price').value) || 0;
        const customPrice = isProductCustomPrice(item);
        if (qty > 0 && price >= 0) products.push({ type, gender, color, size, qty, price, customPrice });
    });
    return products;
}
function calculatePrices() {
    const products = getProductsFromForm();
    const totalQty = products.reduce((sum, p) => sum + p.qty, 0);
    const subtotal = products.reduce((sum, p) => sum + (p.qty * p.price), 0);
    const couponValidation = currentCouponForOrder ? getCouponValidation(currentCouponForOrder, products) : { discount: 0 };
    const couponDiscount = couponValidation.valid ? couponValidation.discount : 0;
    const couponMessage = document.getElementById('couponValidationMessage');
    if (currentCouponForOrder && couponMessage && !couponValidation.valid) {
        couponMessage.textContent = couponValidation.message;
        couponMessage.style.color = '#ef4444';
    } else if (currentCouponForOrder && couponMessage && couponValidation.valid) {
        couponMessage.textContent = couponValidation.message;
        couponMessage.style.color = '#10b981';
    }
    const total = Math.max(0, subtotal - couponDiscount);
    const advanceInput = document.getElementById('orderAdvance');
    const advance = orderAdvanceManual
        ? Math.max(0, getSafeOrderMoney(advanceInput ? advanceInput.value : 0, 0))
        : getAutomaticAdvance(total);
    const displayTotalQty = document.getElementById('displayTotalQty');
    const displaySubtotal = document.getElementById('displaySubtotal');
    const displayCouponDiscount = document.getElementById('displayCouponDiscount');
    const displayTotal = document.getElementById('displayTotal');
    const displayAdvance = document.getElementById('displayAdvance');
    if (displayTotalQty) displayTotalQty.textContent = totalQty;
    if (displaySubtotal) displaySubtotal.textContent = '$' + subtotal.toLocaleString();
    if (displayCouponDiscount) displayCouponDiscount.textContent = '-$' + couponDiscount.toLocaleString();
    if (displayTotal) displayTotal.textContent = '$' + total.toLocaleString();
    if (advanceInput && !orderAdvanceManual) advanceInput.value = advance;
    if (displayAdvance) displayAdvance.textContent = '$' + advance.toLocaleString();
    return { totalQty, subtotal, couponDiscount, total, advance, couponValidation };
}
function calculateOrderCosts(totalQty, shirtCost, dtfCost, extraCost, shirtCostKids = 0, products = []) {
    const qty = Number(totalQty) || 0;
    const shirtUnitCost = Number(shirtCost) || 0;
    const kidsShirtUnitCost = Number(shirtCostKids) || 0;
    const dtfTotalCost = Number(dtfCost) || 0;
    const extraTotalCost = Number(extraCost) || 0;
    const productList = Array.isArray(products) ? products : [];
    const kidsQty = productList.length
        ? productList.reduce((sum, product) => sum + (/niño|nino/i.test(product.type) ? (Number(product.qty) || 0) : 0), 0)
        : 0;
    const adultQty = productList.length ? Math.max(0, qty - kidsQty) : qty;
    const shirtsTotal = (shirtUnitCost * adultQty) + (kidsShirtUnitCost * kidsQty);
    const costTotal = shirtsTotal + dtfTotalCost + extraTotalCost;
    return {
        totalQty: qty,
        shirtUnitCost,
        kidsShirtUnitCost,
        adultQty,
        kidsQty,
        shirtsTotal,
        dtfTotalCost,
        extraTotalCost,
        costTotal
    };
}
function mapCalculatorTypeToOrderType(type) {
    const typeMap = {
        basica: 'Playera Básica',
        nino: 'Playera Niño',
        polo: 'Camiseta tipo Polo',
        polonino: 'Polo Niño',
        dryfit: 'Dry Fit',
        dryfitnino: 'Dry Fit Niño',
        hoodie: 'Hoodie',
        hoodienino: 'Hoodie Niño'
    };

    return typeMap[type] || type;
}
function syncDatosPedido() {
    const tipo = getCalculatorElement('tipo');
    const cantidad = getCalculatorElement('cantidad');
    const precio = getCalculatorElement('precio');
    const dtf = getCalculatorElement('dtf');
    const camiseta = getCalculatorElement('camiseta');
    const otros = getCalculatorElement('otros');

    const orderShirtCost = document.getElementById('orderShirtCost');
    const orderDtfCost = document.getElementById('orderDtfCost');
    const orderExtraCost = document.getElementById('orderExtraCost');

    if (orderShirtCost) orderShirtCost.value = camiseta && camiseta.value != null ? camiseta.value : '';
    if (orderDtfCost) orderDtfCost.value = dtf && dtf.value != null ? dtf.value : '';
    if (orderExtraCost) orderExtraCost.value = otros && otros.value != null ? otros.value : '';

    const firstProduct = document.querySelector('#productsList .product-item');
    if (!firstProduct) return;

    const productType = firstProduct.querySelector('.product-type');
    const productQty = firstProduct.querySelector('.product-qty');
    const productPrice = firstProduct.querySelector('.product-price');

    if (productType && tipo) productType.value = mapCalculatorTypeToOrderType(tipo.value);
    if (productQty && cantidad) productQty.value = cantidad.value != null && cantidad.value !== '' ? cantidad.value : '1';
    if (productPrice && precio) productPrice.value = precio.value != null ? precio.value : '';

    calculatePrices();
}
function validateAdvanceAndCalculate() {
    calculatePrices();
    const advance = parseInt(document.getElementById('orderAdvance').value) || 0;
    const totalDisplay = document.getElementById('displayTotal');
    if (totalDisplay) {
        const total = parseInt(totalDisplay.textContent.replace(/[^0-9]/g, '')) || 0;
        if (advance > total) {
            showNotification('⚠️ El anticipo no puede ser mayor al total del pedido', 'error');
            document.getElementById('orderAdvance').value = total;
        }
    }
}

// Crear pedido
function openNewOrderModal() {
    orderAdvanceManual = false;
    document.getElementById('productsList').innerHTML = '';
    productCounter = 0;
    addProductRow();
    const form = document.getElementById('orderForm');
    if (form) form.reset();
    const advanceInput = document.getElementById('orderAdvance');
    if (advanceInput) advanceInput.value = 0;
    const shirtCostInput = document.getElementById('orderShirtCost');
    const dtfCostInput = document.getElementById('orderDtfCost');
    const extraCostInput = document.getElementById('orderExtraCost');
    if (shirtCostInput) shirtCostInput.value = 0;
    if (dtfCostInput) dtfCostInput.value = 0;
    if (extraCostInput) extraCostInput.value = 0;
    currentCouponForOrder = null;
    const couponInput = document.getElementById('orderCouponCode');
    const couponMessage = document.getElementById('couponValidationMessage');
    if (couponInput) couponInput.value = '';
    if (couponMessage) couponMessage.textContent = '';
    calculatePrices();
    syncDatosPedido();
    rememberActiveModal('newOrderModal');
    document.getElementById('newOrderModal').classList.add('active');
}
async function saveOrder() {
    const customerName = document.getElementById('orderCustomerName').value.trim();
    const customerPhone = document.getElementById('orderCustomerPhone') ? document.getElementById('orderCustomerPhone').value.trim() : '';
    if (!customerName) {
        showNotification('❌ Por favor ingresa el nombre del cliente', 'error');
        return;
    }
    const products = getProductsFromForm();
    if (products.length === 0) {
        showNotification('❌ Por favor agrega al menos un producto con cantidad válida', 'error');
        return;
    }
    for (const product of products) {
        if (product.qty <= 0 || product.price < 0) {
            showNotification('❌ Cantidad debe ser mayor a cero y precio no puede ser negativo', 'error');
            return;
        }
    }
    const subtotal = products.reduce((sum, product) => sum + (product.qty * product.price), 0);
    const couponValidation = currentCouponForOrder ? getCouponValidation(currentCouponForOrder, products) : { valid: false, discount: 0 };
    if (currentCouponForOrder && !couponValidation.valid) {
        showNotification(couponValidation.message, 'error');
        const couponMessage = document.getElementById('couponValidationMessage');
        if (couponMessage) {
            couponMessage.textContent = couponValidation.message;
            couponMessage.style.color = '#ef4444';
        }
        return;
    }
    const couponDiscount = currentCouponForOrder ? couponValidation.discount : 0;
    const total = Math.max(0, subtotal - couponDiscount);
    const totalQty = products.reduce((sum, product) => sum + product.qty, 0);
    const shirtCost = parseFloat(document.getElementById('orderShirtCost').value) || 0;
    const shirtCostKids = parseFloat(document.getElementById('orderShirtCostKids').value) || 0;
    const dtfCost = parseFloat(document.getElementById('orderDtfCost').value) || 0;
    const extraCost = parseFloat(document.getElementById('orderExtraCost').value) || 0;
    const orderCosts = calculateOrderCosts(totalQty, shirtCost, dtfCost, extraCost, shirtCostKids, products);
    let advance = parseFloat(document.getElementById('orderAdvance').value) || 0;
    if (advance > total) advance = total;
    const orderId = generateOrderId();
    const technique = document.getElementById('orderTechnique').value;
    const status = document.getElementById('orderStatus').value;
    const newOrder = {
        id: orderId,
        customerName,
        customerPhone,
        date: getTodayDateString(),
        products,
        technique,
        subtotal,
        couponCode: currentCouponForOrder ? currentCouponForOrder.code : '',
        couponId: currentCouponForOrder ? currentCouponForOrder.id : '',
        couponDiscount,
        total,
        totalQty,
        advance,
        remaining: total - advance,
        status,
        paid: advance >= total,
        shirtCost,
        shirtCostKids,
        dtfCost,
        extraCosts: extraCost,
        costTotal: orderCosts.costTotal,
        netProfit: total - orderCosts.costTotal
    };
    orders.unshift(newOrder);
    const couponToUse = currentCouponForOrder;
    try {
        await persistOrderToDatabase(newOrder);
    } catch (error) {
        console.error(error);
        orders.shift();
        showNotification('❌ No se pudo guardar el pedido en Supabase.', 'error');
        return;
    }
    if (couponToUse) markCouponAsUsed(couponToUse.id, orderId);
    const saveResult = saveData();
    closeModal('newOrderModal');
    currentCouponForOrder = null;
    renderAll();
    if (saveResult.strippedMedia) {
        showNotification(`✅ Pedido ${orderId} guardado. Las imágenes pesadas se omitieron para evitar llenar localStorage.`, 'warning');
        return;
    }
    showNotification(`✅ Pedido ${orderId} creado exitosamente`, 'success');
}

// Edición
function openEditOrderModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Pedido no encontrado', 'error');
        return;
    }
    document.getElementById('editOrderId').value = order.id;
    document.getElementById('editCustomerName').value = order.customerName;
    document.getElementById('editOrderDate').value = order.date;
    document.getElementById('editTechnique').value = order.technique;
    document.getElementById('editStatus').value = normalizeOrderStatus(order.status);
    const storedAdvance = getSafeOrderMoney(order.advance, 0);
    editAdvanceManual = false;
    document.getElementById('editAdvance').value = storedAdvance;
    document.getElementById('editShirtCost').value = order.shirtCost || 0;
    const editShirtCostKids = document.getElementById('editShirtCostKids');
    if (editShirtCostKids) editShirtCostKids.value = order.shirtCostKids || 0;
    document.getElementById('editDtfCost').value = order.dtfCost || 0;
    document.getElementById('editExtraCost').value = order.extraCosts || 0;
    const productsContainer = document.getElementById('editProductsList');
    productsContainer.innerHTML = '';
    editProductCounter = 0;
    if (order.products && order.products.length > 0) {
        order.products.forEach(product => addEditProductRow(product));
    } else {
        addEditProductRow();
    }
    refreshEditProductPrices();
    document.getElementById('editAdvance').value = editAdvanceManual
        ? storedAdvance
        : getAutomaticAdvance(calculateEditTotalsFromProducts(getEditProductsFromForm().products, order).total);
    calculateEditPrices();
    document.getElementById('editOrderModal').classList.add('active');
}
function getProductOptionsHtml(selectedType = '') {
    const options = Object.keys(priceTables);
    const normalizedSelected = normalizeProductType(selectedType || options[0]);
    return options.map(type => `<option value="${type}" ${type === normalizedSelected ? 'selected' : ''}>${type}</option>`).join('');
}
function addEditProductRow(product = null) {
    editProductCounter++;
    const container = document.getElementById('editProductsList');
    const productDiv = document.createElement('div');
    productDiv.className = 'product-item';
    productDiv.id = `edit-product-${editProductCounter}`;
    const colorOptions = [];
    for (const category of Object.values(eurocottonColors)) {
        for (const colorName of Object.keys(category)) {
            colorOptions.push(`<option value="${colorName}">${colorName}</option>`);
        }
    }
    const colorOptionsHtml = colorOptions.join('');
    const normalizedType = normalizeProductType(product && product.type ? product.type : 'Playera Básica');
    const isCustomPrice = Boolean(product && product.customPrice);
    productDiv.innerHTML = `
        <div class="form-group"><label>👕 Prenda</label><select class="edit-product-type" onchange="refreshEditProductPrices()">${getProductOptionsHtml(normalizedType)}</select></div>
        <div class="form-group"><label>👥 Género</label><select class="edit-product-gender"><option value="Caballero">Caballero</option><option value="Dama">Dama</option><option value="Niño">Niño</option></select></div>
        <div class="form-group"><label>🎨 Color</label><select class="edit-product-color">${colorOptionsHtml}</select></div>
        <div class="form-group"><label>📏 Talla</label><select class="edit-product-size"><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option><option>XXXL</option></select></div>
        <div class="form-group"><label>🔢 Cantidad</label><input type="number" class="edit-product-qty" value="1" min="1" onchange="refreshEditProductPrices()" oninput="refreshEditProductPrices()"></div>
        <div class="form-group"><label>💲 Precio</label><input type="number" class="edit-product-price" value="300" min="0" step="0.01" onchange="markEditProductCustomPrice(${editProductCounter}, true)" oninput="markEditProductCustomPrice(${editProductCounter}, true)"><div class="price-mode-note">Automático por mayoreo si no activas precio personalizado.</div></div>
        <label class="price-mode-toggle"><input type="checkbox" class="edit-product-custom-price" ${isCustomPrice ? 'checked' : ''} onchange="toggleEditProductCustomPrice(${editProductCounter}, this.checked)"> Precio personalizado</label>
        <button type="button" class="btn-remove" onclick="removeEditProductRow(${editProductCounter})">✖</button>
    `;
    container.appendChild(productDiv);
    if (product) {
        productDiv.querySelector('.edit-product-type').value = normalizedType;
        productDiv.querySelector('.edit-product-gender').value = product.gender || 'Caballero';
        productDiv.querySelector('.edit-product-color').value = product.color || 'Blanco';
        productDiv.querySelector('.edit-product-size').value = product.size || 'M';
        productDiv.querySelector('.edit-product-qty').value = product.qty || 1;
        productDiv.querySelector('.edit-product-price').value = product.price || 0;
    } else {
        updateEditProductPrice(editProductCounter);
    }
    refreshEditProductPrices();
}
function getEditProductTypeTotals() {
    const totals = {};
    document.querySelectorAll('#editProductsList .product-item').forEach(item => {
        const type = normalizeProductType(item.querySelector('.edit-product-type').value);
        const qty = parseInt(item.querySelector('.edit-product-qty').value, 10) || 0;
        totals[type] = (totals[type] || 0) + Math.max(0, qty);
    });
    return totals;
}
function isEditProductCustomPrice(productDiv) {
    const toggle = productDiv ? productDiv.querySelector('.edit-product-custom-price') : null;
    return Boolean(toggle && toggle.checked);
}
function markEditProductCustomPrice(productId, custom) {
    const productDiv = document.getElementById(`edit-product-${productId}`);
    if (!productDiv) return;
    const toggle = productDiv.querySelector('.edit-product-custom-price');
    if (toggle) toggle.checked = Boolean(custom);
    calculateEditPrices();
}
function toggleEditProductCustomPrice(productId, custom) {
    if (!custom) updateEditProductPrice(productId);
    else calculateEditPrices();
}
function refreshEditProductPrices() {
    document.querySelectorAll('#editProductsList .product-item').forEach(item => {
        const productId = Number(String(item.id || '').replace('edit-product-', ''));
        if (productId) updateEditProductPrice(productId);
    });
    calculateEditPrices();
}
function updateEditProductPrice(productId) {
    const productDiv = document.getElementById(`edit-product-${productId}`);
    if (!productDiv) return;
    if (isEditProductCustomPrice(productDiv)) {
        calculateEditPrices();
        return;
    }
    const type = normalizeProductType(productDiv.querySelector('.edit-product-type').value);
    const typeTotals = getEditProductTypeTotals();
    const qtyForPricing = typeTotals[type] || parseInt(productDiv.querySelector('.edit-product-qty').value, 10) || 1;
    const price = getUnitPrice(type, qtyForPricing);
    const priceInput = productDiv.querySelector('.edit-product-price');
    if (priceInput) priceInput.value = price;
    calculateEditPrices();
}
function removeEditProductRow(id) {
    const productDiv = document.getElementById(`edit-product-${id}`);
    if (productDiv) productDiv.remove();
    refreshEditProductPrices();
}
function getOrderCoupon(order) {
    if (!order) return null;
    const relatedCoupon = coupons.find(coupon =>
        (order.couponId && coupon.id === order.couponId) ||
        (order.couponCode && coupon.code === order.couponCode)
    );
    if (relatedCoupon) return relatedCoupon;
    if (order.couponCode || Number(order.couponDiscount) > 0) {
        return sanitizeCoupon({
            id: order.couponId || `LEGACY-${order.id || Date.now()}`,
            code: order.couponCode || 'CUPON-APLICADO',
            status: 'active',
            used: false,
            discountAmount: Number(order.couponDiscount) || COUPON_FIXED_AMOUNT,
            minPurchase: COUPON_MIN_PURCHASE,
            notStackableWithWholesale: true
        });
    }
    return null;
}
function calculateEditTotalsFromProducts(products, previousOrder) {
    const subtotal = products.reduce((sum, product) => sum + (product.qty * product.price), 0);
    const coupon = getOrderCoupon(previousOrder);
    const couponValidation = coupon ? getCouponValidation(coupon, products, { allowHistoricalCoupon: true }) : { valid: false, discount: 0 };
    const couponDiscount = couponValidation.valid ? couponValidation.discount : 0;
    const total = Math.max(0, subtotal - couponDiscount);
    return { subtotal, couponDiscount, total };
}
function getEditProductsFromForm() {
    const products = [];
    let valid = true;
    document.querySelectorAll('#editProductsList .product-item').forEach(item => {
        const type = normalizeProductType(item.querySelector('.edit-product-type').value);
        const gender = item.querySelector('.edit-product-gender').value;
        const color = item.querySelector('.edit-product-color').value;
        const size = item.querySelector('.edit-product-size').value;
        const qty = parseInt(item.querySelector('.edit-product-qty').value, 10) || 0;
        const price = parseFloat(item.querySelector('.edit-product-price').value) || 0;
        const customPrice = isEditProductCustomPrice(item);
        if (qty <= 0 || price < 0) valid = false;
        if (qty > 0) products.push({ type, gender, color, size, qty, price, customPrice });
    });
    return { products, valid };
}
function getSafeOrderMoney(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function calculateEditPrices() {
    const orderId = document.getElementById('editOrderId') ? document.getElementById('editOrderId').value : '';
    const existingOrder = orders.find(order => order.id === orderId) || {};
    const { products } = getEditProductsFromForm();
    const totals = calculateEditTotalsFromProducts(products, existingOrder);
    const advanceInput = document.getElementById('editAdvance');
    let advance = editAdvanceManual
        ? getSafeOrderMoney(advanceInput ? advanceInput.value : 0, 0)
        : getAutomaticAdvance(totals.total);
    if (advance < 0) advance = 0;
    if (advanceInput && !editAdvanceManual) advanceInput.value = advance;
    const remaining = totals.total - advance;
    const displaySubtotal = document.getElementById('editDisplaySubtotal');
    const displayCouponDiscount = document.getElementById('editDisplayCouponDiscount');
    const displayTotal = document.getElementById('editDisplayTotal');
    const displayRemaining = document.getElementById('editDisplayRemaining');
    if (displaySubtotal) displaySubtotal.textContent = '$' + totals.subtotal.toLocaleString();
    if (displayCouponDiscount) displayCouponDiscount.textContent = '-$' + totals.couponDiscount.toLocaleString();
    if (displayTotal) displayTotal.textContent = '$' + totals.total.toLocaleString();
    if (displayRemaining) displayRemaining.textContent = '$' + remaining.toLocaleString();
    return { ...totals, advance, remaining };
}
async function saveEditOrder() {
    const orderId = document.getElementById('editOrderId').value;
    const customerName = document.getElementById('editCustomerName').value.trim();
    const orderDate = document.getElementById('editOrderDate').value;
    const technique = document.getElementById('editTechnique').value;
    const status = document.getElementById('editStatus').value;
    if (!customerName || !orderDate) {
        showNotification('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    const { products, valid } = getEditProductsFromForm();
    if (!valid) {
        showNotification('❌ Cantidad debe ser mayor a cero y precio no puede ser negativo', 'error');
        return;
    }
    if (products.length === 0) {
        showNotification('Por favor agrega al menos un producto', 'error');
        return;
    }
    const totalQty = products.reduce((sum, product) => sum + product.qty, 0);
    const shirtCost = parseFloat(document.getElementById('editShirtCost').value) || 0;
    const shirtCostKids = parseFloat(document.getElementById('editShirtCostKids') ? document.getElementById('editShirtCostKids').value : 0) || 0;
    const dtfCost = parseFloat(document.getElementById('editDtfCost').value) || 0;
    const extraCost = parseFloat(document.getElementById('editExtraCost').value) || 0;
    const orderCosts = calculateOrderCosts(totalQty, shirtCost, dtfCost, extraCost, shirtCostKids, products);
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
        showNotification('Pedido no encontrado', 'error');
        return;
    }
    const previousOrder = orders[orderIndex];
    const editTotals = calculateEditTotalsFromProducts(products, previousOrder);
    let advance = getSafeOrderMoney(document.getElementById('editAdvance').value, 0);
    if (advance < 0) advance = 0;
    const updatedOrder = {
        ...previousOrder,
        customerName,
        date: orderDate,
        technique,
        status,
        products,
        subtotal: editTotals.subtotal,
        couponDiscount: editTotals.couponDiscount,
        total: editTotals.total,
        totalQty,
        advance,
        remaining: editTotals.total - advance,
        paid: advance >= editTotals.total,
        shirtCost,
        shirtCostKids,
        dtfCost,
        extraCosts: extraCost,
        costTotal: orderCosts.costTotal,
        netProfit: editTotals.total - orderCosts.costTotal
    };
    orders[orderIndex] = updatedOrder;
    try {
        await persistOrderToDatabase(updatedOrder);
    } catch (error) {
        console.error(error);
        orders[orderIndex] = previousOrder;
        showNotification('❌ No se pudieron guardar los cambios en Supabase.', 'error');
        return;
    }
    if (updatedOrder.status === 'Entregado') maybeCreateCouponFromOrder(updatedOrder);
    const saveResult = saveData();
    persistCouponsToDatabase().catch(console.error);
    if (!saveResult.saved) {
        showNotification('Pedido actualizado en Supabase. No se pudo actualizar el respaldo local.', 'warning');
    }
    closeModal('editOrderModal');
    renderAll();
    if (saveResult.strippedMedia) {
        showNotification('✅ Pedido actualizado. Las imágenes pesadas se omitieron para evitar llenar localStorage.', 'warning');
        return;
    }
    showNotification('✅ Pedido actualizado exitosamente', 'success');
}

