import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, User, Phone, MapPin, CreditCard } from 'lucide-react';
import { CartItem, ShopSettings, Order, OrderItem } from '../types';
import { PaystackPayment } from './PaystackPayment';
import { BuyerAuth } from './BuyerAuth';
import { getBuyerProfile } from '../db';

interface CheckoutProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentUser: FirebaseUser | null;
  onCancel: () => void;
  onSubmitOrder: (order: Order) => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  settings,
  cart,
  currentUser,
  onCancel,
  onSubmitOrder,
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Prefill buyer details from profile when logged in
  useEffect(() => {
    const fetchBuyerDetails = async () => {
      if (currentUser) {
        if (currentUser.displayName && !name) {
          setName(currentUser.displayName);
        }
        try {
          const userProfile = await getBuyerProfile(currentUser.uid);
          if (userProfile) {
            if (userProfile.phone && !phone) {
              setPhone(userProfile.phone);
            }
            if (userProfile.address && !address) {
              setAddress(userProfile.address);
            }
          }
        } catch (err) {
          console.error("Error fetching buyer profile:", err);
        }
      }
    };
    fetchBuyerDetails();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container checkout-container">
        <button 
          className="btn btn-secondary btn-small"
          onClick={onCancel}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', minHeight: '44px' }}
        >
          <ArrowLeft size={18} />
          <span>Go back to Shop</span>
        </button>
        <h1 className="text-center" style={{ marginBottom: '12px' }}>Checkout Registration</h1>
        <p className="text-center" style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Please sign in or create an account to proceed with your order.
        </p>
        <BuyerAuth onSuccess={() => {}} />
      </div>
    );
  }

  // Settle calculations
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const itemsSubtotal = cart.reduce((acc, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
    return acc + price * item.quantity;
  }, 0);

  // Delivery calculations: Free delivery if items > 30,000 NGN, else flat 1500 NGN
  const deliveryFee = itemsSubtotal >= 30000 ? 0 : 1500;
  const grandTotal = itemsSubtotal + deliveryFee;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please type in your name.");
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setErrorMsg("Please enter a valid phone number so we can reach you.");
      return;
    }
    if (address.trim().length < 10) {
      setErrorMsg("Please write down your complete delivery address.");
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handlePaymentSuccess = (reference: string) => {
    // Construct Order items list
    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      variantDetails: item.selectedVariant 
        ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ') 
        : 'Standard Option',
      price: item.selectedVariant ? item.selectedVariant.price : item.product.basePrice,
      quantity: item.quantity
    }));

    // Create unique order ID
    const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: orderId,
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      items: orderItems,
      totalAmount: grandTotal,
      paymentStatus: 'Paid',
      paymentReference: reference,
      orderStatus: 'Paid',
      createdAt: new Date().toISOString(),
      buyerEmail: currentUser?.email || undefined,
    };

    onSubmitOrder(newOrder);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep numbers and spaces/pluses only
    const value = e.target.value.replace(/[^\d+ ]/g, '');
    setPhone(value);
  };

  return (
    <div className="container checkout-container">
      {/* Back button */}
      <button 
        className="btn btn-secondary btn-small"
        onClick={step === 1 ? onCancel : () => setStep(1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', minHeight: '44px' }}
      >
        <ArrowLeft size={18} />
        <span>{step === 1 ? "Go back to Shop" : "Back to Information"}</span>
      </button>

      <h1 className="text-center" style={{ marginBottom: '12px' }}>Checkout Order</h1>
      <p className="text-center" style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        Please follow these simple steps to complete your purchase.
      </p>

      {/* Steps indicator */}
      <div className="checkout-steps">
        <div className={`checkout-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
        <div className={`checkout-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Step 1: Info Form */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="card">
            <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={28} style={{ color: 'var(--accent-primary)' }} />
              <span>1. Your Delivery Details</span>
            </h2>

            {errorMsg && (
              <div 
                style={{ 
                  color: 'var(--warning-color)', 
                  backgroundColor: 'var(--warning-light)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--warning-color)',
                  marginBottom: '20px',
                  fontWeight: 'bold'
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Customer Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="cust-name">
                Your Full Name:
              </label>
              <input
                id="cust-name"
                type="text"
                className="form-input"
                placeholder="e.g. Samuel Adebayo"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Customer Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="cust-phone">
                Phone Number (So we can call you):
              </label>
              <input
                id="cust-phone"
                type="tel"
                className="form-input"
                placeholder="e.g. 080 1234 5678"
                value={phone}
                onChange={handlePhoneChange}
                required
              />
            </div>

            {/* Customer Address */}
            <div className="form-group">
              <label className="form-label" htmlFor="cust-address">
                Full Delivery Address:
              </label>
              <textarea
                id="cust-address"
                className="form-input"
                placeholder="e.g. House 5, Graceful Lane, off Herbert Macaulay Way, Yaba, Lagos"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '12px' }}>
              Next: Review My Order
            </button>
          </form>
        )}

        {/* Step 2: Order Summary & Paystack */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Delivery address review */}
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <MapPin size={24} style={{ color: 'var(--accent-primary)' }} />
                <span>Deliver To:</span>
              </h3>
              <p style={{ fontWeight: 'bold', margin: 0 }}>{name}</p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 8px', color: 'var(--text-secondary)' }}>
                <Phone size={16} />
                <span>{phone}</span>
              </p>
              <p style={{ margin: 0 }}>{address}</p>
              <button 
                className="btn btn-secondary btn-small" 
                onClick={() => setStep(1)} 
                style={{ marginTop: '12px', minHeight: '36px' }}
              >
                Change Address
              </button>
            </div>

            {/* Cart Items Summary */}
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Order Summary ({totalItems} items)</h3>
              
              <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => {
                  const price = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
                  const variantDesc = item.selectedVariant 
                    ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : 'Standard';

                  return (
                    <div 
                      key={item.id} 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{item.product.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{variantDesc} x {item.quantity}</div>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>KSh {(price * item.quantity).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Order pricing summary */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Items Subtotal:</span>
                  <span>KSh {itemsSubtotal.toLocaleString()}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Delivery Fee:</span>
                  <span>{deliveryFee === 0 ? "FREE" : `KSh ${deliveryFee.toLocaleString()}`}</span>
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontWeight: 900, 
                    fontSize: '1.4rem', 
                    borderTop: '2px solid var(--border-color)', 
                    paddingTop: '12px', 
                    marginTop: '8px',
                    color: 'var(--accent-primary)'
                  }}
                >
                  <span>Grand Total:</span>
                  <span>KSh {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Portal integration */}
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CreditCard size={24} style={{ color: 'var(--accent-primary)' }} />
                <span>Choose Payment Method:</span>
              </h3>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
                We use Paystack to secure your transaction. You can pay with your ATM card, bank transfer, or USSD code.
              </p>

              <PaystackPayment
                settings={settings}
                amount={grandTotal}
                customerName={name}
                customerPhone={phone}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setStep(1)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
