import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Product, Order, ShopSettings, BuyerProfile, ProductReview, HomeSlide, MediaFile, Category, Coupon, ShippingZone, TaxClass, AuditLog } from './types';

// Helper to clean undefined properties recursively before saving to Firestore
function cleanObject<T extends object>(obj: T): T {
  const clean = { ...obj } as Record<string, unknown>;
  Object.keys(clean).forEach(key => {
    const value = clean[key];
    if (value === undefined) {
      delete clean[key];
    } else if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        clean[key] = value.map((item: unknown) => 
          (item !== null && typeof item === 'object') ? cleanObject(item as object) : item
        );
      } else {
        clean[key] = cleanObject(value as object);
      }
    }
  });
  return clean as T;
}

// Default Shop Settings
const DEFAULT_SETTINGS: ShopSettings = {
  shopName: "GoldenCare Market",
  phone: "+254 700 123 456",
  address: "12 Graceful Living Road, Kilimani, Nairobi, Kenya",
  paystackPublicKey: "pk_live_e5580acce4031873047e94487adc62b82e887b94", // Default to live public key
  demoMode: false, // Turn off Demo mode so live/test gateway runs directly!
  voiceAssistDefault: false, // Simplified UI
  voiceRate: 0.95,
  shippingFee: 1500,
  shippingFreeThreshold: 30000,
  taxRate: 16
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

let isDbInitialized = false;

// Initialize Database if empty in Firestore
export async function initDb(): Promise<void> {
  if (isDbInitialized) return;
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
    } else {
      // Ensure demoMode is disabled, set live public key and default shipping/taxes if not already set
      const currentData = settingsSnap.data();
      await updateDoc(settingsRef, { 
        demoMode: false,
        paystackPublicKey: "pk_live_e5580acce4031873047e94487adc62b82e887b94",
        shippingFee: currentData?.shippingFee !== undefined ? currentData.shippingFee : 1500,
        shippingFreeThreshold: currentData?.shippingFreeThreshold !== undefined ? currentData.shippingFreeThreshold : 30000,
        taxRate: currentData?.taxRate !== undefined ? currentData.taxRate : 16
      });
    }

    // Seed home_slides if empty
    const slidesRef = collection(db, "home_slides");
    const slidesSnap = await getDocs(slidesRef);
    if (slidesSnap.empty) {
      const defaultSlides: HomeSlide[] = [
        {
          id: "slide-1",
          image: "https://images.unsplash.com/photo-1476480862126-209bbcafd4eb?q=80&w=1600",
          title: "GOLDENCARE MEMBERSHIP",
          description: "YOUR ALL-ACCESS PASS TO RECOVERY AND MOBILITY TOOLS",
          buttonText: "SHOP MOBILITY",
          buttonLink: "/shop",
          order: 1
        },
        {
          id: "slide-2",
          image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1600",
          title: "GC-03 THERMAL RECOVERY",
          description: "ADVANCED HEATING WRAPS POWERED BY LIGHTWEIGHT AEROGEL INSULATION",
          buttonText: "EXPLORE WRAPS",
          buttonLink: "/product/prod-wrap",
          order: 2
        },
        {
          id: "slide-3",
          image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1600",
          title: "RECOVER SMARTER",
          description: "GC-02 DIGITAL DISPENSERS FEATURING BLUETOOTH COMPANION APP ALERTS",
          buttonText: "DISCOVER PILL PODS",
          buttonLink: "/product/prod-pill",
          order: 3
        }
      ];
      for (const s of defaultSlides) {
        await setDoc(doc(db, "home_slides", s.id), s);
      }
      console.log("Firebase Database: Seeded default home slides.");
    }

    // Seed media_files if empty
    const mediaRef = collection(db, "media_files");
    const mediaSnap = await getDocs(mediaRef);
    if (mediaSnap.empty) {
      const defaultFiles: MediaFile[] = [
        {
          id: "media-cane",
          name: "cane-main.png",
          url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png",
          type: "image",
          createdAt: new Date(Date.now() - 10000).toISOString()
        },
        {
          id: "media-pill",
          name: "pill-pod.jpg",
          url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-5.jpg",
          type: "image",
          createdAt: new Date(Date.now() - 20000).toISOString()
        },
        {
          id: "media-wrap",
          name: "wrap-recovery.jpg",
          url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/cld-sample-3.jpg",
          type: "image",
          createdAt: new Date(Date.now() - 30000).toISOString()
        },
        {
          id: "media-magnify",
          name: "magnify-lens.avif",
          url: "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035259/samples/zoom.avif",
          type: "image",
          createdAt: new Date(Date.now() - 40000).toISOString()
        }
      ];
      for (const f of defaultFiles) {
        await setDoc(doc(db, "media_files", f.id), f);
      }
      console.log("Firebase Database: Seeded default media files.");
    }

    // Seed categories if empty
    const categoriesRef = collection(db, "categories");
    const categoriesSnap = await getDocs(categoriesRef);
    if (categoriesSnap.empty) {
      const defaultCategories: Category[] = [
        { id: "cat-mobility", name: "Mobility & Support", description: "Walking aids, supports, and ergonomic staffs for daily assistance." },
        { id: "cat-smart", name: "Smart Wellness", description: "Tech-enabled devices, smart organizers, and health sensors." },
        { id: "cat-thermal", name: "Thermal Therapy", description: "Advanced heating and cooling wraps for joint and muscle recovery." },
        { id: "cat-daily", name: "Daily Tools", description: "Convenient tools and products to assist with everyday tasks." }
      ];
      for (const c of defaultCategories) {
        await setDoc(doc(db, "categories", c.id), c);
      }
      console.log("Firebase Database: Seeded default categories.");
    }

    // Seed coupons if empty
    const couponsRef = collection(db, "coupons");
    const couponsSnap = await getDocs(couponsRef);
    if (couponsSnap.empty) {
      const defaultCoupons: Coupon[] = [
        { code: "GOLDENCARE", discountPercent: 10, description: "Get 10% off your recovery tools purchase" },
        { code: "KES500", discountPercent: 0, flatDiscount: 500, description: "KSh 500 off order total" }
      ];
      for (const cp of defaultCoupons) {
        await setDoc(doc(db, "coupons", cp.code), cp);
      }
      console.log("Firebase Database: Seeded default coupons.");
    }

    // Seed shipping_zones if empty
    const shippingZonesRef = collection(db, "shipping_zones");
    const shippingZonesSnap = await getDocs(shippingZonesRef);
    if (shippingZonesSnap.empty) {
      const defaultZones: ShippingZone[] = [
        { id: "zone-nairobi", name: "Nairobi Metro", regions: "Nairobi, Kilimani, Westlands, Karen, Langata", cost: 500 },
        { id: "zone-default", name: "Rest of Kenya", regions: "Mombasa, Kisumu, Nakuru, Eldoret, Thika", cost: 1500 }
      ];
      for (const z of defaultZones) {
        await setDoc(doc(db, "shipping_zones", z.id), z);
      }
      console.log("Firebase Database: Seeded default shipping zones.");
    }

    // Seed tax_classes if empty
    const taxClassesRef = collection(db, "tax_classes");
    const taxClassesSnap = await getDocs(taxClassesRef);
    if (taxClassesSnap.empty) {
      const defaultTaxes: TaxClass[] = [
        { id: "tax-standard", name: "Standard VAT (16%)", rate: 16 },
        { id: "tax-zero", name: "Zero Rated (0%)", rate: 0 }
      ];
      for (const t of defaultTaxes) {
        await setDoc(doc(db, "tax_classes", t.id), t);
      }
      console.log("Firebase Database: Seeded default tax classes.");
    }

    isDbInitialized = true;
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
  await setDoc(settingsRef, cleanObject(settings));
  await addAuditLog(`Updated Shop Settings`, 'Admin');
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
  await setDoc(prodRef, cleanObject(product));
  await addAuditLog(`Saved Product: ${product.name}`, 'Admin');
}

export async function deleteProduct(id: string): Promise<void> {
  const prodRef = doc(db, "products", id);
  await deleteDoc(prodRef);
  await addAuditLog(`Deleted Product: ${id}`, 'Admin');
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
  // Save order to Firestore (with undefined clean-up)
  await setDoc(doc(db, "orders", order.id), cleanObject(order));
  await addAuditLog(`Placed Order: #${order.id}`, order.buyerEmail || 'Guest');

  // Deduct stock for products/variants sold
  const products = await getProducts();
  for (const orderItem of order.items) {
    const product = products.find(p => p.id === orderItem.productId);
    if (!product) continue;

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => {
        if (orderItem.variantId) {
          return v.id === orderItem.variantId;
        }
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
  await setDoc(profileRef, cleanObject(profile));
}

export async function getAllUsers(): Promise<BuyerProfile[]> {
  const usersCol = collection(db, "users");
  const snap = await getDocs(usersCol);
  return snap.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as BuyerProfile[];
}

export async function deleteBuyerProfile(uid: string): Promise<void> {
  const profileRef = doc(db, "users", uid);
  await deleteDoc(profileRef);
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
  await setDoc(reviewRef, cleanObject(review));

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
    await setDoc(productRef, cleanObject(product));
  }
}

// Slides GET/SAVE/DELETE
export async function getHomeSlides(): Promise<HomeSlide[]> {
  await initDb();
  const slidesCol = collection(db, "home_slides");
  const slidesSnapshot = await getDocs(slidesCol);
  const slidesList = slidesSnapshot.docs.map(doc => doc.data() as HomeSlide);
  return slidesList.sort((a, b) => a.order - b.order);
}

export async function saveHomeSlide(slide: HomeSlide): Promise<void> {
  const slideRef = doc(db, "home_slides", slide.id);
  await setDoc(slideRef, cleanObject(slide));
}

export async function deleteHomeSlide(id: string): Promise<void> {
  const slideRef = doc(db, "home_slides", id);
  await deleteDoc(slideRef);
}

// Media Files GET/SAVE/DELETE
export async function getMediaFiles(): Promise<MediaFile[]> {
  await initDb();
  const mediaCol = collection(db, "media_files");
  const mediaSnapshot = await getDocs(mediaCol);
  const mediaList = mediaSnapshot.docs.map(doc => doc.data() as MediaFile);
  return mediaList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveMediaFile(file: MediaFile): Promise<void> {
  const fileRef = doc(db, "media_files", file.id);
  await setDoc(fileRef, cleanObject(file));
}

export async function deleteMediaFile(id: string): Promise<void> {
  const fileRef = doc(db, "media_files", id);
  await deleteDoc(fileRef);
}

// Categories CRUD
export async function getCategories(): Promise<Category[]> {
  await initDb();
  const catCol = collection(db, "categories");
  const catSnapshot = await getDocs(catCol);
  return catSnapshot.docs.map(doc => doc.data() as Category);
}

export async function saveCategory(category: Category): Promise<void> {
  const catRef = doc(db, "categories", category.id);
  await setDoc(catRef, cleanObject(category));
  await addAuditLog(`Saved Category: ${category.name}`, 'Admin');
}

export async function deleteCategory(id: string): Promise<void> {
  const catRef = doc(db, "categories", id);
  await deleteDoc(catRef);
  await addAuditLog(`Deleted Category: ${id}`, 'Admin');
}

// Coupons CRUD
export async function getCoupons(): Promise<Coupon[]> {
  await initDb();
  const couponCol = collection(db, "coupons");
  const couponSnapshot = await getDocs(couponCol);
  return couponSnapshot.docs.map(doc => doc.data() as Coupon);
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  const couponRef = doc(db, "coupons", coupon.code);
  await setDoc(couponRef, cleanObject(coupon));
  await addAuditLog(`Saved Promo Code: ${coupon.code}`, 'Admin');
}

export async function deleteCoupon(code: string): Promise<void> {
  const couponRef = doc(db, "coupons", code);
  await deleteDoc(couponRef);
  await addAuditLog(`Deleted Promo Code: ${code}`, 'Admin');
}

// Shipping Zones CRUD
export async function getShippingZones(): Promise<ShippingZone[]> {
  await initDb();
  const zoneCol = collection(db, "shipping_zones");
  const zoneSnapshot = await getDocs(zoneCol);
  return zoneSnapshot.docs.map(doc => doc.data() as ShippingZone);
}

export async function saveShippingZone(zone: ShippingZone): Promise<void> {
  const zoneRef = doc(db, "shipping_zones", zone.id);
  await setDoc(zoneRef, cleanObject(zone));
  await addAuditLog(`Saved Shipping Zone: ${zone.name}`, 'Admin');
}

export async function deleteShippingZone(id: string): Promise<void> {
  const zoneRef = doc(db, "shipping_zones", id);
  await deleteDoc(zoneRef);
  await addAuditLog(`Deleted Shipping Zone: ${id}`, 'Admin');
}

// Tax Classes CRUD
export async function getTaxClasses(): Promise<TaxClass[]> {
  await initDb();
  const taxCol = collection(db, "tax_classes");
  const taxSnapshot = await getDocs(taxCol);
  return taxSnapshot.docs.map(doc => doc.data() as TaxClass);
}

export async function saveTaxClass(taxClass: TaxClass): Promise<void> {
  const taxRef = doc(db, "tax_classes", taxClass.id);
  await setDoc(taxRef, cleanObject(taxClass));
  await addAuditLog(`Saved Tax Class: ${taxClass.name}`, 'Admin');
}

export async function deleteTaxClass(id: string): Promise<void> {
  const taxRef = doc(db, "tax_classes", id);
  await deleteDoc(taxRef);
  await addAuditLog(`Deleted Tax Class: ${id}`, 'Admin');
}

// Audit Logs Helpers
export async function getAuditLogs(): Promise<AuditLog[]> {
  await initDb();
  const logCol = collection(db, "audit_logs");
  const logSnapshot = await getDocs(logCol);
  const list = logSnapshot.docs.map(doc => doc.data() as AuditLog);
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function addAuditLog(action: string, actor: string, details?: string): Promise<void> {
  const id = `log-${Math.floor(100000 + Math.random() * 900000)}`;
  const log: AuditLog = {
    id,
    action,
    actor,
    timestamp: new Date().toISOString(),
    details
  };
  const logRef = doc(db, "audit_logs", id);
  await setDoc(logRef, cleanObject(log));
}

// ---- Wishlist Persistence (per-user, Firestore-backed) ----

export async function getWishlist(uid: string): Promise<string[]> {
  const wishlistRef = doc(db, "wishlists", uid);
  const wishlistSnap = await getDoc(wishlistRef);
  if (wishlistSnap.exists()) {
    const data = wishlistSnap.data();
    return Array.isArray(data.items) ? data.items : [];
  }
  return [];
}

export async function saveWishlist(uid: string, productIds: string[]): Promise<void> {
  const wishlistRef = doc(db, "wishlists", uid);
  await setDoc(wishlistRef, { items: productIds, updatedAt: new Date().toISOString() });
}
