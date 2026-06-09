import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ShoppingCart, ShoppingBag, Search, Heart } from 'lucide-react';
import { ShopSettings, CartItem } from '../types';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'landing' | 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account';
  onNavigate: (view: 'landing' | 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account', initialTab?: string) => void;
  onOpenCart: () => void;
  currentUser: FirebaseUser | null;
  isAdminAuthenticated: boolean;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  wishlistCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  cart,
  currentView,
  onNavigate,
  onOpenCart,
  currentUser,
  isAdminAuthenticated,
  onSignOut,
  searchQuery,
  onSearchChange,
  wishlistCount,
}) => {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSearchChange('');
    onNavigate('landing');
  };

  return (
    <header style={{ width: '100%' }}>
      {/* 1. Nike Utility Bar */}
      <div className="utility-bar">
        <span style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
          FREE SHIPPING ON ORDERS OVER KSh 30,000
        </span>
        <div className="utility-bar-links">
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('store'); }}>Shop</a>
          <span className="divider">|</span>
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Contact GoldenCare: +254 700 000 000 | support@goldencare.com"); }}>Help</a>
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
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('account'); }}>Sign In</a>
          )}
        </div>
      </div>

      {/* 2. Nike Primary Nav */}
      <div className="primary-nav">
        {/* Left: Logo */}
        <a href="#" className="logo" onClick={handleLogoClick} aria-label={`${settings.shopName} home`}>
          <ShoppingBag size={22} strokeWidth={2.5} />
          <span style={{ fontSize: '18px', fontWeight: 800 }}>{settings.shopName}</span>
        </a>

        {/* Center: Navigation Links */}
        <nav className="nav-center-links">
          <a
            href="#"
            className={`nav-center-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}
          >
            Home
          </a>
          <a
            href="#"
            className={`nav-center-link ${currentView === 'store' || currentView === 'product-details' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onNavigate('store'); }}
          >
            Shop
          </a>
          {currentUser && !isAdminAuthenticated && (
            <a
              href="#"
              className={`nav-center-link ${currentView === 'account' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('account'); }}
            >
              My Account
            </a>
          )}
          {isAdminAuthenticated && (
            <a
              href="#"
              className={`nav-center-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onNavigate('admin'); }}
            >
              Admin Dashboard
            </a>
          )}
        </nav>

        {/* Right side: Search, Wishlist, Cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Pill */}
          {(currentView === 'store' || currentView === 'product-details') && (
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
            </div>
          )}

          {/* Wishlist Button (Circular Icon Button) */}
          {currentUser && !isAdminAuthenticated && (
            <button
              type="button"
              className="btn-icon-circular"
              onClick={() => onNavigate('account', 'wishlist')}
              title={`View Wishlist (${wishlistCount})`}
            >
              <Heart size={20} fill={wishlistCount > 0 ? "var(--color-sale)" : "none"} style={{ color: wishlistCount > 0 ? "var(--color-sale)" : "var(--color-ink)" }} />
            </button>
          )}

          {/* Cart Bag Icon Button */}
          <button
            type="button"
            className="btn-icon-circular"
            onClick={onOpenCart}
            title={`View Cart (${totalItems})`}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: 'var(--color-ink)',
                color: 'var(--color-canvas)',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
