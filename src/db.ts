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
    name: "Premium Ergonomic Walking Cane",
    description: "An adjustable walking cane featuring a comfortable, contoured ergonomic handle that reduces hand fatigue. Built-in bright LED light for safe night walking and a slip-resistant pivot base for all-terrain stability.",
    category: "Mobility Aids",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
    basePrice: 15000,
    rating: 4.8,
    reviewCount: 3,
    badge: "Best Seller",
    images: [
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample.jpg",
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-4.jpg"
    ],
    specifications: {
      "Weight Capacity": "120 kg",
      "Adjustability Range": "32 to 38 inches (81 - 96 cm)",
      "Material": "Aircraft-grade Anodized Aluminum",
      "Grip Style": "Comfort Contoured Handle (Anti-Slip)",
      "Safety Features": "120-Lumen Swivel LED Light, Safety Wrist Strap",
      "Base Type": "360° Pivoting Quad Base",
      "Warranty": "2-Year Limited Manufacturer Warranty"
    },
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
      "Number of Days": "7 Days (Monday to Sunday)",
      "Compartments per Day": "4 (Morning, Noon, Evening, Bedtime)",
      "Alarm Mode": "Loud Audio Alert + Blinking Red LED Light",
      "Display Type": "Backlit LCD Digital Clock Face",
      "Power Source": "2 x AAA Batteries (Included)",
      "Dimensions": "10.5 x 2.3 x 1.8 inches",
      "Warranty": "1-Year Warranty"
    },
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
      "Material": "Washable Plush Fleece and Microfiber Fabric",
      "Secure Straps": "Adjustable Elastic Velcro Wrap-around Belts",
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
    name: "Handheld Page Magnifier with LED Lights",
    description: "A rectangular magnifying glass designed to read newspapers, books, and medicine bottles easily. 3X primary magnification with a 10X spot lens. Heavy-duty easy-grip handle and 12 anti-glare LEDs.",
    category: "Daily Care",
    image: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif",
    basePrice: 8500,
    rating: 4.3,
    reviewCount: 1,
    badge: "Staff Pick",
    images: [
      "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif"
    ],
    specifications: {
      "Lens Magnification": "3X Main Lens, 10X Spot Secondary Lens",
      "Lens Material": "Shatterproof Optical Acrylic",
      "Illumination": "12 Anti-Glare energy-efficient LED Lights",
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
    comment: "This cane has been a lifesaver. The LED light is extremely bright for early morning walks and the double walnut grip feels premium and solid.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-2",
    productId: "prod-cane",
    buyerName: "Grace Kemunto",
    rating: 4,
    comment: "Very comfortable grip and excellent stability. The height adjustment is easy to lock in place. Highly recommended.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-3",
    productId: "prod-cane",
    buyerName: "Samuel Githinji",
    rating: 5,
    comment: "Excellent design! The slip-resistant pivoting base makes walking on loose gravel and uneven pavements feel very safe.",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-4",
    productId: "prod-pill",
    buyerName: "Jane Atieno",
    rating: 5,
    comment: "No more forgotten meds! The blinking LED and ring alarm alerts are loud enough to hear from the next room. Setting it up was simple.",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-5",
    productId: "prod-pill",
    buyerName: "David Ochieng",
    rating: 4,
    comment: "Big slots, morning/noon/evening compartments are easy to read. Excellent for anyone who takes multiple daily supplements.",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-6",
    productId: "prod-wrap",
    buyerName: "Mary Muthoni",
    rating: 5,
    comment: "The heat levels are perfect. Relieves shoulder tension instantly. The microfiber material is incredibly soft and easy to hand wash.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-7",
    productId: "prod-wrap",
    buyerName: "Joseph Mwangi",
    rating: 4,
    comment: "Heats up very quickly. The automatic safety shut-off feature is a great relief. The visible controls are a big plus.",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "rev-8",
    productId: "prod-magnify",
    buyerName: "Esther Wanjiku",
    rating: 4,
    comment: "Makes reading the newspaper much easier. The 12 LEDs provide great brightness without glare. Solid, comfortable handle.",
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
