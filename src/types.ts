export interface Attribute {
  name: string; // e.g. "Size", "Color"
  options: string[]; // e.g. ["Small", "Medium", "Large"]
}

export interface ProductVariant {
  id: string;
  options: Record<string, string>; // e.g. { "Size": "Medium", "Color": "Blue" }
  price: number; // Price for this specific variant
  stock: number; // Stock level
  sku: string;
  image?: string; // Specific image for this variant option
  taxClassId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string; // Primary display category
  categories?: string[]; // Multi-category assignment
  image: string; // URL or placeholder base64/name
  basePrice: number;
  attributes: Attribute[];
  variants: ProductVariant[];
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  images?: string[]; // Alternate gallery images/videos
  badge?: string; // e.g. "Best Seller", "Free Shipping"
  taxClassId?: string;
  tags?: string[]; // Product tags
}

export interface ProductReview {
  id: string;
  productId: string;
  buyerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Coupon {
  code: string;
  discountPercent: number; // e.g. 10 for 10%
  flatDiscount?: number; // e.g. 500 for KSh 500
  description?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  customerGroup?: 'all' | 'new' | 'returning' | 'vip' | 'emails';
  allowedEmails?: string; // Comma-separated list of customer emails
}

export interface CartItem {
  id: string; // product.id + "-" + variant.id (or "base" if no variant)
  product: Product;
  selectedVariant: ProductVariant | null;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  variantDetails: string; // e.g. "Size: Medium, Color: Blue" or "Standard"
  price: number;
  quantity: number;
  variantId?: string; // Optional variant ID for accurate stock deduction
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  paymentReference?: string;
  orderStatus: 'Pending' | 'Paid' | 'Dispatched' | 'Delivered' | 'Cancelled';
  createdAt: string;
  buyerEmail?: string;
  notes?: string; // Optional delivery notes
  subtotal?: number;
  taxAmount?: number;
  shippingFee?: number;
  billingName?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingSameAsShipping?: boolean;
  paymentMethod?: string;
}

export interface BuyerProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPromos: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  enable2FA?: boolean;
  role?: string;
  tempPassword?: string;
}

export interface ShopSettings {
  shopName: string;
  phone: string;
  address: string;
  paystackPublicKey: string;
  demoMode: boolean;
  voiceAssistDefault: boolean;
  voiceRate: number;
  shippingFee: number;
  shippingFreeThreshold: number;
  taxRate: number;
  logoUrl?: string;
  faviconUrl?: string;
  allowSignup?: boolean;
  description?: string;
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
  brandingPrimaryColor?: string;
  brandingSecondaryColor?: string;
  adminUrl?: string;
  adminUsername?: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminEmail?: string;
  adminAvatarUrl?: string;
  adminPassword?: string;
  enable2FA?: boolean;
  emailProvider?: 'smtp' | 'resend';
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpEncryption?: 'ssl' | 'tls' | 'none';
  paystackActive?: boolean;
  paystackSecretKey?: string;
  paystackMode?: 'live' | 'test';
  codActive?: boolean;
  rolesConfig?: Record<string, Record<string, boolean>>;
  shopPageDefaultView?: 'grid' | 'list';
}

export interface HomeSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  order: number;
  mediaType?: 'image' | 'video'; // Support video slides
  videoUrl?: string; // YouTube/Vimeo URL for video slides
}

export interface MediaFile {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'url';
  size?: number;
  createdAt: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  regions: string;
  cost: number;
}

export interface TaxClass {
  id: string;
  name: string;
  rate: number;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

declare global {
  interface Window {
    showToast?: (message: string, type?: 'success' | 'warning') => void;
  }
}

export function showToast(message: string, type: 'success' | 'warning' = 'success') {
  if (typeof window !== 'undefined' && window.showToast) {
    window.showToast(message, type);
  } else {
    console.log(`[Toast ${type}]: ${message}`);
  }
}
