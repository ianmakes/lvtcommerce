import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ShoppingCart, ShoppingBag, Search, Heart, Menu, X, Home, Store, Info, User, LogOut, Shield, LayoutDashboard } from 'lucide-react';
import { ShopSettings, CartItem, Product, Category } from '../types';
import { Link, navigate } from '../Router';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'landing' | 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account' | 'about' | 'policy' | 'terms' | 'auth' | 'custom-page';
  currentUser: FirebaseUser | null;
  isAdminAuthenticated: boolean;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  wishlistCount: number;
  currentUserAvatarUrl?: string | null;
  products?: Product[];
  categories?: Category[];
  onSelectCategory?: (categoryName: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  cart,
  currentView,
  currentUser,
  isAdminAuthenticated,
  onSignOut,
  searchQuery,
  onSearchChange,
  wishlistCount,
  currentUserAvatarUrl,
  products = [],
  categories = [],
  onSelectCategory,
}) => {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Suggestions filtering
  const getSuggestions = () => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matchedCats = categories.filter(c => c.name.toLowerCase().includes(q));
    const matchedProds = products.filter(p => p.name.toLowerCase().includes(q));
    
    return [
      ...matchedCats.map(c => ({ type: 'category' as const, id: c.id, name: c.name })),
      ...matchedProds.map(p => ({ type: 'product' as const, id: p.id, name: p.name, image: p.image || p.images?.[0] }))
    ].slice(0, 10);
  };
  
  const suggestions = getSuggestions();

  const getAccountLabel = () => {
    if (currentUser?.displayName) {
      const firstName = currentUser.displayName.trim().split(' ')[0];
      return `${firstName}'s Account`;
    }
    return "My Account";
  };

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentView]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/';
  };

  const handleDrawerNav = (to: string) => {
    setDrawerOpen(false);
    onSearchChange('');
    navigate(to);
  };

  return (
    <>
      <header style={{ width: '100%' }}>
        {/* 1. Nike Utility Bar */}
        <div className="utility-bar">
          <div className="nav-inner-container">
            <span style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
              FREE SHIPPING ON ORDERS OVER KSh 30,000
            </span>
            <div className="utility-bar-links">
              <Link to="/shop">Shop</Link>
              <span className="divider">|</span>
              <Link to="/about">About</Link>
              <span className="divider">|</span>
              {currentUser ? (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-ink)' }}>
                    Hi, {isAdminAuthenticated ? "Admin" : (currentUser.displayName || currentUser.email?.split('@')[0])}
                  </span>
                  <span className="divider">|</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); onSignOut(); }} style={{ color: 'var(--color-sale)' }}>Sign Out</a>
                </>
              ) : (
                <Link to="/auth">Sign In</Link>
              )}
            </div>
          </div>
        </div>

        {/* 2. Nike Primary Nav */}
        <div className="primary-nav">
          <div className="nav-inner-container">
            {/* Mobile: Hamburger button */}
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={24} />
            </button>

            {/* Left: Logo */}
            <Link to="/" className="logo" onClick={handleLogoClick} aria-label={`${settings.shopName} home`}>
              <ShoppingBag size={22} strokeWidth={2.5} />
              <span style={{ fontSize: '18px', fontWeight: 800 }}>{settings.shopName}</span>
            </Link>

            {/* Center: Navigation Links */}
            <nav className="nav-center-links">
            </nav>

            {/* Right side: Search, Wishlist, Cart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search Pill */}
              {(currentView === 'store' || currentView === 'product-details' || currentView === 'landing') && (
                <div className="search-pill-container">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => onSearchChange(e.target.value)}
                    className="search-pill"
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', pointerEvents: 'none' }} />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mute)', padding: 0 }}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                  {suggestions.length > 0 && (
                    <div className="search-suggestions-dropdown">
                      {suggestions.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="search-suggestion-item"
                          onClick={() => {
                            if (item.type === 'category') {
                              if (onSelectCategory) onSelectCategory(item.name);
                            } else {
                              navigate(`/product/${item.id}`);
                            }
                            onSearchChange('');
                          }}
                        >
                          {item.type === 'product' && item.image && (
                            <img src={item.image} alt={item.name} className="suggestion-thumb" />
                          )}
                          <div className="suggestion-details">
                            <span className="suggestion-name">{item.name}</span>
                            <span className="suggestion-badge">{item.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Expandable Navigation Icons */}
              <Link to="/" className="expandable-nav-item" title="Home">
                <Home size={20} />
                <span className="expandable-nav-label">Home</span>
              </Link>

              <Link to="/shop" className="expandable-nav-item" title="Shop">
                <Store size={20} />
                <span className="expandable-nav-label">Shop</span>
              </Link>

              {currentUser ? (
                isAdminAuthenticated ? (
                  <>
                    <Link to="/dashboard/home" className="expandable-nav-item" title="Admin Panel">
                      <Shield size={20} />
                      <span className="expandable-nav-label">Admin Panel</span>
                    </Link>
                    <Link to="/account" className="expandable-nav-item" title="My Account">
                      {currentUserAvatarUrl ? (
                        <img src={currentUserAvatarUrl} alt="Avatar" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <User size={20} />
                      )}
                      <span className="expandable-nav-label">{getAccountLabel()}</span>
                    </Link>
                  </>
                ) : (
                  <Link to="/account" className="expandable-nav-item" title="My Account">
                    {currentUserAvatarUrl ? (
                      <img src={currentUserAvatarUrl} alt="Avatar" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <User size={20} />
                    )}
                    <span className="expandable-nav-label">{getAccountLabel()}</span>
                  </Link>
                )
              ) : (
                <Link to="/auth" className="expandable-nav-item" title="Sign In">
                  <User size={20} />
                  <span className="expandable-nav-label">Sign In</span>
                </Link>
              )}

              {/* Wishlist Button (Expandable Nav Item) */}
              {currentUser && (
                <Link
                  to="/account?tab=wishlist"
                  className="expandable-nav-item"
                  title="Wishlist"
                >
                  <Heart size={20} fill={wishlistCount > 0 ? "var(--color-sale)" : "none"} style={{ color: wishlistCount > 0 ? "var(--color-sale)" : "var(--color-ink)" }} />
                  <span className="expandable-nav-label">Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
                </Link>
              )}

              {/* Cart Bag Icon Button (Expandable Nav Item) */}
              <Link
                to="/cart"
                className="expandable-nav-item"
                title={`View Cart (${totalItems})`}
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShoppingCart size={20} />
                  {totalItems > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: 'var(--color-ink)',
                      color: 'var(--color-canvas)',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--color-canvas)'
                    }}>
                      {totalItems}
                    </span>
                  )}
                </div>
                <span className="expandable-nav-label">Cart</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={`mobile-drawer-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <nav className={`mobile-drawer ${drawerOpen ? 'open' : ''}`} aria-label="Mobile navigation">
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} strokeWidth={2.5} />
            <span style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.3px' }}>{settings.shopName}</span>
          </div>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search inside drawer (when on shop/product pages) */}
        {(currentView === 'store' || currentView === 'product-details') && (
          <div className="mobile-drawer-search">
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="mobile-drawer-search-input"
              />
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="mobile-drawer-nav">
          <button
            type="button"
            className={`mobile-drawer-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => handleDrawerNav('/')}
          >
            <Home size={18} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`mobile-drawer-link ${currentView === 'store' || currentView === 'product-details' ? 'active' : ''}`}
            onClick={() => handleDrawerNav('/shop')}
          >
            <Store size={18} />
            <span>Shop</span>
          </button>
          <button
            type="button"
            className={`mobile-drawer-link ${currentView === 'about' ? 'active' : ''}`}
            onClick={() => handleDrawerNav('/about')}
          >
            <Info size={18} />
            <span>About</span>
          </button>

          <div className="mobile-drawer-divider" />

          {currentUser && !isAdminAuthenticated && (
            <button
              type="button"
              className={`mobile-drawer-link ${currentView === 'account' ? 'active' : ''}`}
              onClick={() => handleDrawerNav('/account')}
            >
              <User size={18} />
              <span>{getAccountLabel()}</span>
            </button>
          )}

          {currentUser && !isAdminAuthenticated && (
            <button
              type="button"
              className="mobile-drawer-link"
              onClick={() => handleDrawerNav('/account?tab=wishlist')}
            >
              <Heart size={18} />
              <span>Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
            </button>
          )}

          {isAdminAuthenticated && (
            <button
              type="button"
              className={`mobile-drawer-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => handleDrawerNav('/dashboard/home')}
            >
              <Shield size={18} />
              <span>Admin Dashboard</span>
            </button>
          )}

          {!currentUser && (
            <button
              type="button"
              className={`mobile-drawer-link ${currentView === 'auth' ? 'active' : ''}`}
              onClick={() => handleDrawerNav('/auth')}
            >
              <User size={18} />
              <span>Sign In / Join</span>
            </button>
          )}

          {currentUser && (
            <>
              <div className="mobile-drawer-divider" />
              <button
                type="button"
                className="mobile-drawer-link"
                onClick={() => { setDrawerOpen(false); onSignOut(); }}
                style={{ color: 'var(--color-sale)' }}
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="mobile-drawer-footer">
          {currentUser && (
            <p className="mobile-drawer-footer-text" style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--text-ink)' }}>
              {isAdminAuthenticated ? "Admin" : (currentUser.displayName || currentUser.email?.split('@')[0])}
            </p>
          )}
          <p className="mobile-drawer-footer-text">
            Free shipping on orders over KSh 30,000
          </p>
        </div>
      </nav>
      <style>{`
        .search-pill-container {
          position: relative;
        }
        .search-suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid var(--color-hairline-soft);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          z-index: 10000;
          margin-top: 8px;
          max-height: 400px;
          overflow-y: auto;
        }
        .search-suggestion-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--color-hairline-soft);
          transition: background 0.2s ease;
          text-align: left;
        }
        .search-suggestion-item:last-child {
          border-bottom: none;
        }
        .search-suggestion-item:hover {
          background: var(--color-soft-cloud);
        }
        .suggestion-thumb {
          width: 32px;
          height: 32px;
          object-fit: cover;
          border-radius: 4px;
          background: #f5f5f5;
        }
        .suggestion-details {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .suggestion-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-ink);
        }
        .suggestion-badge {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-mute);
          margin-top: 2px;
        }
      `}</style>
    </>
  );
};
