import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';

import { Checkout } from './components/Checkout';
import { SuccessView } from './components/SuccessView';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { BuyerAccount } from './components/BuyerAccount';
import { AboutPage } from './components/AboutPage';
import { PolicyPage } from './components/PolicyPage';
import { TermsPage } from './components/TermsPage';
import { BuyerAuth } from './components/BuyerAuth';
import { CartPage } from './components/CartPage';
import { ComingSoonPage } from './components/ComingSoonPage';
import { useLocation, navigate, Link } from './Router';

import { Product, CartItem, Order, ShopSettings } from './types';
import { initDb, getProducts, getSettings, addOrder } from './db';

import './App.css';

const SUPER_ADMIN_UID = "avIScAH5NQMWN2zf6Z3YwEEQw302";

function App() {
  const path = useLocation();
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAdminAuthenticated = currentUser !== null && currentUser.uid === SUPER_ADMIN_UID;

  // Wishlist and UI states
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('goldencare_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const accountTab = 'overview';

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

  // Dynamic route helper mapping
  const isProductDetail = path.startsWith('/product/');
  const pathProductId = isProductDetail ? path.replace('/product/', '') : null;
  const matchedProduct = products.find(p => p.id === pathProductId);

  const comingSoonTitles: Record<string, string> = {
    '/gift-cards': 'Gift Cards',
    '/find-a-store': 'Find a Store',
    '/customer-care': 'Customer Care',
    '/feedback': 'Site Feedback',
    '/help': 'Get Help',
    '/order-status': 'Order Status',
    '/shipping-delivery': 'Shipping & Delivery',
    '/payment-options': 'Payment Options',
    '/news': 'News',
    '/careers': 'Careers',
    '/sustainability': 'Sustainability',
    '/coupons': 'Member Coupons',
    '/newsletter': 'Newsletter Signup',
    '/guides': 'Guides'
  };

  // Client-side access control redirects
  useEffect(() => {
    if (authLoading) return;

    if (path.startsWith('/dashboard')) {
      if (!isAdminAuthenticated) {
        navigate('/admin-login');
      }
    } else if (path === '/admin-login') {
      if (isAdminAuthenticated) {
        navigate('/dashboard/home');
      }
    } else if (path === '/account') {
      if (!currentUser) {
        navigate('/auth');
      }
    }
  }, [path, currentUser, isAdminAuthenticated, authLoading]);

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
    navigate('/checkout');
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
      navigate('/success');
    } catch (err) {
      console.error("Error saving order:", err);
      handleShowToast("Failed to save order to the database. Please try again.", "warning");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setWishlist([]); // Clear buyer wishlist on logout
      navigate('/shop');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

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

  // Derive currentView from path for Navbar tab activation and UI highlights
  let derivedView: 'landing' | 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account' | 'about' | 'policy' | 'terms' | 'auth' = 'landing';
  if (path === '/') derivedView = 'landing';
  else if (path === '/shop') derivedView = 'store';
  else if (path.startsWith('/product/')) derivedView = 'product-details';
  else if (path === '/checkout') derivedView = 'checkout';
  else if (path === '/success') derivedView = 'success';
  else if (path.startsWith('/dashboard')) derivedView = 'admin';
  else if (path === '/account') derivedView = 'account';
  else if (path === '/about') derivedView = 'about';
  else if (path === '/policy' || path === '/privacy-policy') derivedView = 'policy';
  else if (path === '/terms' || path === '/terms-of-use' || path === '/terms-of-sale') derivedView = 'terms';
  else if (path === '/auth') derivedView = 'auth';

  const isDashboardRoute = path.startsWith('/dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Brand navigation bar */}
      {!isDashboardRoute && (
        <Navbar
          settings={settings}
          cart={cart}
          currentView={derivedView}
          currentUser={currentUser}
          isAdminAuthenticated={isAdminAuthenticated}
          onSignOut={handleSignOut}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          wishlistCount={wishlist.length}
        />
      )}

      {/* Main Views router */}
      <main style={{ flexGrow: 1 }}>
        
        {/* VIEW G: Landing Page */}
        {path === '/' && (
          <div>
            {/* Nike Campaign Hero */}
            <section 
              className="campaign-hero" 
              style={{ 
                backgroundImage: 'linear-gradient(to bottom, rgba(17,17,17,0.1) 0%, rgba(17,17,17,0.4) 100%), url(https://images.unsplash.com/photo-1476480862126-209bbcafd4eb?q=80&w=1600)' 
              }}
            >
              <div className="campaign-hero-inner">
                <div className="campaign-hero-content">
                  <span style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--color-canvas)', fontWeight: 600, display: 'block', marginBottom: '12px' }}>
                    GoldenCare GC System &bull; Est. 2026
                  </span>
                  <h1 className="font-display-campaign">
                    WELLNESS REDEFINED.<br />FUNCTION OVER CHROME.
                  </h1>
                  <p className="font-body-md" style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 32px', maxWidth: '600px' }}>
                    Curated daily recovery and lifestyle design objects built with 3K Carbon Fiber, AeroGel insulation, and integrated Bluetooth sensors.
                  </p>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                      className="btn btn-outline-on-image" 
                      onClick={() => navigate('/shop')}
                    >
                      Shop the Collection
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => {
                        const visionEl = document.getElementById('brand-vision');
                        if (visionEl) visionEl.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{ backgroundColor: 'transparent', color: '#ffffff', borderColor: '#ffffff', padding: '12px 24px', height: '44px', minHeight: '44px' }}
                    >
                      Our Philosophy
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Brand Vision / Philosophy (Rhythm section spacing) */}
            <section id="brand-vision" className="section-block" style={{ padding: '48px 0', backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--color-hairline-soft)' }}>
              <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                  <div>
                    <h3 className="font-heading-md" style={{ borderBottom: '1px solid var(--color-ink)', paddingBottom: '12px', marginBottom: '20px', textTransform: 'uppercase' }}>
                      01. Material Focus
                    </h3>
                    <p className="font-body-md">
                      We craft tools using structural 3K carbon fiber, medical-grade AeroGel insulation, and aerospace aluminum. Built to perform, finished to inspire.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-heading-md" style={{ borderBottom: '1px solid var(--color-ink)', paddingBottom: '12px', marginBottom: '20px', textTransform: 'uppercase' }}>
                      02. Invisible Utility
                    </h3>
                    <p className="font-body-md">
                      Integrated Bluetooth connectivity, touch-capacitive LEDs, and smart alarm alerts are built directly into clean, minimalist silhouettes.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-heading-md" style={{ borderBottom: '1px solid var(--color-ink)', paddingBottom: '12px', marginBottom: '20px', textTransform: 'uppercase' }}>
                      03. Modern Dignity
                    </h3>
                    <p className="font-body-md">
                      Supporting active routines with premium, high-design objects that seamlessly integrate into a modern home or professional workspace.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Featured Products */}
            <section className="section-block" style={{ padding: '48px 0', backgroundColor: 'var(--color-canvas)' }}>
              <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '16px' }}>
                  <h2 className="font-heading-xl">Featured Systems</h2>
                  <button onClick={() => navigate('/shop')} style={{ background: 'none', border: 'none', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', fontSize: '15px', color: 'var(--color-ink)' }}>
                    View All Products &rarr;
                  </button>
                </div>

                <div className="product-grid">
                  {products.slice(0, 3).map(prod => (
                    <div 
                      key={prod.id} 
                      className="prod-card" 
                      onClick={() => {
                        navigate(`/product/${prod.id}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="prod-img-container">
                        {prod.badge && (
                          <span className="badge-promo">{prod.badge}</span>
                        )}
                        <img src={prod.image} alt={prod.name} className="prod-img" />
                      </div>
                      <div className="prod-card-metadata">
                        <span className="prod-card-category">{prod.category}</span>
                        <h4 className="prod-card-title">{prod.name}</h4>
                        <div className="prod-card-price-row">
                          {prod.id === 'prod-magnify' ? (
                            <>
                              <span className="price-sale">KSh {prod.basePrice.toLocaleString()}</span>
                              <span className="price-original">KSh {(10000).toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="price-regular">KSh {prod.basePrice.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section className="section-block" style={{ padding: '80px 0', backgroundColor: 'var(--color-ink)', color: 'var(--color-canvas)', textAlign: 'center' }}>
              <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <h2 className="font-heading-xl" style={{ color: 'var(--color-canvas)' }}>Design Critics</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
                  <div>
                    <p className="font-heading-lg" style={{ fontStyle: 'italic', color: '#D1D5DB', marginBottom: '12px', fontWeight: 400 }}>
                      "A masterclass in modern functional design. GoldenCare treats support objects as serious design projects."
                    </p>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-canvas)', textTransform: 'uppercase', letterSpacing: '1px' }}>— Design Today</span>
                  </div>
                  <div>
                    <p className="font-heading-lg" style={{ fontStyle: 'italic', color: '#D1D5DB', marginBottom: '12px', fontWeight: 400 }}>
                      "Stark, minimalist wellness items you actually want to display in your living room. An absolute triumph."
                    </p>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-canvas)', textTransform: 'uppercase', letterSpacing: '1px' }}>— Grid Magazine</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Newsletter */}
            <section className="section-block" style={{ padding: '60px 0', backgroundColor: 'var(--color-canvas)', textAlign: 'center' }}>
              <div className="container" style={{ maxWidth: '560px' }}>
                <h3 className="font-heading-lg" style={{ marginBottom: '12px', textTransform: 'uppercase' }}>Join the Newsletter</h3>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', marginBottom: '24px' }}>
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
                    style={{ flexGrow: 1, minHeight: '48px', padding: '10px 16px' }}
                    required 
                  />
                  <button type="submit" className="btn btn-primary" style={{ minHeight: '48px', padding: '0 28px' }}>
                    Subscribe
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}

        {/* VIEW A: Storefront */}
        {path === '/shop' && (
          <div>
            {/* Stark campaign hero for Shop page */}
            <section 
              className="campaign-hero" 
              style={{ 
                height: '360px', 
                marginBottom: '32px', 
                backgroundImage: 'linear-gradient(to bottom, rgba(17,17,17,0.2) 0%, rgba(17,17,17,0.5) 100%), url(https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1600)' 
              }}
            >
              <div className="campaign-hero-inner">
                <div className="campaign-hero-content" style={{ paddingBottom: '0px' }}>
                  <span style={{ fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--color-canvas)', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                    Engineered Catalog
                  </span>
                  <h1 className="font-display-campaign" style={{ fontSize: '64px', marginBottom: '8px' }}>
                    SYSTEMS SHOP
                  </h1>
                  <p className="font-body-md" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '15px', marginBottom: '0px', maxWidth: '600px' }}>
                    Explore our engineered wellness objects. Pure geometry, carbon fiber construction, and smart alert integrations.
                  </p>
                </div>
              </div>
            </section>

            {/* Grid Container */}
            <section className="container section-block" id="products-section">
              <div className="store-controls-bar">
                <div className="category-pills">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                
                <div className="sort-select-wrapper">
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-mute)' }}>Sort By:</span>
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    style={{ borderRadius: '24px', border: '1px solid var(--color-hairline)', padding: '6px 16px' }}
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
                      onSelectProduct={() => {}}
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
        {isProductDetail && (
          matchedProduct ? (
            <ProductDetail
              product={matchedProduct}
              products={products}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              currentUser={currentUser}
              onSelectProduct={(p) => navigate(`/product/${p.id}`)}
              isWishlisted={wishlist.includes(matchedProduct.id)}
              onToggleWishlist={handleToggleWishlist}
              onReviewSubmitted={handleRefreshProducts}
            />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <h3>Product not found or loading...</h3>
            </div>
          )
        )}

        {/* VIEW C: Checkout flow */}
        {path === '/checkout' && (
          <Checkout
            settings={settings}
            cart={cart}
            currentUser={currentUser}
            onSubmitOrder={handleSubmitOrder}
            discountPercent={discountPercent}
            flatDiscount={flatDiscount}
            orderNote={orderNote}
          />
        )}

        {/* VIEW D: Order Successful */}
        {path === '/success' && activeOrder && (
          <SuccessView
            order={activeOrder}
            settings={settings}
          />
        )}

        {/* VIEW E-1: Admin Login */}
        {path === '/admin-login' && (
          <AdminLogin
            superAdminUid={SUPER_ADMIN_UID}
            onLoginSuccess={() => navigate('/dashboard/home')}
          />
        )}

        {/* VIEW E-2: Admin Management */}
        {path.startsWith('/dashboard') && (
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
          ) : null
        )}

        {/* VIEW F: Buyer Account settings */}
        {path === '/account' && currentUser && (
          <BuyerAccount
            currentUser={currentUser}
            wishlist={wishlist}
            products={products}
            onRemoveWishlist={handleRemoveWishlist}
            onAddToCart={handleAddToCart}
            onShowToast={handleShowToast}
            initialTab={accountTab}
          />
        )}

        {/* VIEW H: Buyer Authentication */}
        {path === '/auth' && (
          <div className="container" style={{ padding: '40px 0' }}>
            <BuyerAuth onSuccess={() => navigate('/account')} />
          </div>
        )}

        {/* VIEW I: About Page */}
        {path === '/about' && (
          <AboutPage />
        )}

        {/* VIEW J: Policy Page */}
        {(path === '/policy' || path === '/privacy-policy') && (
          <PolicyPage />
        )}

        {/* VIEW K: Terms Page */}
        {(path === '/terms' || path === '/terms-of-use' || path === '/terms-of-sale') && (
          <TermsPage />
        )}

        {/* VIEW L: Cart Page */}
        {path === '/cart' && (
          <CartPage
            cart={cart}
            onUpdateQuantity={handleUpdateCartQty}
            onRemoveItem={handleRemoveCartItem}
            promoCode={promoCode}
            onApplyPromo={handleApplyPromo}
            discountPercent={discountPercent}
            flatDiscount={flatDiscount}
            orderNote={orderNote}
            onUpdateOrderNote={setOrderNote}
            onShowToast={handleShowToast}
          />
        )}

        {/* VIEW M: Coming Soon / Placeholder Page */}
        {comingSoonTitles[path] && (
          <ComingSoonPage title={comingSoonTitles[path]} />
        )}

      </main>

      {/* Nike Premium Footer */}
      {!isDashboardRoute && (
        <footer className="footer">
          <div className="container">
            <div className="footer-columns">
              <div className="footer-links">
                <h4 className="footer-col-header">Resources</h4>
                <Link to="/gift-cards" className="footer-link">Gift Cards</Link>
                <Link to="/find-a-store" className="footer-link">Find a Store</Link>
                <Link to="/customer-care" className="footer-link">Customer Care</Link>
                <Link to="/feedback" className="footer-link">Site Feedback</Link>
              </div>
              <div className="footer-links">
                <h4 className="footer-col-header">Help</h4>
                <Link to="/help" className="footer-link">Get Help</Link>
                <Link to="/order-status" className="footer-link">Order Status</Link>
                <Link to="/shipping-delivery" className="footer-link">Shipping & Delivery</Link>
                <Link to="/payment-options" className="footer-link">Payment Options</Link>
              </div>
              <div className="footer-links">
                <h4 className="footer-col-header">Company</h4>
                <Link to="/about" className="footer-link">About GoldenCare</Link>
                <Link to="/news" className="footer-link">News</Link>
                <Link to="/careers" className="footer-link">Careers</Link>
                <Link to="/sustainability" className="footer-link">Sustainability</Link>
              </div>
              <div className="footer-links">
                <h4 className="footer-col-header">Promotions & Discounts</h4>
                <Link to="/coupons" className="footer-link">Member Coupons</Link>
                <Link to="/newsletter" className="footer-link">Newsletter Signup</Link>
              </div>
            </div>
            <hr className="footer-divider" />
            <div className="footer-fineprint">
              <span className="font-utility-xs">&copy; 2026 GoldenCare Market, Inc. All Rights Reserved</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Link to="/guides" className="font-utility-xs">Guides</Link>
                <Link to="/terms-of-sale" className="font-utility-xs">Terms of Sale</Link>
                <Link to="/terms" className="font-utility-xs">Terms of Use</Link>
                <Link to="/policy" className="font-utility-xs">Privacy Policy</Link>
              </div>
            </div>
          </div>
        </footer>
      )}

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
