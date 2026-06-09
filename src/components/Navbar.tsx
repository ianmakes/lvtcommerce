import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ShoppingCart, ShoppingBag, ShieldCheck, LogOut, User } from 'lucide-react';
import { ShopSettings, CartItem } from '../types';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account';
  onNavigate: (view: 'store' | 'admin' | 'checkout' | 'success' | 'product-details' | 'account') => void;
  onOpenCart: () => void;
  currentUser: FirebaseUser | null;
  isAdminAuthenticated: boolean;
  onSignOut: () => void;
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
}) => {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('store');
  };

  return (
    <header className="header">
      <div className="container header-container">
        {/* Logo */}
        <a href="#" className="logo" onClick={handleLogoClick} aria-label={`${settings.shopName} home`}>
          <ShoppingBag size={36} strokeWidth={2.5} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ letterSpacing: '-0.5px' }}>{settings.shopName}</span>
        </a>

        {/* Action Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-small ${currentView === 'store' || currentView === 'product-details' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('store')}
            style={{ fontWeight: 800 }}
          >
            Browse Store
          </button>
          
          {/* Buyer Account Button */}
          {currentUser && !isAdminAuthenticated && (
            <button
              className={`btn btn-small ${currentView === 'account' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onNavigate('account')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
            >
              <User size={20} />
              <span>My Account</span>
            </button>
          )}

          <button
            className={`btn btn-small ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
          >
            <ShieldCheck size={20} />
            <span>Shop Manager (Admin)</span>
          </button>

          {/* Sign Out Button for Buyer or Admin */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                {isAdminAuthenticated ? "Admin" : (currentUser.displayName || currentUser.email)}
              </span>
              <button
                className="btn btn-secondary btn-small"
                onClick={onSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--warning-color)', borderColor: 'var(--warning-color)', minHeight: '38px', padding: '6px 12px' }}
                title={isAdminAuthenticated ? "Sign Out as Admin" : "Sign Out"}
              >
                <LogOut size={16} />
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
              minWidth: '160px',
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-inverse)',
              border: '2px solid transparent'
            }}
          >
            <ShoppingCart size={22} />
            <span style={{ fontWeight: 900 }}>Cart ({totalItems})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
