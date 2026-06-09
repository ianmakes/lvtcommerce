import { Product, Order, ShopSettings } from './types';

// Default Shop Settings
const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "GoldenCare Market",
  phone: "+234 803 123 4567", // Default sample contact number
  address: "12 Graceful Living Estate, Victoria Island, Lagos, Nigeria",
  paystackPublicKey: "", // Left blank for user to add test/live public key
  demoMode: true, // Run in Demo mode by default so payments work immediately out-of-the-box
  voiceAssistDefault: true,
  voiceRate: 0.95 // Slightly slower for elderly comprehension
};

// Seed Products
const SEED_PRODUCTS: Product[] = [
  {
    id: "prod-cane",
    name: "Premium Ergonomic Walking Cane",
    description: "An adjustable walking cane featuring a comfortable, contoured ergonomic handle that reduces hand fatigue. Built-in bright LED light for safe night walking and a slip-resistant pivot base for all-terrain stability.",
    category: "Mobility Aids",
    image: "https://images.unsplash.com/photo-1579684389782-64d84b5e902a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", // high quality cane placeholder image
    basePrice: 15000, // In Nigerian Naira (NGN) since Paystack is heavily used in NG/GH/KE/ZA
    attributes: [
      { name: "Handle Grip", options: ["Contoured Foam", "Solid Walnut Wood"] },
      { name: "Color", options: ["Classic Bronze", "Midnight Black", "Royal Silver"] }
    ],
    variants: [
      { id: "var-cane-foam-bronze", options: { "Handle Grip": "Contoured Foam", "Color": "Classic Bronze" }, price: 15000, stock: 12, sku: "GC-CANE-FB" },
      { id: "var-cane-foam-black", options: { "Handle Grip": "Contoured Foam", "Color": "Midnight Black" }, price: 15000, stock: 8, sku: "GC-CANE-FK" },
      { id: "var-cane-foam-silver", options: { "Handle Grip": "Contoured Foam", "Color": "Royal Silver" }, price: 15000, stock: 15, sku: "GC-CANE-FS" },
      { id: "var-cane-wood-bronze", options: { "Handle Grip": "Solid Walnut Wood", "Color": "Classic Bronze" }, price: 18500, stock: 5, sku: "GC-CANE-WB" },
      { id: "var-cane-wood-black", options: { "Handle Grip": "Solid Walnut Wood", "Color": "Midnight Black" }, price: 18500, stock: 4, sku: "GC-CANE-WK" },
      { id: "var-cane-wood-silver", options: { "Handle Grip": "Solid Walnut Wood", "Color": "Royal Silver" }, price: 18500, stock: 6, sku: "GC-CANE-WS" }
    ]
  },
  {
    id: "prod-pill",
    name: "Easy-Read Talking Pill Organizer",
    description: "A large-compartment 7-day pill organizer with a built-in alarm clock, blinking LED alerts, and a clear voice guide that reads out: 'Time to take your morning medication.' Massive labels for morning, afternoon, evening, and bedtime.",
    category: "Daily Care",
    image: "https://images.unsplash.com/photo-1631549916768-4119b255f9a4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    basePrice: 12000,
    attributes: [
      { name: "Alert Sound", options: ["Beep Only", "Beep + Voice Guide"] }
    ],
    variants: [
      { id: "var-pill-beep", options: { "Alert Sound": "Beep Only" }, price: 12000, stock: 20, sku: "GC-PILL-BO" },
      { id: "var-pill-voice", options: { "Alert Sound": "Beep + Voice Guide" }, price: 14500, stock: 10, sku: "GC-PILL-VG" }
    ]
  },
  {
    id: "prod-wrap",
    name: "Ultra-Soft Heated Joint Therapy Wrap",
    description: "Soothing thermal wrap featuring extra-large digital controls that are highly visible. Soft, plush microfiber cover is washable. Auto-shutoff timer ensures complete safety if you fall asleep.",
    category: "Wellness & Comfort",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    basePrice: 22000,
    attributes: [
      { name: "Target Area", options: ["Knee & Elbow", "Shoulder & Back"] }
    ],
    variants: [
      { id: "var-wrap-knee", options: { "Target Area": "Knee & Elbow" }, price: 22000, stock: 15, sku: "GC-WRAP-KE" },
      { id: "var-wrap-shoulder", options: { "Target Area": "Shoulder & Back" }, price: 25000, stock: 8, sku: "GC-WRAP-SB" }
    ]
  },
  {
    id: "prod-magnify",
    name: "Handheld Page Magnifier with LED Lights",
    description: "A rectangular magnifying glass designed to read newspapers, books, and medicine bottles easily. 3X primary magnification with a 10X spot lens. Heavy-duty easy-grip handle and 12 anti-glare LEDs.",
    category: "Daily Care",
    image: "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    basePrice: 8500,
    attributes: [],
    variants: [] // Base product with no variants
  },
  {
    id: "prod-slippers",
    name: "Orthopedic Memory Foam Slippers",
    description: "Slip-on slippers with wide openings and easy velcro closures. Features an extra-cushioned memory foam insole to support sensitive feet, swollen ankles, or joint discomfort.",
    category: "Wellness & Comfort",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    basePrice: 19500,
    attributes: [
      { name: "Size (EU)", options: ["38", "40", "42", "44"] },
      { name: "Color", options: ["Warm Charcoal", "Soft Navy Blue"] }
    ],
    variants: [
      { id: "var-slip-38-char", options: { "Size (EU)": "38", "Color": "Warm Charcoal" }, price: 19500, stock: 8, sku: "GC-SLIP-38C" },
      { id: "var-slip-38-navy", options: { "Size (EU)": "38", "Color": "Soft Navy Blue" }, price: 19500, stock: 6, sku: "GC-SLIP-38N" },
      { id: "var-slip-40-char", options: { "Size (EU)": "40", "Color": "Warm Charcoal" }, price: 19500, stock: 12, sku: "GC-SLIP-40C" },
      { id: "var-slip-40-navy", options: { "Size (EU)": "40", "Color": "Soft Navy Blue" }, price: 19500, stock: 11, sku: "GC-SLIP-40N" },
      { id: "var-slip-42-char", options: { "Size (EU)": "42", "Color": "Warm Charcoal" }, price: 19500, stock: 14, sku: "GC-SLIP-42C" },
      { id: "var-slip-42-navy", options: { "Size (EU)": "42", "Color": "Soft Navy Blue" }, price: 19500, stock: 9, sku: "GC-SLIP-42N" },
      { id: "var-slip-44-char", options: { "Size (EU)": "44", "Color": "Warm Charcoal" }, price: 21000, stock: 5, sku: "GC-SLIP-44C" },
      { id: "var-slip-44-navy", options: { "Size (EU)": "44", "Color": "Soft Navy Blue" }, price: 21000, stock: 4, sku: "GC-SLIP-44N" }
    ]
  }
];

// Seed Orders
const SEED_ORDERS: Order[] = [
  {
    id: "ord-8291",
    customerName: "Margaret Adebayo",
    customerPhone: "0805551234",
    customerAddress: "Flat 4, Palms Court, Lekki, Lagos",
    items: [
      {
        productId: "prod-cane",
        name: "Premium Ergonomic Walking Cane",
        variantDetails: "Handle Grip: Solid Walnut Wood, Color: Classic Bronze",
        price: 18500,
        quantity: 1
      },
      {
        productId: "prod-magnify",
        name: "Handheld Page Magnifier with LED Lights",
        variantDetails: "Standard",
        price: 8500,
        quantity: 1
      }
    ],
    totalAmount: 27000,
    paymentStatus: "Paid",
    paymentReference: "T629817290123",
    orderStatus: "Delivered",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: "ord-1823",
    customerName: "Chief Samuel Okafor",
    customerPhone: "0802224455",
    customerAddress: "Block B, Senior Citizens Village, Enugu",
    items: [
      {
        productId: "prod-pill",
        name: "Easy-Read Talking Pill Organizer",
        variantDetails: "Alert Sound: Beep + Voice Guide",
        price: 14500,
        quantity: 2
      }
    ],
    totalAmount: 29000,
    paymentStatus: "Paid",
    paymentReference: "T192309812498",
    orderStatus: "Dispatched",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: "ord-4921",
    customerName: "Esther Alao",
    customerPhone: "0816667788",
    customerAddress: "32 Boundary Road, GRA, Benin City",
    items: [
      {
        productId: "prod-wrap",
        name: "Ultra-Soft Heated Joint Therapy Wrap",
        variantDetails: "Target Area: Knee & Elbow",
        price: 22000,
        quantity: 1
      }
    ],
    totalAmount: 22000,
    paymentStatus: "Pending",
    paymentReference: "T_PENDING_4921",
    orderStatus: "Pending",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  }
];

// Initialize Database if empty
export function initDb() {
  if (!localStorage.getItem("gc_settings")) {
    localStorage.setItem("gc_settings", JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!localStorage.getItem("gc_products")) {
    localStorage.setItem("gc_products", JSON.stringify(SEED_PRODUCTS));
  }
  if (!localStorage.getItem("gc_orders")) {
    localStorage.setItem("gc_orders", JSON.stringify(SEED_ORDERS));
  }
}

// Settings
export function getSettings(): ShopSettings {
  initDb();
  return JSON.parse(localStorage.getItem("gc_settings") || "{}");
}

export function saveSettings(settings: ShopSettings): void {
  localStorage.setItem("gc_settings", JSON.stringify(settings));
}

// Products
export function getProducts(): Product[] {
  initDb();
  return JSON.parse(localStorage.getItem("gc_products") || "[]");
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem("gc_products", JSON.stringify(products));
}

// Orders
export function getOrders(): Order[] {
  initDb();
  return JSON.parse(localStorage.getItem("gc_orders") || "[]");
}

export function saveOrders(orders: Order[]): void {
  localStorage.setItem("gc_orders", JSON.stringify(orders));
}

export function addOrder(order: Order): void {
  const orders = getOrders();
  orders.unshift(order); // Add to beginning of array
  saveOrders(orders);

  // Deduct stock for products/variants sold
  const products = getProducts();
  order.items.forEach(orderItem => {
    const product = products.find(p => p.id === orderItem.productId);
    if (!product) return;

    if (product.variants && product.variants.length > 0) {
      // Find variant by details parsing
      // Details are in format "Name: Option, Name2: Option2"
      // Let's match based on parsing option values
      const variant = product.variants.find(v => {
        const variantDesc = Object.entries(v.options)
          .map(([key, val]) => `${key}: ${val}`)
          .join(", ");
        return variantDesc === orderItem.variantDetails;
      });
      if (variant) {
        variant.stock = Math.max(0, variant.stock - orderItem.quantity);
      }
    } else {
      // Base product stock subtraction: for simplicity we can store stock on product itself,
      // but standard products with no variants can have default properties or we track stock.
      // In our types.ts, standard products don't have separate stock on base, but we can assume infinite or handle variants.
      // To keep it simple, if no variants exist, we just allow it. Let's make sure our seed magnifier is treated as single item or add a stock tracker in future.
    }
  });
  saveProducts(products);
}
