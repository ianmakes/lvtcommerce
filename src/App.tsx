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
import { BuyerAccount } from './components/BuyerAccount';

import { Product, CartItem, Order, ShopSettings } from './types';
import { initDb, getProducts, getSettings, addOrder } from './db';

import './App.css';

const SUPER_ADMIN_UID = "avIScAH5NQMWN2zf6Z3YwEEQw302";

function App() {
  // Page routing and layout
  const [view, setView] = useState<'landing' | 'store' | 'product-details' | 'checkout' | 'success' | 'admin' | 'account'>('landing');
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

  // Wishlist and UI states
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('goldencare_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [accountTab, setAccountTab] = useState<string>('orders');

  // Coupon states
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [flatDiscount, setFlatDiscount] = useState(0);

  // Order notes
  const [orderNote, setOrderNote] = useState('');

  // Toast Alerts
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'warning' }[]>([]);

  const handleShowToast = (message: string, type: 'success' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Sync wishlist to local storage
  useEffect(() => {
    localStorage.setItem('goldencare_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

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
      // Synchronize currently open detail page product
      if (selectedProduct) {
        const updated = loadedProducts.find(p => p.id === selectedProduct.id);
        if (updated) {
          setSelectedProduct(updated);
        }
      }
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
        const maxStock = item.selectedVariant 
          ? item.selectedVariant.stock 
          : (item.product.variants && item.product.variants.length > 0 ? 0 : 99);
        const newQty = nextCart[idx].quantity + item.quantity;
        
        if (item.selectedVariant && newQty > maxStock) {
          handleShowToast(`Sorry, we only have ${maxStock} items of ${item.product.name} in stock.`, 'warning');
          return prevCart;
        }
        nextCart[idx].quantity = newQty;
        handleShowToast(`Updated quantity of ${item.product.name} in cart.`, 'success');
        return nextCart;
      }
      handleShowToast(`Added ${item.product.name} to cart.`, 'success');
      return [...prevCart, item];
    });
  };

  const handleBuyNow = (item: CartItem) => {
    // Add to cart first
    handleAddToCart(item);
    // Open checkout immediately
    setView('checkout');
  };

  const handleUpdateCartQty = (id: string, qty: number) => {
    setCart(prevCart => prevCart.map(c => c.id === id ? { ...c, quantity: qty } : c));
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prevCart => prevCart.filter(c => c.id !== id));
  };

  // Wishlist actions
  const handleToggleWishlist = (productId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!currentUser) {
      handleShowToast("Please log in to manage your wishlist.", "warning");
      return;
    }
    setWishlist(prev => {
      const exists = prev.includes(productId);
      let next;
      if (exists) {
        next = prev.filter(id => id !== productId);
        handleShowToast("Removed from wishlist.", "success");
      } else {
        next = [...prev, productId];
        handleShowToast("Added to wishlist!", "success");
      }
      return next;
    });
  };

  const handleRemoveWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(id => id !== productId));
  };

  // Promo Coupon Code applying
  const handleApplyPromo = (code: string) => {
    if (code === 'GOLDENCARE') {
      setPromoCode(code);
      setDiscountPercent(10);
      setFlatDiscount(0);
      handleShowToast("Promo code GOLDENCARE applied (10% off)!", "success");
    } else if (code === 'KES500') {
      setPromoCode(code);
      setDiscountPercent(0);
      setFlatDiscount(500);
      handleShowToast("Promo code KES500 applied (KSh 500 off)!", "success");
    } else if (code === '') {
      setPromoCode('');
      setDiscountPercent(0);
      setFlatDiscount(0);
    } else {
      handleShowToast("Invalid promo code.", "warning");
    }
  };

  // Complete Checkout Flow
  const handleSubmitOrder = async (order: Order) => {
    try {
      await addOrder(order);
      setActiveOrder(order);
      setCart([]); // Reset Cart
      setPromoCode('');
      setDiscountPercent(0);
      setFlatDiscount(0);
      setOrderNote('');
      handleShowToast("Order placed successfully!", "success");
      setView('success');
    } catch (err) {
      console.error("Error saving order:", err);
      handleShowToast("Failed to save order to the database. Please try again.", "warning");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setWishlist([]); // Clear buyer wishlist on logout
      setView('store');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleNavigate = (targetView: typeof view, tabName?: string) => {
    setView(targetView);
    if (targetView === 'account' && tabName) {
      setAccountTab(tabName);
    }
  };

  const isAdminAuthenticated = currentUser !== null && currentUser.uid === SUPER_ADMIN_UID;

  // Filter and Sort products
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = searchQuery.trim() === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.basePrice - b.basePrice;
      } else if (sortBy === 'price-desc') {
        return b.basePrice - a.basePrice;
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0; // featured default
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Brand navigation bar */}
      <Navbar
        settings={settings}
        cart={cart}
        currentView={view}
        onNavigate={handleNavigate}
        onOpenCart={() => setCartOpen(true)}
        currentUser={currentUser}
        isAdminAuthenticated={isAdminAuthenticated}
        onSignOut={handleSignOut}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        wishlistCount={wishlist.length}
      />

      {/* Main Views router */}
      <main style={{ flexGrow: 1, paddingBottom: '60px' }}>
        
        {/* VIEW G: Landing Page */}
        {view === 'landing' && (
          <div>
            {/* Typographic Hero */}
            <section className="hero" style={{ backgroundColor: '#000000', color: '#FFFFFF', padding: '100px 24px', textAlign: 'center' }}>
              <div className="container" style={{ animation: 'fadeInUp 0.6s ease' }}>
                <span style={{ fontSize: '0.9rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-primary)', fontWeight: 'bold', display: 'block', marginBottom: '16px' }}>
                  GoldenCare Market &bull; Est. 2026
                </span>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1, color: '#FFFFFF', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '-1px' }}>
                  Wellness Redefined.<br />Minimal Design. Maximum Function.
                </h1>
                <p style={{ maxWidth: '680px', margin: '0 auto 40px', color: '#D1D5DB', fontSize: '1.2rem', lineHeight: 1.6 }}>
                  Curated daily recovery and lifestyle design objects built with 3K Carbon Fiber, AeroGel insulation, and integrated Bluetooth sensors.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn" 
                    onClick={() => setView('store')}
                    style={{ fontSize: '1.1rem', padding: '16px 36px', backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #FFFFFF', minHeight: '52px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Shop the Collection
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => {
                      const visionEl = document.getElementById('brand-vision');
                      if (visionEl) visionEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{ fontSize: '1.1rem', padding: '16px 36px', borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent', border: '1px solid #FFFFFF', minHeight: '52px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Our Philosophy
                  </button>
                </div>
              </div>
            </section>

            {/* Brand Vision / Philosophy */}
            <section id="brand-vision" style={{ padding: '80px 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #000000' }}>
              <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                  <div>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '1.2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '20px' }}>
                      01. Material Focus
                    </h3>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      We craft tools using structural 3K carbon fiber, medical-grade AeroGel insulation, and aerospace aluminum. Built to perform, finished to inspire.
                    </p>
                  </div>
                  <div>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '1.2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '20px' }}>
                      02. Invisible Utility
                    </h3>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      Integrated Bluetooth connectivity, touch-capacitive LEDs, and smart alarm alerts are built directly into clean, minimalist silhouettes.
                    </p>
                  </div>
                  <div>
                    <h3 style={{ textTransform: 'uppercase', fontSize: '1.2rem', color: '#000000', borderBottom: '2px solid #000000', paddingBottom: '12px', marginBottom: '20px' }}>
                      03. Modern Dignity
                    </h3>
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                      Supporting active routines with premium, high-design objects that seamlessly integrate into a modern home or professional workspace.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Products */}
            <section style={{ padding: '80px 24px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #000000' }}>
              <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '2px solid #000000', paddingBottom: '16px' }}>
                  <h2 style={{ textTransform: 'uppercase', fontSize: '2rem', margin: 0 }}>Featured Systems</h2>
                  <button onClick={() => setView('store')} style={{ background: 'none', border: 'none', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', color: '#000' }}>
                    View All Products &rarr;
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
                  {products.slice(0, 3).map(prod => (
                    <div key={prod.id} className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', border: '2px solid #000000', backgroundColor: '#FFFFFF', boxShadow: 'none' }}>
                      <div style={{ height: '220px', width: '100%', overflow: 'hidden', borderBottom: '2px solid #000000', position: 'relative' }}>
                        {prod.badge && (
                          <span style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#000000', color: '#FFFFFF', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {prod.badge}
                          </span>
                        )}
                        <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>{prod.category}</span>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 12px 0', color: '#000' }}>{prod.name}</h4>
                        <p style={{ color: '#555', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px', flexGrow: 1 }}>{prod.description}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#000' }}>KSh {prod.basePrice.toLocaleString()}</span>
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setView('product-details');
                            }}
                            style={{ minHeight: '38px', padding: '6px 16px' }}
                          >
                            Explore
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section style={{ padding: '80px 24px', backgroundColor: '#000000', color: '#FFFFFF', textAlign: 'center', borderBottom: '1px solid #FFFFFF' }}>
              <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <h2 style={{ textTransform: 'uppercase', color: '#FFFFFF', fontSize: '1.8rem', letterSpacing: '0.1em' }}>Design Critics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
                  <div>
                    <p style={{ fontSize: '1.3rem', fontStyle: 'italic', color: '#D1D5DB', marginBottom: '12px' }}>
                      "A masterclass in modern functional design. GoldenCare treats support objects as serious design projects."
                    </p>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--gold-primary)' }}>— Design Today</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '1.3rem', fontStyle: 'italic', color: '#D1D5DB', marginBottom: '12px' }}>
                      "Stark, minimalist wellness items you actually want to display in your living room. An absolute triumph."
                    </p>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--gold-primary)' }}>— Grid Magazine</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Newsletter */}
            <section style={{ padding: '80px 24px', backgroundColor: '#FFFFFF', textAlign: 'center' }}>
              <div className="container" style={{ maxWidth: '560px' }}>
                <h3 style={{ textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '12px' }}>Join the Newsletter</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Subscribe to receive design releases, structural upgrades, and exclusive pre-order discounts.
                </p>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleShowToast("Subscribed successfully!", "success");
                    (e.target as HTMLFormElement).reset();
                  }}
                  style={{ display: 'flex', gap: '10px' }}
                >
                  <input 
                    type="email" 
                    placeholder="Enter email address" 
                    className="form-input" 
                    style={{ flexGrow: 1, minHeight: '48px', border: '2px solid #000000', padding: '10px 16px' }}
                    required 
                  />
                  <button type="submit" className="btn btn-primary" style={{ minHeight: '48px', padding: '0 24px' }}>
                    Subscribe
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}

        {/* VIEW A: Storefront */}
        {view === 'store' && (
          <div>
            {/* Stark typographic hero for Shop page */}
            <section className="hero" style={{ backgroundColor: '#000000', color: '#FFFFFF', padding: '60px 24px', textAlign: 'center', marginBottom: '40px' }}>
              <div className="container">
                <span style={{ fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-primary)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  Curated Catalog
                </span>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                  Systems Shop
                </h1>
                <p style={{ maxWidth: '600px', margin: '0 auto', color: '#9CA3AF', fontSize: '1rem' }}>
                  Explore our engineered wellness objects. Pure geometry, carbon fiber construction, and smart alert integrations.
                </p>
              </div>
            </section>

            {/* Grid Container */}
            <section className="container" id="products-section">
              <div className="store-controls-bar">
                <div className="category-pills">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div className="sort-select-wrapper">
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sort By:</span>
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Avg. Customer Rating</option>
                  </select>
                </div>
              </div>
              
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <h3>No products found matching your search.</h3>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map(prod => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      settings={settings}
                      onSelectProduct={(p) => {
                        setSelectedProduct(p);
                        setView('product-details');
                      }}
                      isWishlisted={wishlist.includes(prod.id)}
                      onToggleWishlist={handleToggleWishlist}
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
            products={products}
            settings={settings}
            onBack={() => {
              setView('store');
              setSelectedProduct(null);
            }}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            currentUser={currentUser}
            onSelectProduct={(p) => setSelectedProduct(p)}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            onToggleWishlist={handleToggleWishlist}
            onReviewSubmitted={handleRefreshProducts}
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
            discountPercent={discountPercent}
            flatDiscount={flatDiscount}
            orderNote={orderNote}
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

        {/* VIEW F: Buyer Account settings */}
        {view === 'account' && currentUser && (
          <BuyerAccount
            currentUser={currentUser}
            onReturnToStore={() => setView('store')}
            wishlist={wishlist}
            products={products}
            onRemoveWishlist={handleRemoveWishlist}
            onAddToCart={handleAddToCart}
            onShowToast={handleShowToast}
            initialTab={accountTab}
          />
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
        promoCode={promoCode}
        onApplyPromo={handleApplyPromo}
        discountPercent={discountPercent}
        flatDiscount={flatDiscount}
        orderNote={orderNote}
        onUpdateOrderNote={setOrderNote}
        onShowToast={handleShowToast}
      />

      {/* Sleek Custom Toast Notifications Overlay */}
      <div className="toast-overlay">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <span>{toast.message}</span>
            <button 
              className="toast-close-btn" 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
