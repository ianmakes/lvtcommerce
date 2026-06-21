import React, { useState } from 'react';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { CartItem, Product } from '../types';
import { Link, navigate } from '../Router';

interface CartPageProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  promoCode: string;
  onApplyPromo: (code: string) => void | Promise<void>;
  discountPercent: number;
  flatDiscount: number;
  orderNote: string;
  onUpdateOrderNote: (note: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning') => void;
  wishlist?: string[];
  products?: Product[];
  onAddToCart?: (item: CartItem) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  promoCode,
  onApplyPromo,
  discountPercent,
  flatDiscount,
  orderNote,
  onUpdateOrderNote,
  onShowToast,
  wishlist,
  products,
  onAddToCart,
}) => {
  const [couponInput, setCouponInput] = useState(promoCode);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const price = item.selectedVariant 
      ? item.selectedVariant.price 
      : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
          ? item.product.salePrice
          : item.product.basePrice);
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
    navigate('/checkout');
  };

  return (
    <div className="container" style={{ paddingTop: '48px', paddingBottom: '100px', color: 'var(--color-ink)' }}>
      <h1 className="font-heading-xl" style={{ textTransform: 'uppercase', marginBottom: '32px', borderBottom: '2px solid var(--color-ink)', paddingBottom: '16px' }}>
        Your Shopping Bag
      </h1>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px solid var(--color-hairline-soft)' }}>
          <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Your Bag is Empty</h2>
          <p className="font-body-md" style={{ color: 'var(--text-mute)', marginBottom: '32px', maxWidth: '450px', margin: '0 auto 32px' }}>
            Before you can check out, you must add some of our premium, recovery-engineered objects to your shopping bag.
          </p>
          <Link to="/shop" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-page-layout responsive-grid-main">
          
          {/* Left Column: Cart Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Free Shipping Indicator */}
            <div style={{ padding: '20px', backgroundColor: 'var(--color-soft-cloud)', border: '1px solid var(--color-hairline-soft)' }}>
              {totalPrice >= freeShippingLimit ? (
                <p style={{ color: 'var(--color-success)', fontWeight: 600, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <ShieldCheck size={18} />
                  <span>You've unlocked FREE Shipping!</span>
                </p>
              ) : (
                <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: '14px' }}>
                  Add <span style={{ color: 'var(--color-sale)' }}>KSh {amtNeeded.toLocaleString()}</span> more to unlock FREE Shipping!
                </p>
              )}
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-canvas)', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--color-success)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {cart.map(item => {
                const activePrice = item.selectedVariant 
                  ? item.selectedVariant.price 
                  : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
                      ? item.product.salePrice
                      : item.product.basePrice);
                const maxStock = item.selectedVariant ? item.selectedVariant.stock : 999;
                
                const variantDetails = item.selectedVariant
                  ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ')
                  : 'Standard Option';

                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      gap: '24px', 
                      paddingBottom: '24px', 
                      borderBottom: '1px solid var(--color-hairline-soft)' 
                    }}
                  >
                    <img 
                      src={item.product.image} 
                      alt={item.product.name} 
                      className="cart-page-item-img" style={{ objectFit: 'cover', border: '1px solid var(--color-hairline-soft)', backgroundColor: 'var(--color-soft-cloud)' }} 
                    />
                    
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h3 className="font-heading-md" style={{ margin: 0, fontSize: '18px', textTransform: 'uppercase' }}>{item.product.name}</h3>
                          <span style={{ fontWeight: 600, fontSize: '16px' }}>
                            KSh {(activePrice * item.quantity).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-mute)', fontSize: '13px', margin: '4px 0 12px' }}>{variantDetails}</p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                        
                        <button 
                          onClick={() => handleRemove(item.id, item.product.name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sale)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
                          title={`Remove ${item.product.name}`}
                          aria-label={`Remove ${item.product.name} from cart`}
                        >
                          <Trash2 size={16} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <aside className="card" style={{ border: '1px solid var(--color-hairline)', padding: '32px', position: 'sticky', top: '24px' }}>
            <h2 className="font-heading-lg" style={{ textTransform: 'uppercase', marginBottom: '24px', borderBottom: '1px solid var(--color-hairline)', paddingBottom: '12px' }}>
              Order Summary
            </h2>

            {/* Promo Code Coupon Input Box */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Promo Code"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                className="form-input"
                style={{ minHeight: '40px', height: '40px', padding: '6px 12px', fontSize: '13px', flexGrow: 1, borderRadius: 'var(--radius-none)' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ minHeight: '40px', height: '40px', padding: '0 20px', borderRadius: 'var(--radius-none)' }}>
                Apply
              </button>
            </form>

            {/* Order Note */}
            <div style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Order Notes (Optional)</label>
              <textarea
                value={orderNote}
                onChange={e => onUpdateOrderNote(e.target.value)}
                placeholder="Special instructions for shipping or delivery..."
                className="form-input"
                style={{ minHeight: '60px', padding: '10px 12px', fontSize: '13px', borderRadius: 'var(--radius-none)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }}
              />
            </div>

            {/* Totals Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ color: 'var(--text-mute)' }}>Subtotal ({totalItems} items):</span>
                <span>KSh {totalPrice.toLocaleString()}</span>
              </div>
              
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <span>Coupon Discount ({promoCode}):</span>
                  <span>-KSh {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ color: 'var(--text-mute)' }}>Shipping Estimate:</span>
                <span>{totalPrice >= freeShippingLimit ? "FREE" : "Calculated at checkout"}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '20px', margin: '12px 0 0', paddingTop: '16px', borderTop: '1px solid var(--color-hairline-soft)' }}>
                <span>Estimated Total:</span>
                <span style={{ color: 'var(--color-ink)' }}>KSh {finalPrice.toLocaleString()}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn-primary btn-full"
                onClick={handleCheckoutClick}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', minHeight: '48px' }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </button>
              
              <Link 
                to="/shop" 
                className="btn btn-secondary btn-full"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', minHeight: '48px', textDecoration: 'none' }}
              >
                Keep Shopping
              </Link>
            </div>
          </aside>

        </div>
      )}

      {/* Wishlist Section (Jumia Style) */}
      {wishlist && wishlist.length > 0 && products && (
        <div style={{ marginTop: '48px', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
            <h2 className="font-heading-lg" style={{ margin: 0, textTransform: 'uppercase', fontSize: '16px', letterSpacing: '0.5px' }}>
              Wishlist ({wishlist.length})
            </h2>
            <Link to="/account/wishlist" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-sale)', textDecoration: 'none' }}>
              SEE ALL
            </Link>
          </div>
          <div className="mobile-horizontal-scroll-list">
            {products
              .filter(p => wishlist.includes(p.id))
              .map(prod => (
                <div 
                  key={prod.id} 
                  className="explore-product-card" 
                  onClick={() => navigate(`/product/${prod.id}`)}
                  style={{ width: '150px', flexShrink: 0, cursor: 'pointer', border: '1px solid var(--color-hairline-soft)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff', position: 'relative' }}
                >
                  <div style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', backgroundColor: 'var(--color-soft-cloud)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-ink)' }}>
                      {prod.name}
                    </h4>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-ink)' }}>
                      KSh {prod.basePrice.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary btn-small btn-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onAddToCart) {
                          onAddToCart({
                            id: `${prod.id}-base`,
                            product: prod,
                            selectedVariant: null,
                            quantity: 1
                          });
                        }
                      }}
                      style={{ fontSize: '10px', height: '28px', minHeight: '28px', marginTop: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
