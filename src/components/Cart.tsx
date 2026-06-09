import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { CartItem, ShopSettings } from '../types';

interface CartProps {
  settings: ShopSettings;
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  promoCode: string;
  onApplyPromo: (code: string) => void;
  discountPercent: number;
  flatDiscount: number;
  orderNote: string;
  onUpdateOrderNote: (note: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning') => void;
}

export const Cart: React.FC<CartProps> = ({
  settings,
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  promoCode,
  onApplyPromo,
  discountPercent,
  flatDiscount,
  orderNote,
  onUpdateOrderNote,
  onShowToast,
}) => {
  const [couponInput, setCouponInput] = useState(promoCode);

  if (!isOpen) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
    return acc + price * item.quantity;
  }, 0);

  // Free shipping progress variables
  const freeShippingLimit = 30000;
  const progressPercent = Math.min((totalPrice / freeShippingLimit) * 100, 100);
  const amtNeeded = freeShippingLimit - totalPrice;

  // Final totals
  let discountAmount = 0;
  if (discountPercent > 0) {
    discountAmount = (totalPrice * discountPercent) / 100;
  } else if (flatDiscount > 0) {
    discountAmount = Math.min(flatDiscount, totalPrice);
  }
  const finalPrice = Math.max(0, totalPrice - discountAmount);

  const handleUpdateQty = (id: string, name: string, current: number, change: number, maxStock: number) => {
    const target = current + change;
    if (target < 1) return;
    if (target > maxStock) {
      onShowToast(`Sorry, we only have ${maxStock} items of ${name} in stock.`, 'warning');
      return;
    }
    onUpdateQuantity(id, target);
  };

  const handleRemove = (id: string, name: string) => {
    onRemoveItem(id);
    onShowToast(`Removed ${name} from your cart.`, 'success');
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyPromo(couponInput.trim().toUpperCase());
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      onShowToast("Your cart is empty. Please add items to checkout.", 'warning');
      return;
    }
    onCheckout();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }} onClick={onClose}>
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        {/* Cart Header */}
        <div className="cart-header">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: 600 }}>
            <span>Shopping Cart</span>
            <span style={{ fontSize: '13px', backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', padding: '4px 10px', borderRadius: 'var(--radius-lg)' }}>
              {totalItems} items
            </span>
          </h2>
          <button className="modal-close" style={{ position: 'static' }} onClick={onClose} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Demo Mode Notice */}
        {settings.demoMode && (
          <div style={{ padding: '8px 24px', backgroundColor: 'var(--color-soft-cloud)', borderBottom: '1px solid var(--color-hairline-soft)', fontSize: '11px', color: 'var(--color-sale)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Demo Mode Active (Payments are simulated)
          </div>
        )}

        {/* Free Shipping Indicator */}
        {cart.length > 0 && (
          <div style={{ padding: '16px 24px', backgroundColor: 'var(--color-canvas)', borderBottom: '1px solid var(--color-hairline-soft)', fontSize: '13px' }}>
            {totalPrice >= freeShippingLimit ? (
              <p style={{ color: 'var(--color-success)', fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} />
                <span>You've unlocked FREE Shipping!</span>
              </p>
            ) : (
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                Add <span style={{ color: 'var(--color-sale)' }}>KSh {amtNeeded.toLocaleString()}</span> more to unlock FREE Shipping!
              </p>
            )}
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-soft-cloud)', borderRadius: 'var(--radius-none)', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', padding: '0 24px' }}>
              <p className="font-heading-lg" style={{ marginBottom: '8px' }}>Your Bag is Empty.</p>
              <p style={{ fontSize: '14px', color: 'var(--text-mute)', marginBottom: '24px' }}>Once you add products to your cart, they will appear here.</p>
              <button className="btn btn-secondary btn-full" onClick={onClose}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => {
              const activePrice = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
              const maxStock = item.selectedVariant ? item.selectedVariant.stock : 999;
              
              const variantDetails = item.selectedVariant
                ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ')
                : 'Standard Option';

              return (
                <div className="cart-item" key={item.id}>
                  <img src={item.product.image} alt={item.product.name} className="cart-item-img" />
                  
                  <div className="cart-item-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 className="cart-item-title">{item.product.name}</h4>
                        <p className="cart-item-variant">{variantDetails}</p>
                      </div>
                      
                      <button 
                        onClick={() => handleRemove(item.id, item.product.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sale)', padding: '4px' }}
                        title={`Remove ${item.product.name}`}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn" 
                          onClick={() => handleUpdateQty(item.id, item.product.name, item.quantity, -1, maxStock)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="qty-num">{item.quantity}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => handleUpdateQty(item.id, item.product.name, item.quantity, 1, maxStock)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <span style={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '15px' }}>
                        KSh {(activePrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="cart-footer">
            
            {/* Promo Code Coupon Input Box */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Promo Code"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                className="form-input"
                style={{ minHeight: '36px', height: '36px', padding: '6px 12px', fontSize: '13px', flexGrow: 1, borderRadius: 'var(--radius-none)' }}
              />
              <button type="submit" className="btn btn-secondary btn-small" style={{ minHeight: '36px', height: '36px', padding: '0 16px', borderRadius: 'var(--radius-lg)' }}>
                Apply
              </button>
            </form>

            {/* Order Note */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Order Notes (Optional)</label>
              <textarea
                value={orderNote}
                onChange={e => onUpdateOrderNote(e.target.value)}
                placeholder="Special instructions for delivery..."
                className="form-input"
                style={{ minHeight: '52px', padding: '8px 12px', fontSize: '13px', borderRadius: 'var(--radius-none)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
              />
            </div>

            {/* Totals Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-mute)' }}>Subtotal:</span>
                <span>KSh {totalPrice.toLocaleString()}</span>
              </div>
              
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <span>Coupon Discount:</span>
                  <span>-KSh {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '18px', margin: '8px 0 0', paddingTop: '8px', borderTop: '1px solid var(--color-hairline-soft)' }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--color-ink)' }}>KSh {finalPrice.toLocaleString()}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="btn btn-primary btn-full"
                onClick={handleCheckoutClick}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </button>
              
              <button 
                className="btn btn-secondary btn-full btn-small" 
                onClick={onClose}
              >
                Keep Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
