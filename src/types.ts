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
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string; // URL or placeholder base64/name
  basePrice: number;
  attributes: Attribute[];
  variants: ProductVariant[];
  rating?: number;
  reviewCount?: number;
  specifications?: Record<string, string>;
  images?: string[]; // Alternate gallery images
  badge?: string; // e.g. "Best Seller", "Free Shipping"
}

export interface ProductReview {
  id: string;
  productId: string;
  buyerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountPercent: number; // e.g. 10 for 10%
  flatDiscount?: number; // e.g. 500 for KSh 500
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
  paymentReference: string;
  orderStatus: 'Pending' | 'Paid' | 'Dispatched' | 'Delivered' | 'Cancelled';
  createdAt: string;
  buyerEmail?: string;
  notes?: string; // Optional delivery notes
  subtotal?: number;
  taxAmount?: number;
  shippingFee?: number;
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
}

export interface HomeSlide {
  id: string;
  image: string;
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  order: number;
}

export interface MediaFile {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'url';
  size?: number;
  createdAt: string;
}
