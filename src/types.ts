export interface Attribute {
  name: string; // e.g. "Size", "Color"
  options: string[]; // e.g. ["Small", "Medium", "Large"]
  isColorVariation?: boolean;
  colorValues?: Record<string, string>; // e.g. { "Stealth Black": "#111111" }
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
  shortDescription?: string;
  longDescription?: string;
  category: string; // Primary display category
  categories?: string[]; // Multi-category assignment
  image: string; // URL or placeholder base64/name
  basePrice: number;
  salePrice?: number;
  attributes: Attribute[];
  variants: ProductVariant[];
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  images?: string[]; // Alternate gallery images/videos
  badge?: string; // e.g. "Best Seller", "Free Shipping"
  taxClassId?: string;
  tags?: string[]; // Product tags
  isFeatured?: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  buyerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  approved?: boolean;
  buyerEmail?: string;
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
  paystackLivePublicKey?: string;
  paystackLiveSecretKey?: string;
  paystackTestPublicKey?: string;
  paystackTestSecretKey?: string;
  codActive?: boolean;
  rolesConfig?: Record<string, Record<string, boolean>>;
  shopPageDefaultView?: 'grid' | 'list';
  emailFromAddress?: string;
  emailTemplateCustomerSubject?: string;
  emailTemplateCustomerHeader?: string;
  emailTemplateCustomerIntro?: string;
  emailTemplateCustomerFooter?: string;
  emailTemplateCustomerLayout?: string;
  emailTemplateCustomerColor?: string;
  emailTemplateCustomerIncludeItems?: boolean;
  emailTemplateAdminSubject?: string;
  emailTemplateAdminHeader?: string;
  emailTemplateAdminIntro?: string;
  emailTemplateAdminFooter?: string;
  emailTemplateAdminLayout?: string;
  emailTemplateAdminColor?: string;
  emailTemplateAdminIncludeItems?: boolean;
  emailTemplateStatusSubject?: string;
  emailTemplateStatusHeader?: string;
  emailTemplateStatusIntro?: string;
  emailTemplateStatusFooter?: string;
  emailTemplateStatusLayout?: string;
  emailTemplateStatusColor?: string;
  emailTemplateStatusIncludeItems?: boolean;

  // CMS Homepage
  cmsBadge1Title?: string;
  cmsBadge1Desc?: string;
  cmsBadge2Title?: string;
  cmsBadge2Desc?: string;
  cmsBadge3Title?: string;
  cmsBadge3Desc?: string;
  cmsPromoBannerTitle?: string;
  cmsPromoBannerBtn1Text?: string;
  cmsPromoBannerBtn1Link?: string;
  cmsPromoBannerBtn2Text?: string;
  cmsPromoBannerBtn2Link?: string;
  cmsCard1Title?: string;
  cmsCard1Badge?: string;
  cmsCard1Price?: string;
  cmsCard1Link?: string;
  cmsCard1Image?: string;
  cmsCard2Title?: string;
  cmsCard2Badge?: string;
  cmsCard2Price?: string;
  cmsCard2Link?: string;
  cmsCard2Image?: string;

  // Shop Page Titles
  cmsShopTitle?: string;
  cmsShopSubtitle?: string;
  cmsShopMetaTitle?: string;

  // Granular styling options
  cmsBadge1BgColor?: string;
  cmsBadge1TextColor?: string;
  cmsBadge1Visible?: boolean;
  cmsBadge2BgColor?: string;
  cmsBadge2TextColor?: string;
  cmsBadge2Visible?: boolean;
  cmsBadge3BgColor?: string;
  cmsBadge3TextColor?: string;
  cmsBadge3Visible?: boolean;

  cmsPromoBannerBgColor?: string;
  cmsPromoBannerTextColor?: string;
  cmsPromoBannerVisible?: boolean;
  cmsPromoBannerWidth?: string;
  cmsPromoBannerTextAlign?: 'left' | 'center' | 'right';
  cmsPromoBannerBgImage?: string;
  cmsPromoBannerOverlayColor?: string;
  cmsPromoBannerOverlayOpacity?: number;
  cmsPromoBannerBtn1Icon?: string;
  cmsPromoBannerBtn1IconEnable?: boolean;
  cmsPromoBannerBtn2Icon?: string;
  cmsPromoBannerBtn2IconEnable?: boolean;

  cmsCardsSectionBgColor?: string;
  cmsCardsSectionVisible?: boolean;
  
  cmsCard1BgColor?: string;
  cmsCard1TextColor?: string;
  cmsCard1Width?: string;
  cmsCard1BtnIcon?: string;
  cmsCard1BtnIconEnable?: boolean;

  cmsCard2BgColor?: string;
  cmsCard2TextColor?: string;
  cmsCard2Width?: string;
  cmsCard2BtnIcon?: string;
  cmsCard2BtnIconEnable?: boolean;
  cmsPartnerLogos?: PartnerLogo[];
}

export interface PartnerLogo {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  visible: boolean;
}

export interface NewsletterSubscriber {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  createdAt: string;
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

export interface CustomPage {
  slug: string;
  title: string;
  html: string;
  createdAt: string;
  updatedAt: string;
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

export interface ProcurementLog {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantSku: string;
  variantLabel: string;
  type: 'restock' | 'correction';
  quantity: number;
  previousStock: number;
  newStock: number;
  supplierName?: string;
  procurementInvoice?: string;
  unitCost?: number;
  notes: string;
  date: string;
  actor: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
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
