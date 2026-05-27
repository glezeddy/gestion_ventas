// ============================================================================
// CÓDIGO JAVASCRIPT COMPLETO (con validaciones, backup, impresión con logo)
// ============================================================================

// Data Store
let customers = [];
let orders = [];
let coupons = [];
let currentOrderId = null;
let currentCouponForOrder = null;
let editingCouponId = null;
let editingCustomerId = null;
let currentFilter = 'all';
let productCounter = 0;
let editProductCounter = 0;
const STORAGE_KEYS = { orders: 'estampados_orders', customers: 'estampados_customers', coupons: 'estampados_coupons' };
const SUPABASE_URL = 'https://caubwxywjiuzrevdbnlt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_y9VdK2iRlUx7Wu9NFQJlJg_M5Ehe38N';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;
const TEST_DATA_PREFIX = 'TEST-';
const TEST_CUSTOMER_PREFIX = 'Cliente TEST';
const TEST_COUPON_PREFIX = 'TEST100-';
const COUPON_FIXED_AMOUNT = 100;
const COUPON_MIN_PURCHASE = 600;
let warnedMissingCouponTable = false;
let warnedMissingOrderColumns = false;

// Paleta de colores (simplificada para mantener funcionalidad)
const eurocottonColors = {
    'Básicos': {'Blanco': '#FFFFFF', 'Negro': '#1a1a1a', 'Oxford': '#6B7280', 'Carbón': '#374151', 'Marino': '#1e3a5f', 'Rey/Royal Blue': '#4169e1', 'Rojo': '#dc2626', 'Vino': '#722f37'},
    'Jaspe': {'Sport Grey': '#9CA3AF', 'Carbón Jaspe': '#4B5563', 'Marino Jaspe': '#3B5998'},
    'Claros/Pastel': {'Perla': '#F3F4F6', 'Aqua': '#7DD3FC', 'Cielo': '#BAE6FD', 'Celeste': '#60A5FA', 'Rosa': '#F9A8D4', 'Salmón': '#FCA5A5', 'Menta': '#A7F3D0', 'Hueso': '#FEF3C7', 'Arena': '#FDE68A'},
    'Vivos y Neón': {'Amarillo': '#FBBF24', 'Canario': '#FCD34D', 'Naranja': '#F97316', 'Heliconia/Fucsia': '#EC4899', 'Limón': '#D9F99D', 'Morado': '#8B5CF6', 'Flavina/Neon Yellow': '#ECFCB6', 'Verde Neón': '#84CC16'},
    'Especiales': {'Perry': '#6B7280', 'Bandera/Forest Green': '#166534', 'Botella': '#14532D', 'Militar': '#4a5d23', 'Tabaco/Dark Brown': '#78350F', 'Kaki': '#92400E', 'Turquesa': '#14B8A6', 'Petróleo/Graphite': '#374151'}
};

// Tablas de precios
const priceTables = {
    'Playera Básica': [{ min: 1, max: 5, price: 300 }, { min: 6, max: 11, price: 260 }, { min: 12, max: 23, price: 240 }, { min: 24, max: 49, price: 225 }, { min: 50, max: Infinity, price: 210 }],
    'Dry Fit': [{ min: 1, max: 5, price: 300 }, { min: 6, max: 11, price: 260 }, { min: 12, max: 23, price: 240 }, { min: 24, max: 49, price: 225 }, { min: 50, max: Infinity, price: 210 }],
    'Camiseta tipo Polo': [{ min: 1, max: 5, price: 480 }, { min: 6, max: 10, price: 455 }, { min: 11, max: 15, price: 440 }, { min: 16, max: 23, price: 425 }, { min: 24, max: 49, price: 410 }, { min: 50, max: Infinity, price: 390 }],
    'Hoodie': [{ min: 1, max: 5, price: 530 }, { min: 6, max: 10, price: 450 }, { min: 11, max: 15, price: 430 }, { min: 16, max: 23, price: 415 }, { min: 24, max: 49, price: 400 }, { min: 50, max: Infinity, price: 380 }],
    'Sudadera': [{ min: 1, max: 5, price: 530 }, { min: 6, max: 10, price: 450 }, { min: 11, max: 15, price: 430 }, { min: 16, max: 23, price: 415 }, { min: 24, max: 49, price: 400 }, { min: 50, max: Infinity, price: 380 }],
	'Playera Niño': [{ min: 1, max: 5, price: 240 }, { min: 6, max: 10, price: 220 }, { min: 11, max: 15, price: 210 }, { min: 16, max: 23, price: 200 }, { min: 24, max: 49, price: 190 }, { min: 50, max: Infinity, price: 180 }],
    'Polo Niño': [{ min: 1, max: 5, price: 400 }, { min: 6, max: 11, price: 360 }, { min: 12, max: 23, price: 330 }, { min: 24, max: 49, price: 310 }, { min: 50, max: Infinity, price: 290 }],
    'Dry Fit Niño': [{ min: 1, max: 5, price: 280 }, { min: 6, max: 11, price: 240 }, { min: 12, max: 23, price: 220 }, { min: 24, max: 49, price: 205 }, { min: 50, max: Infinity, price: 190 }],
    'Hoodie Niño': [{ min: 1, max: 5, price: 500 }, { min: 6, max: Infinity, price: 430 }],
};

function normalizeProductType(productType) {
    const raw = String(productType || '').trim();
    const aliases = {
        'Playera B?sica': 'Playera Básica',
        'Playera Basica': 'Playera Básica',
        'Playera b&aacute;sica': 'Playera Básica',
        'Playera básica': 'Playera Básica',
        'Playera Ni?o': 'Playera Niño',
        'Playera Nino': 'Playera Niño',
        'Dry Fit Ni?o': 'Dry Fit Niño',
        'Dry Fit Nino': 'Dry Fit Niño',
        'Polo Ni?o': 'Polo Niño',
        'Polo Nino': 'Polo Niño',
        'Hoodie Ni?o': 'Hoodie Niño',
        'Hoodie Nino': 'Hoodie Niño',
        'Polo': 'Camiseta tipo Polo'
    };
    return aliases[raw] || raw || 'Playera Básica';
}
function getUnitPrice(productType, quantity) {
    const normalizedType = normalizeProductType(productType);
    const priceTable = priceTables[normalizedType];
    if (!priceTable) return 300;
    const qty = Math.max(1, Number(quantity) || 1);
    for (const tier of priceTable) {
        if (qty >= tier.min && qty <= tier.max) return tier.price;
    }
    return 300;
}
function getCouponAmount(coupon) {
    return Math.max(0, Number(coupon && (coupon.discountAmount ?? coupon.fixedDiscount ?? coupon.couponAmount)) || COUPON_FIXED_AMOUNT);
}
function getCouponMinimum(coupon) {
    return Math.max(0, Number(coupon && (coupon.minPurchase ?? coupon.minimumPurchase)) || COUPON_MIN_PURCHASE);
}
function getProductQuantityTotals(products) {
    return (Array.isArray(products) ? products : []).reduce((totals, product) => {
        const type = normalizeProductType(product.type);
        totals[type] = (totals[type] || 0) + (Number(product.qty) || 0);
        return totals;
    }, {});
}
function hasWholesalePricing(products) {
    return Object.values(getProductQuantityTotals(products)).some(qty => qty >= 6);
}
function hasCustomPromotionalPricing(products) {
    return (Array.isArray(products) ? products : []).some(product => Boolean(product.customPrice || product.priceMode === 'custom'));
}
function getCouponValidation(coupon, products, options = {}) {
    const code = String(coupon && coupon.code || '').trim().toUpperCase();
    if (!coupon || !code) return { valid: false, message: 'El código de cupón no es válido.', discount: 0 };
    if ((coupon.status === 'used' || coupon.used) && !options.allowHistoricalCoupon) return { valid: false, message: 'Este cupón ya fue utilizado.', discount: 0 };
    if (coupon.status === 'pending') return { valid: false, message: 'Este cupón todavía no está activo.', discount: 0 };
    if (coupon.status === 'expired') return { valid: false, message: 'Este cupón está vencido.', discount: 0 };
    if (coupon.status !== 'active' && !options.allowHistoricalCoupon) return { valid: false, message: 'Este cupón todavía no está activo.', discount: 0 };

    const subtotal = (Array.isArray(products) ? products : []).reduce((sum, product) => sum + ((Number(product.qty) || 0) * (Number(product.price) || 0)), 0);
    const minPurchase = getCouponMinimum(coupon);
    if (subtotal < minPurchase) return { valid: false, message: `El cupón requiere una compra mínima de ${formatTicketMoney(minPurchase)} MXN.`, discount: 0 };
    if (coupon.notStackableWithWholesale !== false && hasWholesalePricing(products)) return { valid: false, message: 'Este cupón no es acumulable con precios de mayoreo.', discount: 0 };
    if (hasCustomPromotionalPricing(products)) return { valid: false, message: 'Este cupón no es acumulable con precios personalizados, promociones u otros descuentos.', discount: 0 };

    const discount = Math.min(getCouponAmount(coupon), subtotal);
    return { valid: true, message: `Cupón válido: ${formatTicketMoney(discount)} MXN de descuento aplicado.`, discount, subtotal };
}

