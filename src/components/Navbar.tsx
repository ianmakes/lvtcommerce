import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ShoppingCart, ShoppingBag, ShieldCheck, LogOut, User, Search, Heart } from 'lucide-react';
import { ShopSettings, CartItem } from '../types';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account';
  onNavigate: (view: 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account', initialTab?: string) => void;
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
    onNavigate('store');
  };

  return (
    <header className="header">
      <div className="container header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Logo */}
        <a href="#" className="logo" onClick={handleLogoClick} aria-label={`${settings.shopName} home`} style={{ flexShrink: 0 }}>
          <ShoppingBag size={32} strokeWidth={2.5} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ letterSpacing: '-0.5px' }}>{settings.shopName}</span>
        </a>

        {/* Search Bar (Centered, Amazon style) */}
        {(currentView === 'store' || currentView === 'product-details') && (
          <div className="nav-search-container" style={{ flexGrow: 1, maxWidth: '420px', margin: '0 24px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search GoldenCare (e.g. cane, organizer)..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="form-input nav-search-input"
              style={{ minHeight: '40px', padding: '8px 16px 8px 40px', fontSize: '0.9rem', borderRadius: '24px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => onSearchChange('')} 
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Action Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className={`btn btn-small ${currentView === 'store' || currentView === 'product-details' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('store')}
            style={{ fontWeight: 800 }}
          >
            Browse Store
          </button>
          
          {/* Wishlist Button (Heart badge) */}
          {currentUser && !isAdminAuthenticated && (
            <button
              className={`btn btn-small ${currentView === 'account' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onNavigate('account', 'wishlist')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
              title="View my Wishlist"
            >
              <Heart size={18} fill={wishlistCount > 0 ? "var(--warning-color)" : "none"} style={{ color: wishlistCount > 0 ? "var(--warning-color)" : "inherit" }} />
              <span>Wishlist ({wishlistCount})</span>
            </button>
          )}

          {/* Buyer Account Button */}
          {currentUser && !isAdminAuthenticated && (
            <button
              className={`btn btn-small ${currentView === 'account' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onNavigate('account', 'orders')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
            >
              <User size={18} />
              <span>My Account</span>
            </button>
          )}

          <button
            className={`btn btn-small ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
          >
            <ShieldCheck size={18} />
            <span>Admin</span>
          </button>

          {/* Sign Out Button for Buyer or Admin */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                {isAdminAuthenticated ? "Admin" : (currentUser.displayName || currentUser.email?.split('@')[0])}
              </span>
              <button
                className="btn btn-secondary btn-small"
                onClick={onSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--warning-color)', borderColor: 'var(--warning-color)', minHeight: '38px', padding: '6px 12px' }}
                title={isAdminAuthenticated ? "Sign Out as Admin" : "Sign Out"}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Cart Trigger */}
          <button
            className="btn btn-primary btn-small"
            onClick={onOpenCart}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              minWidth: '130px',
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-inverse)',
              border: '2px solid transparent'
            }}
          >
            <ShoppingCart size={18} />
            <span style={{ fontWeight: 900 }}>Cart ({totalItems})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
