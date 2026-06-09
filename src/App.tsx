import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { SuccessView } from './components/SuccessView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';

import { Product, CartItem, Order, ShopSettings } from './types';
import { initDb, getProducts, getSettings, addOrder } from './db';

import './App.css';

const SUPER_ADMIN_UID = "avIScAH5NQMWN2zf6Z3YwEEQw302";

function App() {
  // Page routing and layout
  const [view, setView] = useState<'store' | 'product-details' | 'checkout' | 'success' | 'admin'>('store');
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: "GoldenCare Market",
    phone: "",
    address: "",
    paystackPublicKey: "",
    demoMode: true,
    voiceAssistDefault: false,
    voiceRate: 0.95
  });

  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  // Modals & Panels UI
  const [cartOpen, setCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize DB and load states
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await initDb();
        const [loadedProducts, loadedSettings] = await Promise.all([
          getProducts(),
          getSettings()
        ]);
        setProducts(loadedProducts);
        setSettings(loadedSettings);
      } catch (err) {
        console.error("Error loading initial data:", err);
      }
    };
    loadInitialData();

    // Firebase Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSettingsChange = (newSettings: ShopSettings) => {
    setSettings(newSettings);
  };

  const handleRefreshProducts = async () => {
    try {
      const loadedProducts = await getProducts();
      setProducts(loadedProducts);
    } catch (err) {
      console.error("Error refreshing products:", err);
    }
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
  const handleSubmitOrder = async (order: Order) => {
    try {
      await addOrder(order);
      setActiveOrder(order);
      setCart([]); // Reset Cart
      setView('success');
    } catch (err) {
      console.error("Error saving order:", err);
      alert("Failed to save order to the database. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setView('store');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const isAdminAuthenticated = currentUser !== null && currentUser.uid === SUPER_ADMIN_UID;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Brand navigation bar */}
      <Navbar
        settings={settings}
        cart={cart}
        currentView={view}
        onNavigate={setView}
        onOpenCart={() => setCartOpen(true)}
        currentUser={currentUser}
        isAdminAuthenticated={isAdminAuthenticated}
        onSignOut={handleSignOut}
      />

      {/* Main Views router */}
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
                      onSelectProduct={(p) => {
                        setSelectedProduct(p);
                        setView('product-details');
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW B: Product Details */}
        {view === 'product-details' && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            settings={settings}
            onBack={() => {
              setView('store');
              setSelectedProduct(null);
            }}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* VIEW C: Checkout flow */}
        {view === 'checkout' && (
          <Checkout
            settings={settings}
            cart={cart}
            currentUser={currentUser}
            onCancel={() => setView('store')}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {/* VIEW D: Order Successful */}
        {view === 'success' && activeOrder && (
          <SuccessView
            order={activeOrder}
            settings={settings}
            onReturnToStore={() => setView('store')}
          />
        )}

        {/* VIEW E: Admin Management */}
        {view === 'admin' && (
          authLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <h3>Checking authorization...</h3>
            </div>
          ) : isAdminAuthenticated ? (
            <AdminDashboard
              settings={settings}
              onChangeSettings={handleSettingsChange}
              onRefreshProducts={handleRefreshProducts}
            />
          ) : (
            <AdminLogin
              superAdminUid={SUPER_ADMIN_UID}
              onLoginSuccess={() => setView('admin')}
            />
          )
        )}

      </main>

      {/* Shopping Cart Overlay Drawer */}
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
