import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, User, Phone, MapPin } from 'lucide-react';
import { CartItem, ShopSettings, Order, OrderItem } from '../types';
import { PaystackPayment } from './PaystackPayment';
import { BuyerAuth } from './BuyerAuth';
import { getBuyerProfile } from '../db';
import { navigate } from '../Router';


interface CheckoutProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentUser: FirebaseUser | null;
  onSubmitOrder: (order: Order) => void;
  discountPercent: number;
  flatDiscount: number;
  orderNote: string;
}

export const Checkout: React.FC<CheckoutProps> = ({
  settings,
  cart,
  currentUser,
  onSubmitOrder,
  discountPercent,
  flatDiscount,
  orderNote,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="container" style={{ maxWidth: '600px', padding: '40px 0' }}>
        <button 
          className="btn btn-secondary btn-small"
          onClick={() => navigate('/cart')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Shop</span>
        </button>
        <h1 className="font-heading-xl text-center" style={{ marginBottom: '12px' }}>Checkout Registration</h1>
        <p className="font-body-md text-center" style={{ color: 'var(--text-mute)', marginBottom: '32px' }}>
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

  let discountAmount = 0;
  if (discountPercent > 0) {
    discountAmount = (itemsSubtotal * discountPercent) / 100;
  } else if (flatDiscount > 0) {
    discountAmount = Math.min(flatDiscount, itemsSubtotal);
  }

  // Delivery calculations: Free delivery if items > 30,000 NGN, else flat 1500 NGN
  const deliveryFee = itemsSubtotal >= 30000 ? 0 : 1500;
  const grandTotal = Math.max(0, itemsSubtotal - discountAmount) + deliveryFee;

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
    console.log("Successful payment received! Paystack Reference ID:", reference);
    // Construct Order items list
    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      variantDetails: item.selectedVariant 
        ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ') 
        : 'Standard Option',
      price: item.selectedVariant ? item.selectedVariant.price : item.product.basePrice,
      quantity: item.quantity,
      variantId: item.selectedVariant?.id
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
    };

    if (currentUser?.email) {
      newOrder.buyerEmail = currentUser.email;
    }
    if (orderNote) {
      newOrder.notes = orderNote;
    }

    onSubmitOrder(newOrder);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep numbers and spaces/pluses only
    const value = e.target.value.replace(/[^\d+ ]/g, '');
    setPhone(value);
  };

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '30px 0' }}>
      {/* Back button */}
      <button 
        className="btn btn-secondary btn-small"
        onClick={step === 1 ? () => navigate('/cart') : () => setStep(1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} />
        <span>{step === 1 ? "Back to Shop" : "Back to Information"}</span>
      </button>

      <h1 className="font-heading-xl text-center" style={{ marginBottom: '12px' }}>Checkout Order</h1>
      <p className="font-body-md text-center" style={{ color: 'var(--text-mute)', marginBottom: '32px' }}>
        Please review your details and confirm payment to complete your purchase.
      </p>

      {/* Steps indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '32px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: step >= 1 ? 'var(--color-ink)' : 'var(--color-canvas)',
          color: step >= 1 ? 'var(--color-canvas)' : 'var(--color-ink)',
          border: '2px solid var(--color-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          1
        </div>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: step >= 2 ? 'var(--color-ink)' : 'var(--color-canvas)',
          color: step >= 2 ? 'var(--color-canvas)' : 'var(--color-ink)',
          border: '2px solid var(--color-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '14px'
        }}>
          2
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Step 1: Info Form */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="card" style={{ border: '1px solid var(--color-hairline)', padding: '24px' }}>
            <h2 className="font-heading-lg" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase' }}>
              <User size={24} />
              <span>1. Delivery Details</span>
            </h2>

            {errorMsg && (
              <div style={{ color: 'var(--color-sale)', backgroundColor: '#fff5f5', padding: '12px 16px', border: '1px solid var(--color-sale)', marginBottom: '20px', fontWeight: 500, fontSize: '14px' }}>
                {errorMsg}
              </div>
            )}

            {/* Customer Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="cust-name">
                Your Full Name
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
                Phone Number
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
                Full Delivery Address
              </label>
              <textarea
                id="cust-address"
                className="form-input"
                placeholder="e.g. House 5, Graceful Lane, off Herbert Macaulay Way, Yaba, Lagos"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '12px' }}>
              Next: Review Order
            </button>
          </form>
        )}

        {/* Step 2: Order Summary & Paystack */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Delivery address review */}
            <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '24px' }}>
              <h3 className="font-heading-md" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', textTransform: 'uppercase' }}>
                <MapPin size={20} />
                <span>Deliver To:</span>
              </h3>
              <p style={{ fontWeight: 600, fontSize: '15px' }}>{name}</p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 8px', color: 'var(--text-mute)', fontSize: '14px' }}>
                <Phone size={14} />
                <span>{phone}</span>
              </p>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>{address}</p>
              <button 
                className="btn btn-secondary btn-small" 
                onClick={() => setStep(1)} 
                style={{ marginTop: '16px', minHeight: '36px', height: '36px' }}
              >
                Change Address
              </button>
            </div>

            {/* Cart Items Summary */}
            <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '24px' }}>
              <h3 className="font-heading-md" style={{ marginBottom: '16px', textTransform: 'uppercase' }}>Order Summary ({totalItems} items)</h3>
              
              <div style={{ borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cart.map(item => {
                  const price = item.selectedVariant ? item.selectedVariant.price : item.product.basePrice;
                  const variantDesc = item.selectedVariant 
                    ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : 'Standard';

                  return (
                    <div 
                      key={item.id} 
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline-soft)' }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.product.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-mute)', marginTop: '2px' }}>{variantDesc} x {item.quantity}</div>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>KSh {(price * item.quantity).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Order pricing summary */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-mute)' }}>Items Subtotal:</span>
                  <span>KSh {itemsSubtotal.toLocaleString()}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
                    <span>Coupon Discount:</span>
                    <span>-KSh {discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-mute)' }}>Delivery Fee:</span>
                  <span>{deliveryFee === 0 ? "FREE" : `KSh ${deliveryFee.toLocaleString()}`}</span>
                </div>

                {orderNote && (
                  <div style={{ borderTop: '1px dashed var(--color-hairline-soft)', paddingTop: '8px', marginTop: '4px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-mute)' }}>Order Delivery Notes:</span>
                    <span style={{ fontStyle: 'italic', color: 'var(--text-ink)' }}>"{orderNote}"</span>
                  </div>
                )}

                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontWeight: 600, 
                    fontSize: '18px', 
                    borderTop: '1px solid var(--color-hairline-soft)', 
                    paddingTop: '12px', 
                    marginTop: '8px',
                    color: 'var(--color-ink)'
                  }}
                >
                  <span>Grand Total:</span>
                  <span>KSh {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Portal integration */}
            <div style={{ marginTop: '8px' }}>
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
