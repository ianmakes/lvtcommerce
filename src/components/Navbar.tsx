import React from 'react';
import { ShoppingCart, ShoppingBag, ShieldCheck, LogOut } from 'lucide-react';
import { ShopSettings, CartItem } from '../types';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'store' | 'admin' | 'checkout' | 'success' | 'product-details';
  onNavigate: (view: 'store' | 'admin' | 'checkout' | 'success' | 'product-details') => void;
  onOpenCart: () => void;
  isAdminAuthenticated: boolean;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  cart,
  currentView,
  onNavigate,
  onOpenCart,
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
            className={`btn btn-secondary btn-small ${currentView === 'store' || currentView === 'product-details' ? 'btn-primary' : ''}`}
            onClick={() => onNavigate('store')}
            style={{ fontWeight: 800 }}
          >
            Browse Store
          </button>
          
          <button
            className={`btn btn-secondary btn-small ${currentView === 'admin' ? 'btn-primary' : ''}`}
            onClick={() => onNavigate('admin')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
          >
            <ShieldCheck size={20} />
            <span>Shop Manager (Admin)</span>
          </button>

          {/* Admin Sign Out Button */}
          {isAdminAuthenticated && (
            <button
              className="btn btn-secondary btn-small"
              onClick={onSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--warning-color)', borderColor: 'var(--warning-color)' }}
              title="Sign Out as Admin"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
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
