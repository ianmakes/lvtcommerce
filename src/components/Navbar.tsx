import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ShoppingCart, ShoppingBag, Search, Heart } from 'lucide-react';
import { ShopSettings, CartItem } from '../types';
import { Link, navigate } from '../Router';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'landing' | 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account' | 'about' | 'policy' | 'terms' | 'auth';
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
    navigate('/');
  };

  return (
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
          {/* Left: Logo */}
          <Link to="/" className="logo" onClick={handleLogoClick} aria-label={`${settings.shopName} home`}>
            <ShoppingBag size={22} strokeWidth={2.5} />
            <span style={{ fontSize: '18px', fontWeight: 800 }}>{settings.shopName}</span>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="nav-center-links">
            <Link
              to="/"
              className={`nav-center-link ${currentView === 'landing' ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/shop"
              className={`nav-center-link ${currentView === 'store' || currentView === 'product-details' ? 'active' : ''}`}
            >
              Shop
            </Link>
            <Link
              to="/about"
              className={`nav-center-link ${currentView === 'about' ? 'active' : ''}`}
            >
              About
            </Link>
            {currentUser && !isAdminAuthenticated && (
              <Link
                to="/account"
                className={`nav-center-link ${currentView === 'account' ? 'active' : ''}`}
              >
                My Account
              </Link>
            )}
            {isAdminAuthenticated && (
              <Link
                to="/dashboard/home"
                className={`nav-center-link ${currentView === 'admin' ? 'active' : ''}`}
              >
                Admin Dashboard
              </Link>
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
                onClick={() => navigate('/account')}
                title="View Wishlist"
              >
                <Heart size={20} fill={wishlistCount > 0 ? "var(--color-sale)" : "none"} style={{ color: wishlistCount > 0 ? "var(--color-sale)" : "var(--color-ink)" }} />
              </button>
            )}

            {/* Cart Bag Icon Button */}
            <button
              type="button"
              className="btn-icon-circular"
              onClick={() => navigate('/cart')}
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
      </div>
    </header>
  );
};
