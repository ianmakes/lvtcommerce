import React from 'react';
import { ShoppingCart, ShoppingBag, ShieldCheck } from 'lucide-react';
import { ShopSettings, CartItem } from '../types';
import { speakText } from './VoiceHelper';

interface NavbarProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentView: 'store' | 'admin' | 'checkout' | 'success';
  onNavigate: (view: 'store' | 'admin' | 'checkout' | 'success') => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  cart,
  currentView,
  onNavigate,
  onOpenCart,
}) => {
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
    return acc + price * item.quantity;
  }, 0);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('store');
    if (settings.voiceAssistDefault) {
      speakText(`Welcome back to the store main page of ${settings.shopName}.`);
    }
  };

  const handleNavigateStore = () => {
    onNavigate('store');
    if (settings.voiceAssistDefault) {
      speakText("Navigating to browse products.");
    }
  };

  const handleNavigateAdmin = () => {
    onNavigate('admin');
    if (settings.voiceAssistDefault) {
      speakText("Navigating to shop management dashboard.");
    }
  };

  const handleCartClick = () => {
    onOpenCart();
    if (settings.voiceAssistDefault) {
      if (totalItems === 0) {
        speakText("Your shopping cart is empty.");
      } else {
        speakText(`Opened shopping cart. You have ${totalItems} items. Total value is ${totalPrice.toLocaleString()} Naira.`);
      }
    }
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
            className={`btn btn-secondary btn-small ${currentView === 'store' ? 'btn-primary' : ''}`}
            onClick={handleNavigateStore}
            style={{ fontWeight: 800 }}
          >
            Browse Store
          </button>
          
          <button
            className={`btn btn-secondary btn-small ${currentView === 'admin' ? 'btn-primary' : ''}`}
            onClick={handleNavigateAdmin}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}
          >
            <ShieldCheck size={20} />
            <span>Shop Manager (Admin)</span>
          </button>

          {/* Cart Trigger */}
          <button
            className="btn btn-primary btn-small"
            onClick={handleCartClick}
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
