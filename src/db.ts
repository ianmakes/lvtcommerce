import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Product, Order, ShopSettings, BuyerProfile, ProductReview } from './types';

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
    name: "GC-01 Carbon Fiber Walking Staff",
    description: "An ultra-lightweight carbon fiber walking staff designed for active recovery, hiking, and daily support. Features a sweat-wicking cork ergonomic grip, shock-absorbing shaft, and interchangeable all-terrain rubber boots.",
    category: "Mobility & Support",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
    basePrice: 15000,
    rating: 4.8,
    reviewCount: 3,
    badge: "New Release",
    images: [
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample.jpg",
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-4.jpg"
    ],
    specifications: {
      "Weight Capacity": "130 kg",
      "Staff Weight": "220 grams",
      "Material": "100% 3K Carbon Fiber",
      "Grip Style": "Ergonomic Sweat-Wicking Cork Grip",
      "Adjustability Range": "Twist-Lock Telescopic (80cm - 110cm)",
      "Base Type": "All-Terrain Carbide Tip & Shock Rubber Boot",
      "Warranty": "3-Year Structural Warranty"
    },
    attributes: [
      { name: "Handle Grip", options: ["Premium Cork", "Contoured EVA Foam"] },
      { name: "Color", options: ["Stealth Black", "Matte Carbon", "Cyber Silver"] }
    ],
    variants: [
      { id: "var-cane-cork-black", options: { "Handle Grip": "Premium Cork", "Color": "Stealth Black" }, price: 18500, stock: 12, sku: "GC-CANE-CB" },
      { id: "var-cane-cork-carbon", options: { "Handle Grip": "Premium Cork", "Color": "Matte Carbon" }, price: 18500, stock: 8, sku: "GC-CANE-CC" },
      { id: "var-cane-cork-silver", options: { "Handle Grip": "Premium Cork", "Color": "Cyber Silver" }, price: 18500, stock: 15, sku: "GC-CANE-CS" },
      { id: "var-cane-foam-black", options: { "Handle Grip": "Contoured EVA Foam", "Color": "Stealth Black" }, price: 15000, stock: 5, sku: "GC-CANE-FB" },
      { id: "var-cane-foam-carbon", options: { "Handle Grip": "Contoured EVA Foam", "Color": "Matte Carbon" }, price: 15000, stock: 4, sku: "GC-CANE-FC" },
      { id: "var-cane-foam-silver", options: { "Handle Grip": "Contoured EVA Foam", "Color": "Cyber Silver" }, price: 15000, stock: 6, sku: "GC-CANE-FS" }
    ]
  },
  {
    id: "prod-pill",
    name: "GC-02 Smart Modular Capsule Pod",
    description: "A modular, sleek 7-day capsule pod with integrated Bluetooth app alerts, sound alarms, and blinking LEDs. Features high-contrast labeling, a modern OLED backlit clock display, and a USB-C rechargeable battery.",
    category: "Smart Wellness",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-5.jpg",
    basePrice: 12000,
    rating: 4.5,
    reviewCount: 2,
    badge: "Popular",
    images: [
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-5.jpg",
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-2.jpg"
    ],
    specifications: {
      "Number of Modules": "7 Detachable Days (Mon - Sun)",
      "Compartments per Module": "4 (Morning, Noon, Evening, Night)",
      "Wireless Connectivity": "Bluetooth 5.2 (iOS / Android Notifications)",
      "Alert System": "Loud Audio Chime + Blinking Red LED Bar",
      "Power Source": "USB-C Rechargeable Li-Ion (30-Day Charge)",
      "Dimensions": "10.5 x 2.3 x 1.8 inches",
      "Warranty": "2-Year Warranty"
    },
    attributes: [
      { name: "Alert Sound", options: ["Digital Chime", "Standard Beep"] }
    ],
    variants: [
      { id: "var-pill-chime", options: { "Alert Sound": "Digital Chime" }, price: 14500, stock: 20, sku: "GC-PILL-DC" },
      { id: "var-pill-beep", options: { "Alert Sound": "Standard Beep" }, price: 12000, stock: 10, sku: "GC-PILL-SB" }
    ]
  },
  {
    id: "prod-wrap",
    name: "GC-03 AeroGel Heated Recovery Wrap",
    description: "An advanced thermal compression wrap powered by lightweight AeroGel insulation. Includes highly visible digital controls, multiple heat settings, and a washable high-tech fleece cover.",
    category: "Thermal Therapy",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-3.jpg",
    basePrice: 22000,
    rating: 4.7,
    reviewCount: 2,
    badge: "Free Shipping",
    images: [
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-3.jpg",
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/food/potatoes.jpg"
    ],
    specifications: {
      "Heat Settings": "4 Heat Intensity Modes (Warm, Low, Med, High)",
      "Safety Timer": "2-Hour Safety Auto-Shutoff System",
      "Core Insulation": "Medical-Grade AeroGel Thermal Lining",
      "Material": "Washable Plush Fleece and Microfiber Fabric",
      "Target Joints": "Knees, Elbows, Shoulders, Lower Back",
      "Voltage": "220V - 240V AC Adaptor",
      "Warranty": "1-Year Warranty"
    },
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
    name: "GC-04 Ultra-Thin LED Page Reader",
    description: "An ultra-thin magnifying lens designed for books, blue-prints, and fine details. Rectangular acrylic design with 12 anti-glare touch dimmable LEDs and comfort ribbed handle.",
    category: "Daily Tools",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif",
    basePrice: 8500,
    rating: 4.3,
    reviewCount: 1,
    badge: "Design Award",
    images: [
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif"
    ],
    specifications: {
      "Lens Magnification": "3X Main Lens, 10X Spot Secondary Lens",
      "Lens Material": "Shatterproof Optical Acrylic",
      "Illumination": "12 Touch-Dimmable energy-efficient LEDs",
      "Brightness Modes": "Dual Adjustable Intensity (Low, High)",
      "Handle Type": "Ribbed Comfort Rubber Easy-Grip Handle",
      "Batteries": "3 x AAA Batteries (Not Included)",
      "Warranty": "Lifetime Lens Warranty"
    },
    attributes: [],
    variants: []
  }
];

// Seed Reviews
const SEED_REVIEWS: ProductReview[] = [
  {
    id: "rev-1",
    productId: "prod-cane",
    buyerName: "Patrick Njoroge",
    rating: 5,
    comment: "This staff has been a game-changer. The carbon fiber is incredibly light and the cork grip looks beautiful and feels premium.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-2",
    productId: "prod-cane",
    buyerName: "Grace Kemunto",
    rating: 4,
    comment: "Beautiful matte finish and highly adjustable. Love the twist-lock design.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-3",
    productId: "prod-cane",
    buyerName: "Samuel Githinji",
    rating: 5,
    comment: "Excellent design! Very sleek tech-wellness item, highly support active hiking.",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-4",
    productId: "prod-pill",
    buyerName: "Jane Atieno",
    rating: 5,
    comment: "Never forget reminders now! The OLED digital face looks great on my desk, and the USB-C recharge means no battery waste.",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-5",
    productId: "prod-pill",
    buyerName: "David Ochieng",
    rating: 4,
    comment: "Excellent modular pods. Perfect for travel and daily capsules.",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-6",
    productId: "prod-wrap",
    buyerName: "Mary Muthoni",
    rating: 5,
    comment: "The AeroGel lining works perfectly. Relieves muscle tension instantly. Clean, modern look.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-7",
    productId: "prod-wrap",
    buyerName: "Joseph Mwangi",
    rating: 4,
    comment: "Heats up very quickly. The digital safety timer works perfectly.",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-8",
    productId: "prod-magnify",
    buyerName: "Esther Wanjiku",
    rating: 4,
    comment: "Touch dimming LEDs provide perfect brightness. Borderless clean glass design.",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
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
        name: "GC-01 Carbon Fiber Walking Staff",
        variantDetails: "Handle Grip: Premium Cork, Color: Stealth Black",
        price: 18500,
        quantity: 1
      },
      {
        productId: "prod-magnify",
        name: "GC-04 Ultra-Thin LED Page Reader",
        variantDetails: "Standard Option",
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

      // Seed Reviews
      for (const rev of SEED_REVIEWS) {
        await setDoc(doc(db, "reviews", rev.id), rev);
      }

      console.log("Firebase Database seeded successfully with reviews and specifications.");
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

// Buyer Profile GET/SET
export async function getBuyerProfile(uid: string): Promise<BuyerProfile | null> {
  const profileRef = doc(db, "users", uid);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    return profileSnap.data() as BuyerProfile;
  }
  return null;
}

export async function saveBuyerProfile(profile: BuyerProfile): Promise<void> {
  const profileRef = doc(db, "users", profile.uid);
  await setDoc(profileRef, profile);
}

// Product Reviews GET/ADD
export async function getProductReviews(productId: string): Promise<ProductReview[]> {
  const reviewsCol = collection(db, "reviews");
  const reviewsSnapshot = await getDocs(reviewsCol);
  const reviewsList = reviewsSnapshot.docs
    .map(doc => doc.data() as ProductReview)
    .filter(r => r.productId === productId);
  
  // Sort reviews by date descending
  return reviewsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addProductReview(review: ProductReview): Promise<void> {
  const reviewRef = doc(db, "reviews", review.id);
  await setDoc(reviewRef, review);

  // Recalculate and update average product rating and review count in Firestore
  const reviews = await getProductReviews(review.productId);
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = reviews.length > 0 ? parseFloat((totalRating / reviews.length).toFixed(1)) : 0;

  const productRef = doc(db, "products", review.productId);
  const productSnap = await getDoc(productRef);
  if (productSnap.exists()) {
    const product = productSnap.data() as Product;
    product.rating = averageRating;
    product.reviewCount = reviews.length;
    await setDoc(productRef, product);
  }
}
