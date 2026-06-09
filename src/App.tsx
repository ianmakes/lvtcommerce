import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AccessibilitySettings } from './components/AccessibilitySettings';
import { VoiceHelper, speakText } from './components/VoiceHelper';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { SuccessView } from './components/SuccessView';
import { AdminDashboard } from './components/AdminDashboard';

import { Product, CartItem, Order, ShopSettings } from './types';
import { initDb, getProducts, getSettings } from './db';

import './App.css';

function App() {
  // Page routing and layout
  const [view, setView] = useState<'store' | 'admin' | 'checkout' | 'success'>('store');
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: "GoldenCare Market",
    phone: "",
    address: "",
    paystackPublicKey: "",
    demoMode: true,
    voiceAssistDefault: true,
    voiceRate: 0.95
  });

  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  // Modals & Panels UI
  const [cartOpen, setCartOpen] = useState(false);
  const [zoom, setZoom] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [theme, setTheme] = useState<'light' | 'high-contrast'>('light');

  // Initialize DB and load states
  useEffect(() => {
    initDb();
    setProducts(getProducts());
    setSettings(getSettings());

    // Restore Accessibility Settings
    const savedZoom = localStorage.getItem('gc_zoom') as 'normal' | 'large' | 'xlarge';
    if (savedZoom) {
      setZoom(savedZoom);
      document.documentElement.setAttribute('data-zoom', savedZoom);
    }
    const savedTheme = localStorage.getItem('gc_theme') as 'light' | 'high-contrast';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Sync zoom and theme changes to HTML element
  const handleZoomChange = (nextZoom: 'normal' | 'large' | 'xlarge') => {
    setZoom(nextZoom);
    localStorage.setItem('gc_zoom', nextZoom);
    document.documentElement.setAttribute('data-zoom', nextZoom);
  };

  const handleThemeChange = (nextTheme: 'light' | 'high-contrast') => {
    setTheme(nextTheme);
    localStorage.setItem('gc_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSettingsChange = (newSettings: ShopSettings) => {
    setSettings(newSettings);
  };

  const handleRefreshProducts = () => {
    setProducts(getProducts());
  };

  // Cart operations
  const handleAddToCart = (item: CartItem) => {
    setCart(prevCart => {
      const idx = prevCart.findIndex(c => c.id === item.id);
      if (idx > -1) {
        const nextCart = [...prevCart];
        nextCart[idx].quantity += item.quantity;
        return nextCart;
      }
      return [...prevCart, item];
    });
  };

  const handleUpdateCartQty = (id: string, qty: number) => {
    setCart(prevCart => prevCart.map(c => c.id === id ? { ...c, quantity: qty } : c));
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prevCart => prevCart.filter(c => c.id !== id));
  };

  // Complete Checkout Flow
  const handleSubmitOrder = (order: Order) => {
    setActiveOrder(order);
    setCart([]); // Reset Cart
    setView('success');
  };

  // Construct context speech helpers for screens
  let pageSummaryText = "";
  if (view === 'store') {
    pageSummaryText = `Welcome to the homepage of ${settings.shopName}. We specialize in high-quality items designed to support healthy living and easy mobility. We offer ${products.length} products on display, including walking canes, orthopedic slippers, and daily medication boxes. Feel free to browse. You can click on the Details button of any product to see options like sizes and colors, or click the cart button in the navigation bar to proceed with checking out your selected items.`;
  } else if (view === 'admin') {
    pageSummaryText = "You are in the shop administration dashboard. This private space allows operators to manage active sales summaries, view invoice details of incoming orders, modify product variants and stock levels, and toggle simulated or live Paystack payment keys.";
  } else if (view === 'checkout') {
    pageSummaryText = "You are at checkout. Step one requires your delivery name, contact phone number, and physical address. Step two will display your total summary and prompt you to complete payment securely using Paystack.";
  } else if (view === 'success' && activeOrder) {
    pageSummaryText = `Thank you for shopping with us! Your payment has cleared. Your order identification reference is ${activeOrder.id}. We are packaging your items for delivery. You can click Print Receipt to save a physical copy, or click Return to Shop to continue browsing.`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 1. Global senior accessibility top banner */}
      <AccessibilitySettings
        settings={settings}
        onChangeSettings={handleSettingsChange}
        currentZoom={zoom}
        onChangeZoom={handleZoomChange}
        currentTheme={theme}
        onChangeTheme={handleThemeChange}
      />

      {/* 2. Brand navigation bar */}
      <Navbar
        settings={settings}
        cart={cart}
        currentView={view}
        onNavigate={setView}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* 3. Main Views router */}
      <main style={{ flexGrow: 1, paddingBottom: '60px' }}>
        
        {/* VIEW A: Storefront */}
        {view === 'store' && (
          <div>
            {/* Calming Welcome Hero */}
            <section className="hero">
              <div className="container">
                <h1>GoldenCare Products</h1>
                <p>
                  Welcome! We provide simple, high-quality, and easy-to-use daily aids, mobility tools, and wellness items to make living comfortable and safe.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      if (settings.voiceAssistDefault) {
                        speakText("Scrolling to products list.", settings.voiceRate);
                      }
                      const gridEl = document.getElementById('products-section');
                      if (gridEl) gridEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ fontSize: '1.25rem', padding: '16px 32px' }}
                  >
                    Start Browsing Products
                  </button>
                </div>
              </div>
            </section>

            {/* Grid Container */}
            <section className="container" id="products-section">
              <h2 style={{ fontSize: '2rem', borderBottom: '3px solid var(--border-color)', paddingBottom: '16px', marginBottom: '40px' }}>
                All Available Items
              </h2>
              
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <h3>No products available in database.</h3>
                  <p>Open the Shop Manager tab to create some products.</p>
                </div>
              ) : (
                <div className="product-grid">
                  {products.map(prod => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      settings={settings}
                      onSelectProduct={setSelectedProduct}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW B: Checkout flow */}
        {view === 'checkout' && (
          <Checkout
            settings={settings}
            cart={cart}
            onCancel={() => setView('store')}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {/* VIEW C: Order Successful */}
        {view === 'success' && activeOrder && (
          <SuccessView
            order={activeOrder}
            settings={settings}
            onReturnToStore={() => setView('store')}
          />
        )}

        {/* VIEW D: Admin Management */}
        {view === 'admin' && (
          <AdminDashboard
            settings={settings}
            onChangeSettings={handleSettingsChange}
            onRefreshProducts={handleRefreshProducts}
          />
        )}

      </main>

      {/* 4. Accessibility Text-To-Speech floating audio help bubble */}
      <VoiceHelper 
        settings={settings} 
        pageSummaryText={pageSummaryText} 
      />

      {/* 5. Product Detailed Drawer modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          settings={settings}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* 6. Shopping Cart Overlay Drawer */}
      <Cart
        settings={settings}
        isOpen={cartOpen}
        cart={cart}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => setView('checkout')}
      />

    </div>
  );
}

export default App;
