import React from 'react';
import { X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { CartItem, ShopSettings } from '../types';

interface CartProps {
  settings: ShopSettings;
  isOpen: boolean;
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const Cart: React.FC<CartProps> = ({
  settings,
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
    return acc + price * item.quantity;
  }, 0);

  const handleUpdateQty = (id: string, name: string, current: number, change: number, maxStock: number) => {
    const target = current + change;
    if (target < 1) return;
    if (target > maxStock) {
      alert(`Sorry, we only have ${maxStock} items in stock.`);
      return;
    }
    onUpdateQuantity(id, target);
  };

  const handleRemove = (id: string, name: string) => {
    onRemoveItem(id);
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      alert("Your cart is empty. Please add items to checkout.");
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
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>Shopping Cart</span>
            <span style={{ fontSize: '1.1rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '12px' }}>
              {totalItems} items
            </span>
          </h2>
          <button className="modal-close" style={{ position: 'static' }} onClick={onClose} aria-label="Close cart">
            <X size={24} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Your Cart is Empty</p>
              <p>Add some health or mobility aids to get started.</p>
              <button className="btn btn-secondary mt-24" onClick={onClose}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => {
              const activePrice = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
              const maxStock = item.selectedVariant ? item.selectedVariant.stock : 999;
              
              // Prepare variant details description
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
                      
                      {/* Delete item button */}
                      <button 
                        onClick={() => handleRemove(item.id, item.product.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--warning-color)',
                          padding: '4px'
                        }}
                        title={`Remove ${item.product.name}`}
                        aria-label={`Remove ${item.product.name} from cart`}
                      >
                        <Trash2 size={22} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      {/* Quantity Incrementor */}
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn" 
                          onClick={() => handleUpdateQty(item.id, item.product.name, item.quantity, -1, maxStock)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="qty-num">{item.quantity}</span>
                        <button 
                          className="qty-btn" 
                          onClick={() => handleUpdateQty(item.id, item.product.name, item.quantity, 1, maxStock)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* Line price */}
                      <span style={{ fontWeight: 900, color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
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
            <div className="cart-total-row">
              <span>Total Price:</span>
              <span style={{ color: 'var(--accent-primary)' }}>KSh {totalPrice.toLocaleString()}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn-primary btn-full"
                onClick={handleCheckoutClick}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={24} />
              </button>
              
              <button 
                className="btn btn-secondary btn-full" 
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
