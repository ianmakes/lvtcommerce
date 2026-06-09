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
}

export interface ShopSettings {
  shopName: string;
  phone: string;
  address: string;
  paystackPublicKey: string;
  demoMode: boolean;
  voiceAssistDefault: boolean;
  voiceRate: number;
}
