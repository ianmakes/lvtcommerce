import { collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Product, Order, ShopSettings } from './types';

// Default Shop Settings
const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "GoldenCare Market",
  phone: "+254 700 123 456",
  address: "12 Graceful Living Road, Kilimani, Nairobi, Kenya",
  paystackPublicKey: "pk_test_cf9803c5179abf7fa0716570a910f2b989142ccc", // Default to test public key
  demoMode: false, // Turn off Demo mode so live/test gateway runs directly!
  voiceAssistDefault: false, // Simplified UI
  voiceRate: 0.95
};

// Seed Products
const SEED_PRODUCTS: Product[] = [
  {
    id: "prod-cane",
    name: "Premium Ergonomic Walking Cane",
    description: "An adjustable walking cane featuring a comfortable, contoured ergonomic handle that reduces hand fatigue. Built-in bright LED light for safe night walking and a slip-resistant pivot base for all-terrain stability.",
    category: "Mobility Aids",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png", // Use Cloudinary sample
    basePrice: 15000,
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
    name: "Easy-Read Pill Organizer",
    description: "A large-compartment 7-day pill organizer with a built-in alarm clock, blinking LED alerts. Massive labels for morning, afternoon, evening, and bedtime.",
    category: "Daily Care",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-5.jpg", // Use Cloudinary sample
    basePrice: 12000,
    attributes: [
      { name: "Alert Sound", options: ["Beep Only", "Beep + Ring Alert"] }
    ],
    variants: [
      { id: "var-pill-beep", options: { "Alert Sound": "Beep Only" }, price: 12000, stock: 20, sku: "GC-PILL-BO" },
      { id: "var-pill-voice", options: { "Alert Sound": "Beep + Ring Alert" }, price: 14500, stock: 10, sku: "GC-PILL-VG" }
    ]
  },
  {
    id: "prod-wrap",
    name: "Ultra-Soft Heated Joint Therapy Wrap",
    description: "Soothing thermal wrap featuring extra-large digital controls that are highly visible. Soft, plush microfiber cover is washable. Auto-shutoff timer ensures complete safety if you fall asleep.",
    category: "Wellness & Comfort",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-3.jpg", // Use Cloudinary sample
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
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif", // Use Cloudinary sample
    basePrice: 8500,
    attributes: [],
    variants: []
  }
];

// Seed Orders
const SEED_ORDERS: Order[] = [
  {
    id: "ord-8291",
    customerName: "Margaret Wambui",
    customerPhone: "0712345678",
    customerAddress: "Flat 4, Palms Court, Kilimani, Nairobi, Kenya",
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
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Initialize Database if empty in Firestore
export async function initDb(): Promise<void> {
  try {
    const settingsRef = doc(db, "settings", "general");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
      // Seed Settings
      await setDoc(settingsRef, DEFAULT_SETTINGS);

      // Seed Products
      for (const prod of SEED_PRODUCTS) {
        await setDoc(doc(db, "products", prod.id), prod);
      }

      // Seed Orders
      for (const ord of SEED_ORDERS) {
        await setDoc(doc(db, "orders", ord.id), ord);
      }
      console.log("Firebase Database seeded successfully.");
    }
  } catch (error) {
    console.error("Error initializing Firebase Database:", error);
  }
}

// Settings GET/SET
export async function getSettings(): Promise<ShopSettings> {
  await initDb();
  const settingsRef = doc(db, "settings", "general");
  const settingsSnap = await getDoc(settingsRef);
  if (settingsSnap.exists()) {
    return settingsSnap.data() as ShopSettings;
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: ShopSettings): Promise<void> {
  const settingsRef = doc(db, "settings", "general");
  await setDoc(settingsRef, settings);
}

// Products GET/ADD/UPDATE/DELETE
export async function getProducts(): Promise<Product[]> {
  await initDb();
  const prodCol = collection(db, "products");
  const prodSnapshot = await getDocs(prodCol);
  const prodList = prodSnapshot.docs.map(doc => doc.data() as Product);
  return prodList;
}

export async function saveProduct(product: Product): Promise<void> {
  const prodRef = doc(db, "products", product.id);
  await setDoc(prodRef, product);
}

export async function deleteProduct(id: string): Promise<void> {
  const prodRef = doc(db, "products", id);
  await deleteDoc(prodRef);
}

// Orders GET/ADD
export async function getOrders(): Promise<Order[]> {
  await initDb();
  const orderCol = collection(db, "orders");
  const orderSnapshot = await getDocs(orderCol);
  const orderList = orderSnapshot.docs.map(doc => doc.data() as Order);
  
  // Sort by date descending
  return orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addOrder(order: Order): Promise<void> {
  // Save order to Firestore
  await setDoc(doc(db, "orders", order.id), order);

  // Deduct stock for products/variants sold
  const products = await getProducts();
  for (const orderItem of order.items) {
    const product = products.find(p => p.id === orderItem.productId);
    if (!product) continue;

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => {
        const variantDesc = Object.entries(v.options)
          .map(([key, val]) => `${key}: ${val}`)
          .join(", ");
        return variantDesc === orderItem.variantDetails;
      });
      if (variant) {
        variant.stock = Math.max(0, variant.stock - orderItem.quantity);
        await saveProduct(product);
      }
    }
  }
}

export async function updateOrderStatus(orderId: string, status: Order['orderStatus'], paymentStatus: Order['paymentStatus']): Promise<void> {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    orderStatus: status,
    paymentStatus: paymentStatus
  });
}
