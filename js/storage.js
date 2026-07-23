function canUseLocalStorage() {
    try {
        const testKey = '__prin_epic_storage_test__';
        localStorage.setItem(testKey, 'ok');
        localStorage.removeItem(testKey);
        return true;
    } catch (error) {
        return false;
    }
}
function isQuotaExceededError(error) {
    return Boolean(error) && (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
    );
}
function sanitizeCustomer(customer) {
    if (!customer || typeof customer !== 'object') return null;
    const name = String(customer.name || '').trim();
    if (!name) return null;
    return {
        id: customer.id || Date.now() + Math.floor(Math.random() * 1000),
        dbId: customer.dbId || customer.db_id || (String(customer.id || '').includes('-') ? customer.id : ''),
        name,
        phone: String(customer.phone || customer.telefono || '').trim(),
        email: String(customer.email || '').trim(),
        date: normalizeDateValue(customer.date)
    };
}
function sanitizeProduct(product) {
    if (!product || typeof product !== 'object') return null;
    const qty = Math.max(0, Number(product.qty) || 0);
    const price = Math.max(0, Number(product.price) || 0);
    if (!qty) return null;
    return {
        type: normalizeProductType(product.type || 'Playera Básica'),
        gender: product.gender || 'Caballero',
        color: product.color || 'Blanco',
        size: product.size || 'M',
        qty,
        price,
        customPrice: Boolean(product.customPrice || product.priceMode === 'custom')
    };
}
function getFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function getStoredOrderAdvance(order) {
    return Math.max(0, getFiniteNumber(
        order.advance ?? order.monto_pagado ?? order.amount_paid ?? order.deposito ?? order.deposit,
        0
    ));
}
function sanitizeOrder(order) {
    if (!order || typeof order !== 'object') return null;
    const id = String(order.id || '').trim();
    const customerName = String(order.customerName || '').trim();
    if (!id || !customerName) return null;
    const products = Array.isArray(order.products) ? order.products.map(sanitizeProduct).filter(Boolean) : [];
    const totalFromProducts = products.reduce((sum, product) => sum + (product.qty * product.price), 0);
    const parsedTotal = Number(order.total);
    const hasStoredTotal = order.total !== null && order.total !== undefined && order.total !== '';
    const total = Math.max(0, hasStoredTotal && Number.isFinite(parsedTotal) ? parsedTotal : totalFromProducts);
    const totalQty = products.length ? products.reduce((sum, product) => sum + product.qty, 0) : Math.max(0, Number(order.totalQty) || 0);
    const advance = getStoredOrderAdvance(order);
    const remaining = total - advance;
    const shirtCost = Math.max(0, Number(order.shirtCost) || 0);
    const shirtCostKids = Math.max(0, Number(order.shirtCostKids) || Number(order.kidsShirtCost) || 0);
    const dtfCost = Math.max(0, Number(order.dtfCost) || 0);
    const extraCosts = Math.max(0, Number(order.extraCosts) || Number(order.extraCost) || 0);
    const adultQty = products.reduce((sum, product) => sum + (/niño|nino/i.test(product.type) ? 0 : product.qty), 0);
    const kidsQty = products.reduce((sum, product) => sum + (/niño|nino/i.test(product.type) ? product.qty : 0), 0);
    const costTotal = Math.max(0, Number(order.costTotal) || ((shirtCost * adultQty) + (shirtCostKids * kidsQty) + dtfCost + extraCosts));
    const parsedNetProfit = Number(order.netProfit);
    return {
        id,
        customerName,
        customerPhone: String(order.customerPhone || order.phone || '').trim(),
        date: normalizeOrderDateForLocalTimezone(order.date),
        products,
        technique: order.technique || 'Serigrafía',
        subtotal: Math.max(0, getFiniteNumber(order.subtotal, total)),
        couponCode: order.couponCode || '',
        couponId: order.couponId || '',
        couponDiscount: Math.max(0, Number(order.couponDiscount) || 0),
        total,
        totalQty,
        advance,
        remaining,
        status: normalizeOrderStatus(order.status),
        paid: Boolean(order.paid || advance >= total),
        shirtCost,
        shirtCostKids,
        dtfCost,
        extraCosts,
        costTotal,
        netProfit: Number.isFinite(parsedNetProfit) ? parsedNetProfit : Math.max(0, total - costTotal)
    };
}
function sanitizeCoupon(coupon) {
    if (!coupon || typeof coupon !== 'object') return null;
    const code = String(coupon.code || '').trim().toUpperCase();
    if (!code) return null;
    const defaults = getDefaultCouponRequirements();
    const status = ['pending', 'active', 'used', 'expired'].includes(coupon.status) ? coupon.status : 'pending';
    return {
        id: coupon.id || `CP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code,
        customerName: String(coupon.customerName || '').trim(),
        customerPhone: String(coupon.customerPhone || '').trim(),
        orderId: String(coupon.orderId || '').trim(),
        reason: String(coupon.reason || '').trim(),
        source: String(coupon.source || '').trim(),
        discountType: 'fixed',
        discountAmount: getCouponAmount(coupon),
        minPurchase: getCouponMinimum(coupon),
        notStackableWithWholesale: coupon.notStackableWithWholesale !== false,
        status,
        createdAt: coupon.createdAt || new Date().toISOString(),
        expiresAt: coupon.expiresAt || '',
        usedAt: coupon.usedAt || null,
        usedOrderId: coupon.usedOrderId || '',
        used: Boolean(coupon.used || status === 'used'),
        requirements: { ...defaults, ...(coupon.requirements || {}) }
    };
}
function dedupeOrdersById(orderList) {
    const seen = new Set();
    return orderList.filter(order => {
        if (!order || !order.id || seen.has(order.id)) return false;
        seen.add(order.id);
        return true;
    });
}
function dedupeCustomersByName(customerList) {
    const merged = new Map();
    customerList.map(sanitizeCustomer).filter(Boolean).forEach(customer => {
        if (!customer || !customer.name) return false;
        const key = customer.name.toLowerCase();
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, customer);
            return;
        }
        merged.set(key, sanitizeCustomer({
            ...existing,
            ...customer,
            id: existing.id || customer.id,
            dbId: existing.dbId || customer.dbId,
            phone: customer.phone || existing.phone || '',
            email: customer.email || existing.email || '',
            date: existing.date || customer.date
        }));
    });
    return Array.from(merged.values());
}
function syncCustomersFromOrders() {
    const mergedCustomers = [...customers];
    const knownNames = new Set(mergedCustomers.map(customer => customer.name.toLowerCase()));
    orders.forEach(order => {
        const normalizedName = String(order.customerName || '').trim();
        const key = normalizedName.toLowerCase();
        if (!normalizedName || knownNames.has(key)) return;
        knownNames.add(key);
        mergedCustomers.push({
            id: Date.now() + mergedCustomers.length,
            name: normalizedName,
            phone: order.customerPhone || '',
            email: '',
            date: normalizeDateValue(order.date)
        });
    });
    customers = dedupeCustomersByName(mergedCustomers.map(sanitizeCustomer).filter(Boolean));
}
function mergeCustomers(...customerLists) {
    return dedupeCustomersByName(customerLists.flat().map(sanitizeCustomer).filter(Boolean));
}
function getStorageSnapshot(includeMedia = true) {
    const normalizedOrders = dedupeOrdersById((Array.isArray(orders) ? orders : []).map(sanitizeOrder).filter(Boolean));
    orders = normalizedOrders;
    syncCustomersFromOrders();
    customers = dedupeCustomersByName((Array.isArray(customers) ? customers : []).map(sanitizeCustomer).filter(Boolean));
    coupons = (Array.isArray(coupons) ? coupons : []).map(sanitizeCoupon).filter(Boolean);
    return {
        orders: normalizedOrders,
        customers,
        coupons
    };
}
function saveData(options = {}) {
    const { notify = false } = options;
    if (!canUseLocalStorage()) {
        if (notify) showNotification('No fue posible acceder a localStorage en este navegador.', 'warning');
        return { saved: false, unavailable: true, strippedMedia: false };
    }
    const snapshot = getStorageSnapshot(true);
    try {
        localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(snapshot.orders));
        localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(snapshot.customers));
        localStorage.setItem(STORAGE_KEYS.coupons, JSON.stringify(snapshot.coupons));
        if (notify) showNotification('Pedidos guardados correctamente en este navegador.', 'success');
        return { saved: true, unavailable: false, strippedMedia: false };
    } catch (error) {
        if (!isQuotaExceededError(error)) throw error;
        const lightSnapshot = getStorageSnapshot(false);
        try {
            localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(lightSnapshot.orders));
            localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(lightSnapshot.customers));
            localStorage.setItem(STORAGE_KEYS.coupons, JSON.stringify(lightSnapshot.coupons));
            orders = lightSnapshot.orders;
            if (notify) {
                showNotification('Se guardaron los pedidos, pero sin imágenes pesadas para evitar llenar localStorage.', 'warning');
            }
            return { saved: true, unavailable: false, strippedMedia: true };
        } catch (fallbackError) {
            if (!isQuotaExceededError(fallbackError)) throw fallbackError;
            if (notify) showNotification('No se pudieron guardar los pedidos porque localStorage está lleno.', 'error');
            return { saved: false, unavailable: false, strippedMedia: false };
        }
    }
}
function loadData(options = {}) {
    const { notify = false } = options;
    if (!canUseLocalStorage()) {
        orders = [];
        customers = [];
        if (notify) showNotification('localStorage no está disponible. La página seguirá funcionando sin datos guardados.', 'warning');
        return { loaded: false, unavailable: true };
    }
    const savedOrders = localStorage.getItem(STORAGE_KEYS.orders);
    const savedCustomers = localStorage.getItem(STORAGE_KEYS.customers);
    const savedCoupons = localStorage.getItem(STORAGE_KEYS.coupons);
    let parsedOrders = [];
    let parsedCustomers = [];
    let parsedCoupons = [];
    try { parsedOrders = savedOrders ? JSON.parse(savedOrders) : []; } catch (error) { parsedOrders = []; }
    try { parsedCustomers = savedCustomers ? JSON.parse(savedCustomers) : []; } catch (error) { parsedCustomers = []; }
    try { parsedCoupons = savedCoupons ? JSON.parse(savedCoupons) : []; } catch (error) { parsedCoupons = []; }
    orders = dedupeOrdersById((Array.isArray(parsedOrders) ? parsedOrders : []).map(sanitizeOrder).filter(Boolean));
    customers = dedupeCustomersByName((Array.isArray(parsedCustomers) ? parsedCustomers : []).map(sanitizeCustomer).filter(Boolean));
    coupons = (Array.isArray(parsedCoupons) ? parsedCoupons : []).map(sanitizeCoupon).filter(Boolean);
    syncCustomersFromOrders();
    if (notify) {
        if (orders.length || customers.length) showNotification('Pedidos cargados desde localStorage.', 'success');
        else showNotification('No hay pedidos guardados aún. Puedes empezar desde cero.', 'warning');
    }
    return { loaded: true, unavailable: false };
}
function readStoredCouponsFallback() {
    if (!canUseLocalStorage()) return coupons;
    try {
        const savedCoupons = localStorage.getItem(STORAGE_KEYS.coupons);
        return savedCoupons ? JSON.parse(savedCoupons) : [];
    } catch (error) {
        return coupons;
    }
}
function readStoredCustomersFallback() {
    if (!canUseLocalStorage()) return customers;
    try {
        const savedCustomers = localStorage.getItem(STORAGE_KEYS.customers);
        return savedCustomers ? JSON.parse(savedCustomers) : [];
    } catch (error) {
        return customers;
    }
}
function saveOrdersToStorage() {
    saveData({ notify: true });
}
async function loadOrdersFromStorage() {
    try {
        await loadDataFromDatabase({ notify: true });
    } catch (error) {
        console.error(error);
        loadData({ notify: true });
        renderAll();
        showNotification('No se pudo cargar Supabase. Se usó respaldo local.', 'warning');
    }
}
function generateOrderId(dateValue = new Date()) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const prefix = `PE-${year}${month}-`;
    const maxSequence = orders.reduce((max, order) => {
        if (!order || typeof order.id !== 'string' || !order.id.startsWith(prefix)) return max;
        const numericPart = parseInt(order.id.slice(prefix.length), 10);
        return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
    }, 0);
    return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
}

function isSupabaseReady() {
    return Boolean(supabaseClient);
}
function toDbOrder(order) {
    const normalized = sanitizeOrder(order);
    const safeOrder = normalized || order || {};
    return {
        id: safeOrder.id,
        customer_name: safeOrder.customerName,
        customer_phone: safeOrder.customerPhone || '',
        order_date: safeOrder.date,
        technique: safeOrder.technique,
        status: safeOrder.status,
        subtotal: getFiniteNumber(safeOrder.subtotal, safeOrder.total),
        coupon_code: safeOrder.couponCode || '',
        coupon_id: safeOrder.couponId || '',
        coupon_discount: getFiniteNumber(safeOrder.couponDiscount, 0),
        total: getFiniteNumber(safeOrder.total, 0),
        total_qty: getFiniteNumber(safeOrder.totalQty, 0),
        advance: getStoredOrderAdvance(safeOrder),
        remaining: getFiniteNumber(safeOrder.total, 0) - getStoredOrderAdvance(safeOrder),
        paid: Boolean(safeOrder.paid),
        shirt_cost: getFiniteNumber(safeOrder.shirtCost, 0),
        shirt_cost_kids: getFiniteNumber(safeOrder.shirtCostKids, 0),
        dtf_cost: getFiniteNumber(safeOrder.dtfCost, 0),
        extra_costs: getFiniteNumber(safeOrder.extraCosts, 0),
        cost_total: getFiniteNumber(safeOrder.costTotal, 0),
        net_profit: getFiniteNumber(safeOrder.netProfit, 0),
        updated_at: new Date().toISOString()
    };
}
function toLegacyDbOrder(order) {
    const normalized = sanitizeOrder(order);
    const safeOrder = normalized || order || {};
    return {
        id: safeOrder.id,
        customer_name: safeOrder.customerName,
        order_date: safeOrder.date,
        technique: safeOrder.technique,
        status: safeOrder.status,
        total: getFiniteNumber(safeOrder.total, 0),
        total_qty: getFiniteNumber(safeOrder.totalQty, 0),
        advance: getStoredOrderAdvance(safeOrder),
        remaining: getFiniteNumber(safeOrder.total, 0) - getStoredOrderAdvance(safeOrder),
        paid: Boolean(safeOrder.paid),
        shirt_cost: getFiniteNumber(safeOrder.shirtCost, 0),
        dtf_cost: getFiniteNumber(safeOrder.dtfCost, 0),
        extra_costs: getFiniteNumber(safeOrder.extraCosts, 0),
        cost_total: getFiniteNumber(safeOrder.costTotal, 0),
        net_profit: getFiniteNumber(safeOrder.netProfit, 0),
        updated_at: new Date().toISOString()
    };
}
function toDbOrderItems(order) {
    return (order.products || []).map(product => ({
        order_id: order.id,
        type: product.type,
        gender: product.gender,
        color: product.color,
        size: product.size,
        qty: Number(product.qty) || 0,
        price: Number(product.price) || 0,
        custom_price: Boolean(product.customPrice || product.priceMode === 'custom'),
        line_total: (Number(product.qty) || 0) * (Number(product.price) || 0)
    }));
}
function toLegacyDbOrderItems(order) {
    return (order.products || []).map(product => ({
        order_id: order.id,
        type: product.type,
        gender: product.gender,
        color: product.color,
        size: product.size,
        qty: Number(product.qty) || 0,
        price: Number(product.price) || 0,
        line_total: (Number(product.qty) || 0) * (Number(product.price) || 0)
    }));
}
function fromDbOrder(row, items = []) {
    return sanitizeOrder({
        id: row.id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone || row.phone || '',
        date: row.order_date,
        products: items.map(item => ({
            type: item.type,
            gender: item.gender,
            color: item.color,
            size: item.size,
            qty: Number(item.qty) || 0,
            price: Number(item.price) || 0,
            customPrice: Boolean(item.custom_price)
        })),
        technique: row.technique,
        subtotal: row.subtotal,
        couponCode: row.coupon_code || '',
        couponId: row.coupon_id || '',
        couponDiscount: Number(row.coupon_discount) || 0,
        total: row.total,
        totalQty: row.total_qty,
        advance: row.advance ?? row.monto_pagado ?? row.amount_paid ?? row.deposito ?? row.deposit,
        remaining: row.remaining ?? row.saldo_restante ?? row.remaining_balance,
        status: row.status,
        paid: Boolean(row.paid),
        shirtCost: Number(row.shirt_cost) || 0,
        shirtCostKids: Number(row.shirt_cost_kids) || 0,
        dtfCost: Number(row.dtf_cost) || 0,
        extraCosts: Number(row.extra_costs) || 0,
        costTotal: Number(row.cost_total) || 0,
        netProfit: Number(row.net_profit) || 0
    });
}
function toDbCoupon(coupon) {
    const normalized = sanitizeCoupon(coupon);
    if (!normalized) return null;
    return {
        id: normalized.id,
        code: normalized.code,
        customer_name: normalized.customerName,
        customer_phone: normalized.customerPhone,
        order_id: normalized.orderId,
        discount_type: 'fixed',
        discount_amount: getCouponAmount(normalized),
        min_purchase: getCouponMinimum(normalized),
        not_stackable_with_wholesale: normalized.notStackableWithWholesale !== false,
        status: normalized.status,
        created_at: normalized.createdAt,
        used_at: normalized.usedAt,
        used_order_id: normalized.usedOrderId || null,
        used: Boolean(normalized.used || normalized.status === 'used'),
        requirements: normalized.requirements || getDefaultCouponRequirements(),
        updated_at: new Date().toISOString()
    };
}
function fromDbCoupon(row) {
    return sanitizeCoupon({
        id: row.id,
        code: row.code,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        orderId: row.order_id,
        discountType: row.discount_type,
        discountAmount: row.discount_amount,
        minPurchase: row.min_purchase,
        notStackableWithWholesale: row.not_stackable_with_wholesale,
        status: row.status,
        createdAt: row.created_at,
        usedAt: row.used_at,
        usedOrderId: row.used_order_id,
        used: row.used,
        requirements: row.requirements
    });
}
function toDbCustomer(customer) {
    const normalized = sanitizeCustomer(customer);
    if (!normalized) return null;
    return {
        name: normalized.name,
        phone: normalized.phone || null,
        email: normalized.email || null,
        updated_at: new Date().toISOString()
    };
}
function fromDbCustomer(row) {
    return sanitizeCustomer({
        id: row.id,
        dbId: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        date: row.created_at ? String(row.created_at).slice(0, 10) : row.date
    });
}
async function loadCustomersFromDatabase() {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabaseClient
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.warn('No se pudieron cargar clientes desde Supabase. Se usará respaldo local.', error);
        return [];
    }
    return (data || []).map(fromDbCustomer).filter(Boolean);
}
async function persistCustomerToDatabase(customer) {
    if (!isSupabaseReady()) return { saved: false, skipped: true };
    const normalized = sanitizeCustomer(customer);
    const payload = toDbCustomer(normalized);
    if (!normalized || !payload) return { saved: false, skipped: true };
    if (normalized.dbId) {
        const { data, error } = await supabaseClient
            .from('customers')
            .update(payload)
            .eq('id', normalized.dbId)
            .select()
            .maybeSingle();
        if (!error && data) {
            const saved = fromDbCustomer(data);
            Object.assign(customer, saved);
            return { saved: true };
        }
    }
    const { data: existingRows, error: lookupError } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('name', normalized.name)
        .limit(1);
    if (lookupError) {
        console.warn('No se pudo buscar el cliente en Supabase.', lookupError);
        return { saved: false, fallback: true };
    }
    if (existingRows && existingRows.length) {
        const { data, error } = await supabaseClient
            .from('customers')
            .update(payload)
            .eq('id', existingRows[0].id)
            .select()
            .maybeSingle();
        if (error) {
            console.warn('No se pudo actualizar el cliente en Supabase.', error);
            return { saved: false, fallback: true };
        }
        const saved = fromDbCustomer(data || existingRows[0]);
        Object.assign(customer, saved);
        return { saved: true };
    }
    const { data, error } = await supabaseClient
        .from('customers')
        .insert(payload)
        .select()
        .maybeSingle();
    if (error) {
        console.warn('No se pudo guardar el cliente en Supabase.', error);
        return { saved: false, fallback: true };
    }
    const saved = fromDbCustomer(data);
    Object.assign(customer, saved);
    return { saved: true };
}
async function persistCustomersToDatabase(customerList = customers) {
    if (!isSupabaseReady()) return;
    await Promise.all((Array.isArray(customerList) ? customerList : []).map(customer => persistCustomerToDatabase(customer)));
}
async function deleteCustomerFromDatabase(customer) {
    if (!isSupabaseReady()) return { deleted: false, skipped: true };
    const normalized = sanitizeCustomer(customer);
    if (!normalized || !normalized.name) return { deleted: false, skipped: true };

    let customerId = normalized.dbId || '';
    if (!customerId) {
        const { data, error } = await supabaseClient
            .from('customers')
            .select('id,name,phone')
            .eq('name', normalized.name);
        if (error) {
            console.warn('No se pudo buscar el cliente para eliminar en Supabase.', error);
            return { deleted: false, error };
        }
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) return { deleted: true, missing: true };
        const targetPhone = String(normalized.phone || '').replace(/\D/g, '');
        const matches = targetPhone
            ? rows.filter(row => String(row.phone || '').replace(/\D/g, '') === targetPhone)
            : rows;
        if (matches.length !== 1) {
            return { deleted: false, ambiguous: true };
        }
        if (!targetPhone && rows.length !== 1) {
            return { deleted: false, ambiguous: true };
        }
        customerId = matches[0].id;
    }
    if (!customerId) return { deleted: true, missing: true };

    const { error } = await supabaseClient
        .from('customers')
        .delete()
        .eq('id', customerId);
    if (error) {
        console.warn('No se pudo eliminar el cliente en Supabase.', error);
        return { deleted: false, error };
    }
    return { deleted: true };
}
function mergeCoupons(...couponLists) {
    const merged = new Map();
    couponLists.flat().map(sanitizeCoupon).filter(Boolean).forEach(coupon => {
        const key = coupon.id || coupon.code;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, coupon);
            return;
        }
        const combined = { ...existing, ...coupon };
        if (existing.used || coupon.used || existing.status === 'used' || coupon.status === 'used') {
            combined.used = true;
            combined.status = 'used';
            combined.usedAt = coupon.usedAt || existing.usedAt || new Date().toISOString();
            combined.usedOrderId = coupon.usedOrderId || existing.usedOrderId || '';
        }
        combined.requirements = { ...getDefaultCouponRequirements(), ...(existing.requirements || {}), ...(coupon.requirements || {}) };
        merged.set(key, sanitizeCoupon(combined));
    });
    return Array.from(merged.values());
}
async function loadCouponsFromDatabase() {
    if (!COUPONS_DATABASE_ENABLED || !isSupabaseReady()) return [];
    const { data, error } = await supabaseClient
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        if (!warnedMissingCouponTable) {
            console.warn('No se pudieron cargar cupones desde Supabase. Se usará respaldo local.', error);
            warnedMissingCouponTable = true;
        }
        return [];
    }
    return (data || []).map(fromDbCoupon).filter(Boolean);
}
async function persistCouponToDatabase(coupon) {
    if (!COUPONS_DATABASE_ENABLED || !isSupabaseReady()) return { saved: false, skipped: true };
    const payload = toDbCoupon(coupon);
    if (!payload) return { saved: false, skipped: true };
    const { error } = await supabaseClient.from('coupons').upsert(payload);
    if (error) {
        if (!warnedMissingCouponTable) {
            console.warn('No se pudo guardar el cupón en Supabase. Se conserva en localStorage.', error);
            warnedMissingCouponTable = true;
        }
        return { saved: false, fallback: true };
    }
    return { saved: true };
}
async function persistCouponsToDatabase(couponList = coupons) {
    if (!COUPONS_DATABASE_ENABLED || !isSupabaseReady()) return;
    await Promise.all((Array.isArray(couponList) ? couponList : []).map(coupon => persistCouponToDatabase(coupon)));
}
async function deleteAllCouponsFromDatabase() {
    if (!COUPONS_DATABASE_ENABLED || !isSupabaseReady()) return { deleted: false, skipped: true };
    const { error } = await supabaseClient.from('coupons').delete().neq('id', '');
    if (error) {
        if (!warnedMissingCouponTable) {
            console.warn('No se pudieron borrar cupones en Supabase. Se limpió el respaldo local.', error);
            warnedMissingCouponTable = true;
        }
        return { deleted: false, fallback: true };
    }
    return { deleted: true };
}
async function loadDataFromDatabase(options = {}) {
    const { notify = false } = options;
    if (!isSupabaseReady()) {
        loadData(options);
        return { loaded: false, fallback: true };
    }
    const localCoupons = readStoredCouponsFallback();
    const localCustomers = readStoredCustomersFallback();
    const { data: orderRows, error: ordersError } = await supabaseClient
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });
    if (ordersError) throw ordersError;
    const orderIds = (orderRows || []).map(order => order.id);
    let itemRows = [];
    if (orderIds.length) {
        const { data, error } = await supabaseClient
            .from('order_items')
            .select('*')
            .in('order_id', orderIds)
            .order('created_at', { ascending: true });
        if (error) throw error;
        itemRows = data || [];
    }
    const itemsByOrder = itemRows.reduce((map, item) => {
        if (!map[item.order_id]) map[item.order_id] = [];
        map[item.order_id].push(item);
        return map;
    }, {});
    orders = (orderRows || []).map(order => fromDbOrder(order, itemsByOrder[order.id] || [])).filter(Boolean);
    const dbCoupons = COUPONS_DATABASE_ENABLED ? await loadCouponsFromDatabase() : [];
    coupons = mergeCoupons(dbCoupons, localCoupons);
    const dbCustomers = await loadCustomersFromDatabase();
    customers = mergeCustomers(dbCustomers, localCustomers);
    if (COUPONS_DATABASE_ENABLED) persistCouponsToDatabase(coupons).catch(console.error);
    syncCustomersFromOrders();
    persistCustomersToDatabase(customers).catch(console.error);
    saveData();
    renderAll();
    if (notify) showNotification('Pedidos cargados desde Supabase.', 'success');
    return { loaded: true, fallback: false };
}
async function persistOrderToDatabase(order) {
    if (!isSupabaseReady()) return { saved: false, skipped: true };
    const { error: orderError } = await supabaseClient.from('orders').upsert(toDbOrder(order));
    if (orderError) {
        const { error: legacyError } = await supabaseClient.from('orders').upsert(toLegacyDbOrder(order));
        if (legacyError) throw legacyError;
        if (!warnedMissingOrderColumns) {
            console.warn('Supabase no tiene todavía las columnas nuevas de pedidos. Se guardó el pedido con el esquema anterior.', orderError);
            warnedMissingOrderColumns = true;
        }
    }
    const { error: deleteItemsError } = await supabaseClient.from('order_items').delete().eq('order_id', order.id);
    if (deleteItemsError) throw deleteItemsError;
    const items = toDbOrderItems(order);
    if (items.length) {
        const { error: itemsError } = await supabaseClient.from('order_items').insert(items);
        if (itemsError) {
            const { error: legacyItemsError } = await supabaseClient.from('order_items').insert(toLegacyDbOrderItems(order));
            if (legacyItemsError) throw legacyItemsError;
            if (!warnedMissingOrderColumns) {
                console.warn('Supabase no tiene todavía la columna custom_price en order_items. Se guardaron productos con el esquema anterior.', itemsError);
                warnedMissingOrderColumns = true;
            }
        }
    }
    return { saved: true };
}
async function deleteOrderFromDatabase(orderId) {
    if (!isSupabaseReady()) return { deleted: false, skipped: true };
    const { error } = await supabaseClient.from('orders').delete().eq('id', orderId);
    if (error) throw error;
    return { deleted: true };
}

const LAST_ACTIVE_SECTION_KEY = 'prinEpicActiveSection';
const LAST_ACTIVE_MODAL_KEY = 'prinEpicActiveModal';
const DEFAULT_SECTION_ID = 'dashboard';
