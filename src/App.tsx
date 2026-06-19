import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { ProductQuickView } from './components/ProductQuickView';

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
import { HomePage } from './components/HomePage';
import { useLocation, navigate, Link } from './Router';
import { LayoutGrid, List, ChevronRight, Home, Store, ShoppingCart, User as UserIcon } from 'lucide-react';

import { Product, CartItem, Order, ShopSettings, HomeSlide, Category, Coupon, ShippingZone, TaxClass, CustomPage } from './types';
import { initDb, getProducts, getSettings, addOrder, getHomeSlides, getCategories, getCoupons, getOrders, getShippingZones, getTaxClasses, getBuyerProfile, getWishlist, saveWishlist, migrateSettings, getCustomPage } from './db';
import { sendOrderEmails } from './utils/emailService';
import { sendWhatsappMessage } from './utils/whatsappService';

import './App.css';

const SUPER_ADMIN_UID = "avIScAH5NQMWN2zf6Z3YwEEQw302";

interface CmsCustomPageViewProps {
  path: string;
}

function CmsCustomPageView({ path }: CmsCustomPageViewProps) {
  const slug = path.replace(/^\/(page|p)\//, '');
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPage = async () => {
      try {
        setLoading(true);
        const data = await getCustomPage(slug);
        if (active) {
          setPage(data);
        }
      } catch (err) {
        console.error("Error loading custom page:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadPage();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 40px', minHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton-row-box skeleton-pulse" style={{ height: '36px', width: '300px' }} />
        <div className="skeleton-row-box skeleton-pulse" style={{ height: '200px', width: '100%' }} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container" style={{ padding: '80px 40px', textAlign: 'center', minHeight: '50vh' }}>
        <h1 className="font-heading-xl" style={{ marginBottom: '16px' }}>Page Not Found</h1>
        <p className="font-body-md" style={{ color: 'var(--text-mute)', marginBottom: '24px' }}>The page you are looking for does not exist or has been moved.</p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center' }}>Go to Homepage</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '60px 40px', minHeight: '60vh' }}>
      <h1 className="font-display-campaign" style={{ fontSize: '48px', marginBottom: '32px', textTransform: 'uppercase', borderBottom: '2px solid var(--color-ink)', paddingBottom: '16px' }}>
        {page.title}
      </h1>
      <div 
        className="cms-rendered-html"
        dangerouslySetInnerHTML={{ __html: page.html }} 
        style={{ fontSize: '16px', lineHeight: 1.8, color: 'var(--text-charcoal)' }}
      />
    </div>
  );
}

function App() {
  const path = useLocation();
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: "GoldenCare Market",
    phone: "",
    address: "",
    paystackPublicKey: "pk_live_e5580acce4031873047e94487adc62b82e887b94",
    demoMode: false,
    voiceAssistDefault: false,
    voiceRate: 0.95,
    shippingFee: 1500,
    shippingFreeThreshold: 30000,
    taxRate: 16
  });

  // Data lists
  const [products, setProducts] = useState<Product[]>([]);
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('goldencare_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  
  // Modals & Panels UI

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);

  const isAdminAuthenticated = currentUser !== null && 
    (currentUser.uid === SUPER_ADMIN_UID || 
     currentUserRole === 'admin' || 
     currentUserRole === 'shop_manager' || 
     currentUserRole === 'contributor');

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  const wishlistSyncRef = useRef(false);
  let accountTab: 'overview' | 'orders' | 'wishlist' | 'address' | 'profile' | 'security' = 'overview';
  if (path.startsWith('/account/')) {
    const sub = path.replace('/account/', '');
    if (['overview', 'orders', 'wishlist', 'address', 'profile', 'security'].includes(sub)) {
      accountTab = sub as any;
    }
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Coupon states
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [flatDiscount, setFlatDiscount] = useState(0);

  // Order notes
  const [orderNote, setOrderNote] = useState('');

  // Toast Alerts
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'warning' }[]>([]);

  // Categories & Coupons lists
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [dbCoupons, setDbCoupons] = useState<Coupon[]>([]);
  const [dbShippingZones, setDbShippingZones] = useState<ShippingZone[]>([]);
  const [dbTaxClasses, setDbTaxClasses] = useState<TaxClass[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const handleShowToast = (message: string, type: 'success' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Sync wishlist to local storage + Firestore
  useEffect(() => {
    localStorage.setItem('goldencare_wishlist', JSON.stringify(wishlist));
    // Persist to Firestore for logged-in users (skip the initial load sync)
    if (currentUser && wishlistSyncRef.current) {
      saveWishlist(currentUser.uid, wishlist).catch(err => console.error('Wishlist sync error:', err));
    }
  }, [wishlist, currentUser]);

  // Load wishlist from Firestore when user logs in
  useEffect(() => {
    const loadWishlist = async () => {
      if (currentUser) {
        try {
          const firestoreWishlist = await getWishlist(currentUser.uid);
          const localWishlist: string[] = JSON.parse(localStorage.getItem('goldencare_wishlist') || '[]');
          // Merge: union of Firestore + localStorage items
          const merged = Array.from(new Set([...firestoreWishlist, ...localWishlist]));
          setWishlist(merged);
          // Save merged list back to Firestore
          if (merged.length > 0) {
            await saveWishlist(currentUser.uid, merged);
          }
        } catch (err) {
          console.error('Error loading wishlist from Firestore:', err);
        }
        // Enable Firestore sync after initial load
        wishlistSyncRef.current = true;
      } else {
        wishlistSyncRef.current = false;
      }
    };
    loadWishlist();
  }, [currentUser]);

  // Initialize viewMode from admin settings once loaded
  useEffect(() => {
    if (settings.shopPageDefaultView) {
      setViewMode(settings.shopPageDefaultView);
    }
  }, [settings.shopPageDefaultView]);

  // Sync cart to local storage
  useEffect(() => {
    localStorage.setItem('goldencare_cart', JSON.stringify(cart));
  }, [cart]);

  // Setup manual scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Fallback animation frame and timeouts to ensure page is at top after rendering new elements
    const rafId = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [path]);

  // Bind global toast trigger
  useEffect(() => {
    window.showToast = handleShowToast;
    return () => {
      delete window.showToast;
    };
  }, []);

  // Inject Shop Settings branding and favicon
  useEffect(() => {
    if (settings.brandingPrimaryColor) {
      document.documentElement.style.setProperty('--color-ink', settings.brandingPrimaryColor);
    }
    if (settings.brandingSecondaryColor) {
      document.documentElement.style.setProperty('--color-sale', settings.brandingSecondaryColor);
    }
    if (settings.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings]);


  // Initialize DB and load states in realtime
  useEffect(() => {
    // 1. Initialize database in background (seeds if empty)
    const runInit = async () => {
      try {
        await initDb();
      } catch (err) {
        console.error("Error initializing DB:", err);
      }
    };
    runInit();

    setIsAppLoading(true);

    // 2. Set up realtime listeners using onSnapshot
    // These will immediately pull cached data from persistent cache, then sync from the network.
    
    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, "settings", "general"), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(migrateSettings(snapshot.data() as ShopSettings));
      }
    }, (err) => console.error("Error listening to settings:", err));

    // Listen to products
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(docSnap => {
        prods.push(docSnap.data() as Product);
      });
      setProducts(prods);
      setIsAppLoading(false); // Disable loading spinner immediately once data is ready from cache/server
    }, (err) => {
      console.error("Error listening to products:", err);
      setIsAppLoading(false);
    });

    // Listen to home slides
    const unsubSlides = onSnapshot(collection(db, "home_slides"), (snapshot) => {
      const list: HomeSlide[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as HomeSlide);
      });
      setSlides(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (err) => console.error("Error listening to slides:", err));

    // Listen to categories
    const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Category);
      });
      setDbCategories(list);
    }, (err) => console.error("Error listening to categories:", err));

    // Listen to coupons
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snapshot) => {
      const list: Coupon[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Coupon);
      });
      setDbCoupons(list);
    }, (err) => console.error("Error listening to coupons:", err));

    // Listen to shipping zones
    const unsubZones = onSnapshot(collection(db, "shipping_zones"), (snapshot) => {
      const list: ShippingZone[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ShippingZone);
      });
      setDbShippingZones(list);
    }, (err) => console.error("Error listening to shipping zones:", err));

    // Listen to tax classes
    const unsubTax = onSnapshot(collection(db, "tax_classes"), (snapshot) => {
      const list: TaxClass[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as TaxClass);
      });
      setDbTaxClasses(list);
    }, (err) => console.error("Error listening to tax classes:", err));

    // Firebase Auth State Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => {
      unsubSettings();
      unsubProducts();
      unsubSlides();
      unsubCategories();
      unsubCoupons();
      unsubZones();
      unsubTax();
      unsubscribeAuth();
    };
  }, []);

  // Fetch logged-in user's role and avatar
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) {
        setCurrentUserRole(null);
        setCurrentUserAvatarUrl(null);
        setRoleLoading(false);
        return;
      }
      if (currentUser.uid === SUPER_ADMIN_UID) {
        setCurrentUserRole('admin');
        setCurrentUserAvatarUrl(null);
        setRoleLoading(false);
        return;
      }
      setRoleLoading(true);
      try {
        const profile = await getBuyerProfile(currentUser.uid);
        if (profile) {
          setCurrentUserRole(profile.role || 'customer');
          setCurrentUserAvatarUrl(profile.avatarUrl || null);
        } else {
          setCurrentUserRole('customer');
          setCurrentUserAvatarUrl(null);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setCurrentUserRole('customer');
        setCurrentUserAvatarUrl(null);
      } finally {
        setRoleLoading(false);
      }
    };
    fetchUserRole();
  }, [currentUser]);

  // Slides auto-advance logic
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  // Dynamic route helper mapping
  const isProductDetail = path.startsWith('/product/');
  const pathProductId = isProductDetail ? path.replace('/product/', '') : null;
  const matchedProduct = products.find(p => p.id === pathProductId);

  // Dynamically update document.title based on current view/route
  useEffect(() => {
    if (!settings.shopName) return;
    
    if (path === '/shop') {
      document.title = settings.cmsShopMetaTitle || `Shop - ${settings.shopName}`;
    } else if (path.startsWith('/product/')) {
      if (matchedProduct) {
        document.title = `${matchedProduct.name} - ${settings.shopName}`;
      } else {
        document.title = settings.shopName;
      }
    } else if (path.startsWith('/dashboard')) {
      document.title = `Admin Dashboard - ${settings.shopName}`;
    } else {
      document.title = settings.seoTitle || settings.shopName;
    }
  }, [path, settings, matchedProduct]);

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
    if (authLoading || roleLoading) return;

    if (path.startsWith('/dashboard')) {
      if (!isAdminAuthenticated) {
        navigate('/admin-login');
      }
    } else if (path === '/admin-login') {
      if (isAdminAuthenticated) {
        navigate('/dashboard/home');
      }
    } else if (path === '/account' || path.startsWith('/account/')) {
      if (!currentUser) {
        navigate('/auth');
      }
    }
  }, [path, currentUser, isAdminAuthenticated, authLoading, roleLoading]);

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

  const handleRefreshSlides = async () => {
    try {
      const loadedSlides = await getHomeSlides();
      setSlides(loadedSlides);
    } catch (err) {
      console.error("Error refreshing slides:", err);
    }
  };

  const handleRefreshCategories = async () => {
    try {
      const loadedCategories = await getCategories();
      setDbCategories(loadedCategories);
    } catch (err) {
      console.error("Error refreshing categories:", err);
    }
  };

  const handleRefreshCoupons = async () => {
    try {
      const loadedCoupons = await getCoupons();
      setDbCoupons(loadedCoupons);
    } catch (err) {
      console.error("Error refreshing coupons:", err);
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
  const handleApplyPromo = async (code: string) => {
    if (code === '') {
      setPromoCode('');
      setDiscountPercent(0);
      setFlatDiscount(0);
      return;
    }
    
    const matchedCoupon = dbCoupons.find(cp => cp.code.toUpperCase() === code.toUpperCase());
    if (matchedCoupon) {
      // 1. Check Date/Duration Validity
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      if (matchedCoupon.startDate && todayStr < matchedCoupon.startDate) {
        handleShowToast(`This promo code is not active yet. It starts on ${matchedCoupon.startDate}.`, "warning");
        return;
      }
      if (matchedCoupon.endDate && todayStr > matchedCoupon.endDate) {
        handleShowToast(`This promo code has expired on ${matchedCoupon.endDate}.`, "warning");
        return;
      }

      // 2. Check Customer Group Targeting Validity
      const group = matchedCoupon.customerGroup || 'all';
      if (group !== 'all') {
        if (!currentUser) {
          handleShowToast("Please log in to apply this promo code.", "warning");
          return;
        }

        // Fetch user's orders history to determine eligibility
        try {
          const allOrders = await getOrders();
          const userOrders = allOrders.filter(
            o => o.buyerEmail === currentUser.email || 
                 (currentUser.phoneNumber && o.customerPhone === currentUser.phoneNumber)
          );

          if (group === 'new') {
            if (userOrders.length > 0) {
              handleShowToast("This promo code is only available for first-time customers.", "warning");
              return;
            }
          } else if (group === 'returning') {
            if (userOrders.length === 0) {
              handleShowToast("This promo code is only available for returning customers.", "warning");
              return;
            }
          } else if (group === 'vip') {
            const cumulativeSpent = userOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            if (cumulativeSpent < 50000) {
              handleShowToast(`This promo code is reserved for VIP customers (spent KSh 50,000+). Your spent: KSh ${cumulativeSpent.toLocaleString()}`, "warning");
              return;
            }
          } else if (group === 'emails') {
            const allowedEmailsList = (matchedCoupon.allowedEmails || '').split(',').map(e => e.trim().toLowerCase());
            const userEmail = currentUser.email?.toLowerCase();
            if (!userEmail || !allowedEmailsList.includes(userEmail)) {
              handleShowToast("This promo code is not assigned to your customer account.", "warning");
              return;
            }
          }
        } catch (err) {
          console.error("Error validating coupon eligibility:", err);
          handleShowToast("Failed to validate promo code eligibility. Please try again.", "warning");
          return;
        }
      }

      setPromoCode(matchedCoupon.code);
      setDiscountPercent(matchedCoupon.discountPercent);
      setFlatDiscount(matchedCoupon.flatDiscount || 0);
      
      const discountText = matchedCoupon.discountPercent > 0 
        ? `${matchedCoupon.discountPercent}% off` 
        : `KSh ${(matchedCoupon.flatDiscount || 0).toLocaleString()} off`;
      handleShowToast(`Promo code ${matchedCoupon.code} applied (${discountText})!`, "success");
    } else {
      handleShowToast("Invalid promo code.", "warning");
    }
  };

  // Complete Checkout Flow
  const handleSubmitOrder = async (order: Order) => {
    try {
      await addOrder(order);
      
      // Dispatch order confirmation and alert emails and WhatsApp message
      try {
        await sendOrderEmails(order, settings);
      } catch (mailErr) {
        console.error("Failed to send order confirmation emails:", mailErr);
      }
      try {
        await sendWhatsappMessage(order, settings, 'created');
      } catch (waErr) {
        console.error("Failed to send order WhatsApp notification:", waErr);
      }

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

  // Video embed helpers for hero slider
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0` : null;
  };

  const getVimeoEmbedUrl = (url: string): string | null => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1&muted=1&loop=1&background=1` : null;
  };

  const getVideoEmbedUrl = (url: string): string | null => {
    return getYouTubeEmbedUrl(url) || getVimeoEmbedUrl(url);
  };

  // Filter and Sort products
  const categories = ['All', ...dbCategories.map(c => c.name)];

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = searchQuery.trim() === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.categories || [p.category]).some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || (p.categories || [p.category]).includes(selectedCategory);
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
      // 'featured' default: products with isFeatured === true go first
      const aFeatured = a.isFeatured ? 1 : 0;
      const bFeatured = b.isFeatured ? 1 : 0;
      return bFeatured - aFeatured;
    });

  // Derive currentView from path for Navbar tab activation and UI highlights
  let derivedView: 'landing' | 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account' | 'about' | 'policy' | 'terms' | 'auth' | 'custom-page' = 'landing';
  if (path === '/') derivedView = isMobile ? 'store' : 'landing';
  else if (path === '/shop') derivedView = 'store';
  else if (path.startsWith('/product/')) derivedView = 'product-details';
  else if (path === '/checkout') derivedView = 'checkout';
  else if (path === '/success') derivedView = 'success';
  else if (path.startsWith('/dashboard')) derivedView = 'admin';
  else if (path === '/account' || path.startsWith('/account/')) derivedView = 'account';
  else if (path === '/about') derivedView = 'about';
  else if (path === '/policy' || path === '/privacy-policy') derivedView = 'policy';
  else if (path === '/terms' || path === '/terms-of-use' || path === '/terms-of-sale') derivedView = 'terms';
  else if (path === '/auth') derivedView = 'auth';
  else if (path.startsWith('/page/') || path.startsWith('/p/')) derivedView = 'custom-page';

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
          currentUserAvatarUrl={currentUserAvatarUrl}
          products={products}
          categories={dbCategories}
          onSelectCategory={(categoryName) => {
            setSelectedCategory(categoryName);
            navigate('/shop');
          }}
        />
      )}

      {/* Main Views router */}
      <main style={{ flexGrow: 1 }}>
        
        {/* VIEW G: Landing Page */}
        {path === '/' && !isMobile && (
          <HomePage
            products={products}
            slides={slides}
            activeSlide={activeSlide}
            setActiveSlide={setActiveSlide}
            categories={categories}
            dbCategories={dbCategories}
            navigate={navigate}
            onAddToCart={(product, quantity) => {
              const item: CartItem = {
                id: `${product.id}-base`,
                product,
                selectedVariant: null,
                quantity,
              };
              handleAddToCart(item);
            }}
            isWishlisted={(id) => wishlist.includes(id)}
            onToggleWishlist={(product) => handleToggleWishlist(product.id)}
            onQuickView={(product) => setQuickViewProduct(product)}
            handleShowToast={handleShowToast}
            onSelectCategory={(categoryName) => {
              setSelectedCategory(categoryName);
              navigate('/shop');
            }}
            settings={settings}
            currentUser={currentUser}
          />
        )}

        {/* VIEW A: Storefront */}
        {(path === '/shop' || (path === '/' && isMobile)) && (
          <div>

            {/* Grid Container */}
            <section className="container section-block" id="products-section">
              {/* Breadcrumb */}
              <nav className="shop-breadcrumb">
                <Link to="/">Home</Link>
                <ChevronRight size={12} className="breadcrumb-separator" />
                <span className="breadcrumb-current">Shop</span>
              </nav>

              {/* Page Header */}
              <div className="shop-page-header">
                <h1 className="shop-page-title">{settings.cmsShopTitle || "Shop All"}</h1>
                <p className="shop-page-subtitle">{settings.cmsShopSubtitle || "Explore our curated collection of engineered wellness products."}</p>
              </div>

              {/* Controls Bar */}
              <div className="store-controls-bar">
                <div className="store-controls-left">
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
                  <span className="store-results-count">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                  </span>
                </div>
                
                <div className="store-controls-right">
                  <div className="sort-select-wrapper">
                    <select
                      id="sort-select"
                      className="sort-select"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>

                  <div className="view-toggle-group">
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      title="Grid view"
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      title="List view"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {isAppLoading ? (
                <div className={viewMode === 'list' ? 'product-list' : 'product-grid'}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} style={{ display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', gap: '12px' }}>
                      <div className="skeleton-image skeleton-pulse" style={{ backgroundColor: '#f0f0f1', width: viewMode === 'list' ? '220px' : '100%', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="skeleton-text title skeleton-pulse" style={{ backgroundColor: '#f0f0f1' }} />
                        <div className="skeleton-text skeleton-pulse" style={{ backgroundColor: '#f0f0f1' }} />
                        <div className="skeleton-text short skeleton-pulse" style={{ backgroundColor: '#f0f0f1' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mute)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🔍</div>
                  <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>No products found</h3>
                  <p style={{ fontSize: '14px' }}>Try adjusting your search or filter to find what you're looking for.</p>
                </div>
              ) : (
                <div className={viewMode === 'list' ? 'product-list' : 'product-grid'}>
                  {filteredProducts.map(prod => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={() => {}}
                      isWishlisted={wishlist.includes(prod.id)}
                      onToggleWishlist={handleToggleWishlist}
                      viewMode={viewMode}
                      onAddToCart={(p) => {
                        const item: CartItem = {
                          id: `${p.id}-base`,
                          product: p,
                          selectedVariant: null,
                          quantity: 1,
                        };
                        handleAddToCart(item);
                      }}
                      onQuickView={(p) => setQuickViewProduct(p)}
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
          ) : isAppLoading ? (
            <div className="container" style={{ padding: '30px 0' }}>
              {/* Breadcrumbs Skeleton */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                <div className="skeleton-row-box skeleton-pulse" style={{ height: '16px', width: '250px' }} />
              </div>

              {/* Main PDP Grid Layout Skeleton */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '48px', marginBottom: '48px' }}>
                
                {/* Left Side: Main Image Placeholder + Thumbnails */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="skeleton-image skeleton-pulse" style={{ aspectRatio: '1 / 1', width: '100%', backgroundColor: '#f0f0f1' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="skeleton-pulse" style={{ width: '80px', height: '60px', backgroundColor: '#f0f0f1' }} />
                    ))}
                  </div>
                </div>

                {/* Right Side: Product Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="skeleton-row-box skeleton-pulse" style={{ height: '36px', width: '80%' }} />
                  <div className="skeleton-row-box skeleton-pulse" style={{ height: '20px', width: '40%' }} />
                  <div className="skeleton-row-box skeleton-pulse" style={{ height: '24px', width: '30%' }} />
                  
                  <hr style={{ border: 'none', borderTop: '1px solid var(--color-hairline-soft)', margin: '12px 0' }} />
                  
                  <div className="skeleton-row-box skeleton-pulse" style={{ height: '60px', width: '100%' }} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <div className="skeleton-row-box skeleton-pulse" style={{ height: '20px', width: '50%' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[1, 2, 3].map(n => (
                        <div key={n} className="skeleton-pulse" style={{ width: '60px', height: '32px', backgroundColor: '#f0f0f1' }} />
                      ))}
                    </div>
                  </div>

                  <div className="skeleton-row-box skeleton-pulse" style={{ height: '48px', width: '100%', marginTop: '24px' }} />
                  <div className="skeleton-row-box skeleton-pulse" style={{ height: '48px', width: '100%' }} />
                </div>

              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <h3>Product not found.</h3>
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
            onChangeOrderNote={setOrderNote}
            shippingZones={dbShippingZones}
            taxClasses={dbTaxClasses}
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
              onRefreshSlides={handleRefreshSlides}
              categories={dbCategories}
              onRefreshCategories={handleRefreshCategories}
              coupons={dbCoupons}
              onRefreshCoupons={handleRefreshCoupons}
              shippingZones={dbShippingZones}
              onRefreshShippingZones={async () => {
                const z = await getShippingZones();
                setDbShippingZones(z);
              }}
              taxClasses={dbTaxClasses}
              onRefreshTaxClasses={async () => {
                const tc = await getTaxClasses();
                setDbTaxClasses(tc);
              }}
              currentUserRole={currentUserRole}
              currentUserUid={currentUser ? currentUser.uid : null}
              superAdminUid={SUPER_ADMIN_UID}
            />
          ) : null
        )}

        {/* VIEW F: Buyer Account settings */}
        {(path === '/account' || path.startsWith('/account/')) && currentUser && (
          <BuyerAccount
            currentUser={currentUser}
            wishlist={wishlist}
            products={products}
            onRemoveWishlist={handleRemoveWishlist}
            onAddToCart={handleAddToCart}
            onShowToast={handleShowToast}
            initialTab={accountTab}
            settings={settings}
            onProfileUpdate={setCurrentUserAvatarUrl}
          />
        )}

        {/* VIEW H: Buyer Authentication */}
        {path === '/auth' && (
          <div className="container" style={{ padding: '40px 0' }}>
            <BuyerAuth onSuccess={(isNewUser) => {
              if (isNewUser) {
                navigate('/account/profile');
                setTimeout(() => {
                  handleShowToast("Welcome! Please complete filling in your profile details.", "success");
                }, 600);
              } else {
                navigate('/account');
              }
            }} />
          </div>
        )}

        {/* VIEW I: About Page */}
        {path === '/about' && (
          <AboutPage />
        )}

        {/* VIEW J: Policy Page */}
        {(path === '/policy' || path === '/privacy-policy') && (
          <PolicyPage settings={settings} />
        )}

        {/* VIEW K: Terms Page */}
        {(path === '/terms' || path === '/terms-of-use' || path === '/terms-of-sale') && (
          <TermsPage settings={settings} />
        )}

        {/* VIEW: Dynamic CMS Custom Page */}
        {(path.startsWith('/page/') || path.startsWith('/p/')) && (
          <CmsCustomPageView path={path} />
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
      {!isDashboardRoute && derivedView !== 'auth' && derivedView !== 'checkout' && derivedView !== 'success' && (
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

      {/* Mobile Bottom Navigation Bar */}
      {!isDashboardRoute && (
        <nav className="mobile-bottom-nav" aria-label="Mobile bottom navigation">
          <button
            type="button"
            className={`mobile-bottom-nav-item ${derivedView === 'landing' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <Home size={22} />
            <span className="mobile-bottom-nav-label">Home</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${derivedView === 'store' || derivedView === 'product-details' ? 'active' : ''}`}
            onClick={() => navigate('/shop')}
          >
            <Store size={22} />
            <span className="mobile-bottom-nav-label">Shop</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${path === '/cart' || derivedView === 'checkout' ? 'active' : ''}`}
            onClick={() => navigate('/cart')}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={22} />
            {cart.reduce((acc, item) => acc + item.quantity, 0) > 0 && (
              <span className="mobile-bottom-nav-badge">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
            <span className="mobile-bottom-nav-label">Cart</span>
          </button>
          <button
            type="button"
            className={`mobile-bottom-nav-item ${derivedView === 'account' || derivedView === 'auth' ? 'active' : ''}`}
            onClick={() => navigate(currentUser ? '/account' : '/auth')}
          >
            <UserIcon size={22} />
            <span className="mobile-bottom-nav-label">Account</span>
          </button>
        </nav>
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

      {/* Product Quick View Lightbox Modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

    </div>
  );
}

export default App;
