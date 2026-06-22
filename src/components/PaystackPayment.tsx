import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { ShopSettings, showToast } from '../types';

interface PaystackTransactionOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  brandColor?: string;
  logo?: string;
  metadata?: {
    custom_fields: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  onSuccess: (transaction: { reference: string }) => void;
  onCancel: () => void;
}

interface PaystackPopInstance {
  newTransaction: (options: PaystackTransactionOptions) => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      new (): PaystackPopInstance;
    };
  }
}

interface PaystackPaymentProps {
  settings: ShopSettings;
  amount: number; // In Kenyan Shillings (KES)
  customerName: string;
  customerPhone: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  orderNote?: string;
}

export const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  settings,
  amount,
  customerName,
  customerPhone,
  onSuccess,
  onCancel,
  orderNote,
}) => {
  const isDemo = settings.demoMode || !settings.paystackPublicKey;
  const [payChannel, setPayChannel] = useState<'card' | 'mobile_money'>('mobile_money');
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [cartId] = useState(() => `cart-${Math.floor(10000 + Math.random() * 90000)}`);

  // Keep callbacks in refs to avoid re-triggering useEffect when parent passes inline functions
  const callbacksRef = React.useRef({ onSuccess, onCancel });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onCancel };
  }, [onSuccess, onCancel]);

  // Input states for Demo Mode
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState(customerPhone);
  
  // Demo processing states
  const [demoState, setDemoState] = useState<'input' | 'processing' | 'otp' | 'verifying' | 'success'>('input');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  // Clean form values
  const totalCents = amount * 100; // Paystack KES uses cents

  const handleStartPayment = () => {
    setRefCode(`GC-REF-${Math.floor(100000000 + Math.random() * 900000000)}`);
    setDemoState('input');
    setOtpValue('');
    setOtpError('');
    setPaymentInitiated(true);
  };

  // Load Real Paystack Inline SDK if not in Demo mode and payment has been initiated
  useEffect(() => {
    if (isDemo) return;
    if (!paymentInitiated || !refCode) return;

    // Load Paystack script dynamically
    const scriptId = 'paystack-inline-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initializePaystack = () => {
      if (window.PaystackPop) {
        const paystack = new window.PaystackPop();
        paystack.newTransaction({
          key: settings.paystackPublicKey,
          email: `${customerPhone.replace(/[^\d]/g, '') || 'customer'}@${(settings.shopName || 'goldencare').replace(/[^a-z0-9]/gi, '').toLowerCase()}.com`, // Paystack requires email format
          amount: totalCents,
          currency: 'KES', // Kenya Shillings
          ref: refCode,
          brandColor: '#111111', // Match theme brand color
          logo: 'https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png', // Business logo URL
          metadata: {
            custom_fields: [
              {
                display_name: "Customer Name",
                variable_name: "customer_name",
                value: customerName
              },
              {
                display_name: "Customer Phone",
                variable_name: "customer_phone",
                value: customerPhone
              },
              {
                display_name: "Cart ID",
                variable_name: "cart_id",
                value: cartId
              },
              {
                display_name: "Customer Note",
                variable_name: "customer_note",
                value: orderNote || 'N/A'
              }
            ]
          },
          onSuccess: function (transaction: { reference: string }) {
            console.log("Paystack Payment Successful! Transaction reference code:", transaction.reference);
            callbacksRef.current.onSuccess(transaction.reference);
          },
          onCancel: function () {
            setPaymentInitiated(false);
            callbacksRef.current.onCancel();
          }
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.async = true;
      script.onload = initializePaystack;
      document.body.appendChild(script);
    } else {
      script.onload = initializePaystack;
      initializePaystack();
    }

    return () => {
      // Keep script loaded
    };
  }, [isDemo, paymentInitiated, settings.paystackPublicKey, customerPhone, totalCents, refCode, customerName, cartId, orderNote]);

  // Handle Demo Mode card formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    let formatted = value;
    if (value.length > 2) {
      formatted = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setCardExpiry(formatted.substring(0, 5));
  };

  // Demo Card Pay submission
  const handleDemoCardPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
      showToast("Please fill in valid card details. You can copy the test card on screen.", "warning");
      return;
    }
    
    setDemoState('processing');

    setTimeout(() => {
      setDemoState('otp');
    }, 2000);
  };

  // Demo M-Pesa Pay submission
  const handleDemoMpesaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mpesaNumber.replace(/\D/g, '').length < 8) {
      showToast("Please enter a valid phone number to send the M-Pesa STK Push.", "warning");
      return;
    }

    setDemoState('processing');

    // Simulate sending STK Push
    setTimeout(() => {
      setDemoState('otp');
    }, 2000);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue === '1234') {
      setDemoState('verifying');
      
      setTimeout(() => {
        setDemoState('success');
        console.log("Simulated Paystack checkout successful! Reference code:", refCode);
        setTimeout(() => {
          onSuccess(refCode);
        }, 1500);
      }, 2000);
    } else {
      setOtpError(
        payChannel === 'mobile_money'
          ? "Incorrect PIN/code. Please enter '1234' to complete this simulated payment."
          : "Incorrect OTP. Please enter '1234' to complete this simulated payment."
      );
    }
  };

  // Render trigger card
  if (!paymentInitiated) {
    return (
      <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 className="font-heading-md" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, textTransform: 'uppercase' }}>
          <CreditCard size={20} />
          <span>Payment Method</span>
        </h3>
        
        <p className="font-body-md" style={{ color: 'var(--text-mute)', margin: 0, fontSize: '14px' }}>
          We use Paystack to secure your transaction. You can pay with your M-Pesa account or Credit/Debit card.
        </p>

        <div style={{ backgroundColor: 'var(--color-soft-cloud)', padding: '16px', border: '1px solid var(--color-hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-mute)', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Amount to Pay</span>
            <span className="font-heading-lg" style={{ color: 'var(--color-ink)' }}>KSh {amount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '13px', fontWeight: 600 }}>
            <CheckCircle size={16} />
            <span>Secure checkout</span>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-full" 
          onClick={handleStartPayment}
          style={{ gap: '8px' }}
        >
          <CreditCard size={18} />
          <span>Pay KSh {amount.toLocaleString()}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-mute)', fontSize: '11px' }}>
          <ShieldAlert size={14} />
          <span>Secured by Paystack (M-Pesa & Cards)</span>
        </div>
      </div>
    );
  }

  // Live Gateway loading screen
  if (!isDemo) {
    return (
      <div className="modal-overlay" style={{ zIndex: 3000 }}>
        <div className="paystack-iframe-mock text-center" style={{ width: '100%', maxWidth: '420px', padding: '40px 24px', border: '1px solid var(--color-ink)', boxSizing: 'border-box' }}>
          <Loader2 style={{ margin: '0 auto 20px', color: 'var(--color-ink)', animation: 'spin 1.5s linear infinite' }} size={48} />
          <h3 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '8px' }}>Loading Paystack secure gateway</h3>
          <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '24px' }}>Connecting to Paystack (M-Pesa / Card)...</p>
          <button 
            type="button"
            className="btn btn-secondary btn-full" 
            onClick={() => {
              setPaymentInitiated(false);
              onCancel();
            }}
          >
            Cancel Payment
          </button>
        </div>
        <style>{`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Simulated Paystack checkout popup
  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="paystack-iframe-mock" style={{ width: '100%', maxWidth: '460px', border: '1px solid var(--color-ink)', boxShadow: 'none', boxSizing: 'border-box' }}>
        {/* Header */}
        <div className="paystack-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-hairline-soft)' }}>
          <div className="paystack-merchant" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png" 
              alt={settings.shopName} 
              style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '0px' }} 
            />
            <div>
              <span className="paystack-merchant-name" style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>{settings.shopName}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-mute)' }}>{customerName} ({customerPhone})</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="paystack-amount" style={{ fontSize: '16px', fontWeight: 700 }}>KSh {amount.toLocaleString()}</span>
            <div style={{ fontSize: '10px', color: 'var(--color-sale)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>
              DEMO CHECKOUT
            </div>
          </div>
        </div>

        {/* Body container */}
        <div className="paystack-body" style={{ padding: '24px' }}>
          {demoState === 'input' && (
            <div>
              {/* Metadata Recap Card */}
              <div style={{ 
                backgroundColor: 'var(--color-soft-cloud)', 
                border: '1px dashed var(--color-hairline-soft)', 
                padding: '12px', 
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderRadius: '0px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cart ID</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-ink)', fontFamily: 'monospace' }}>{cartId}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Note</span>
                  <span style={{ 
                    fontWeight: 500, 
                    color: 'var(--color-ink)', 
                    fontStyle: orderNote ? 'italic' : 'normal',
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    padding: '8px 10px',
                    borderLeft: '2px solid var(--color-ink)'
                  }}>
                    {orderNote || 'No customer note provided.'}
                  </span>
                </div>
              </div>

              {/* Pay channels tabs */}
              <div className="paystack-sidebar" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button 
                  type="button" 
                  className={`paystack-channel ${payChannel === 'mobile_money' ? 'active' : ''}`}
                  onClick={() => setPayChannel('mobile_money')}
                  style={{ padding: '12px', border: '1px solid var(--color-hairline)', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'none' }}
                >
                  <Smartphone size={16} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>M-Pesa</span>
                </button>

                <button 
                  type="button" 
                  className={`paystack-channel ${payChannel === 'card' ? 'active' : ''}`}
                  onClick={() => setPayChannel('card')}
                  style={{ padding: '12px', border: '1px solid var(--color-hairline)', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'none' }}
                >
                  <CreditCard size={16} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Card</span>
                </button>
              </div>

              {payChannel === 'mobile_money' ? (
                <form onSubmit={handleDemoMpesaSubmit}>
                  {/* Mpesa prompt instruction */}
                  <div style={{ backgroundColor: '#f0fbf5', border: '1px solid var(--color-success)', padding: '12px', fontSize: '13px', color: 'var(--color-success)', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 600 }}>Simulated M-Pesa STK Push:</span><br />
                    Initiate a mock STK Push. Enter your mobile number below and enter PIN '1234' on the next screen.
                  </div>

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontSize: '12px', color: 'var(--color-ink)' }}>M-PESA MOBILE NUMBER</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="e.g. 0712345678"
                      value={mpesaNumber}
                      onChange={e => setMpesaNumber(e.target.value)}
                      style={{ minHeight: '44px', padding: '10px', fontSize: '15px' }}
                      required
                    />
                  </div>

                  <button type="submit" className="paystack-pay-btn" style={{ height: '48px', padding: '12px', cursor: 'pointer', textTransform: 'uppercase', width: '100%' }}>
                    Send STK Push (KSh {amount.toLocaleString()})
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDemoCardPaySubmit}>
                  {/* Test Card Cue */}
                  <div style={{ backgroundColor: '#f0fbf5', border: '1px solid var(--color-success)', padding: '12px', fontSize: '13px', color: 'var(--color-success)', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 600 }}>Test Card Details (Copy to use):</span><br />
                    Card: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>4081 0000 0000 0000</span> | Expiry: <span style={{ fontWeight: 'bold' }}>12/28</span> | CVV: <span style={{ fontWeight: 'bold' }}>123</span>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '12px', color: 'var(--color-ink)' }}>CARD NUMBER</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="4081 0000 0000 0000"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      style={{ minHeight: '44px', padding: '10px', fontSize: '15px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--color-ink)' }}>CARD EXPIRY</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        style={{ minHeight: '44px', padding: '10px', fontSize: '15px' }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label" style={{ fontSize: '12px', color: 'var(--color-ink)' }}>CVV</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="123"
                        maxLength={3}
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        style={{ minHeight: '44px', padding: '10px', fontSize: '15px' }}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="paystack-pay-btn" style={{ height: '48px', padding: '12px', cursor: 'pointer', textTransform: 'uppercase', width: '100%' }}>
                    Pay KSh {amount.toLocaleString()}
                  </button>
                </form>
              )}

              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: '13px', marginTop: '16px', textDecoration: 'underline', width: '100%', cursor: 'pointer' }}
                onClick={() => {
                  setPaymentInitiated(false);
                  onCancel();
                }}
              >
                Cancel Payment
              </button>
            </div>
          )}

          {demoState === 'processing' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Loader2 style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px', color: 'var(--color-ink)' }} size={40} />
              <h3 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '8px' }}>
                {payChannel === 'mobile_money' ? "Sending M-Pesa STK Push..." : "Processing payment..."}
              </h3>
              <p style={{ color: 'var(--text-mute)', fontSize: '14px' }}>Please do not close this window or press the back button.</p>
            </div>
          )}

          {demoState === 'otp' && (
            <form onSubmit={handleOtpSubmit}>
              <h3 className="font-heading-md" style={{ textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>
                {payChannel === 'mobile_money' ? "M-Pesa Authorization" : "Authorize Transaction"}
              </h3>
              <p style={{ textAlign: 'center', color: 'var(--text-mute)', fontSize: '13px', marginBottom: '24px' }}>
                {payChannel === 'mobile_money' 
                  ? "Simulated: Enter the M-Pesa PIN/authorization code to confirm payment."
                  : "Enter the OTP code sent to your registered phone number."
                }
              </p>

              <div style={{ backgroundColor: '#fffcf7', border: '1px solid #ffd4a8', padding: '12px', fontSize: '13px', color: '#b26500', marginBottom: '16px', textAlign: 'center' }}>
                {payChannel === 'mobile_money' ? "Simulated M-Pesa PIN / PIN Code: " : "Demo Authorization Code: "}
                <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>1234</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '12px', color: 'var(--color-ink)', textAlign: 'center', display: 'block' }}>
                  {payChannel === 'mobile_money' ? "ENTER PIN CODE" : "ENTER OTP CODE"}
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="1234"
                  value={otpValue}
                  onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px', minHeight: '52px' }}
                  required
                />
              </div>

              {otpError && (
                <div style={{ color: 'var(--color-sale)', fontSize: '13px', marginBottom: '16px', fontWeight: 600, textAlign: 'center' }}>
                  {otpError}
                </div>
              )}

              <button type="submit" className="paystack-pay-btn" style={{ height: '48px', padding: '12px', cursor: 'pointer', textTransform: 'uppercase', width: '100%' }}>
                Confirm Payment
              </button>
            </form>
          )}

          {demoState === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Loader2 style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 20px', color: 'var(--color-ink)' }} size={40} />
              <h3 className="font-heading-md" style={{ textTransform: 'uppercase', marginBottom: '8px' }}>Verifying Transaction...</h3>
              <p style={{ color: 'var(--text-mute)', fontSize: '14px' }}>Checking M-Pesa transaction status on secure networks.</p>
            </div>
          )}

          {demoState === 'success' && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <CheckCircle style={{ margin: '0 auto 20px', color: 'var(--color-success)' }} size={48} />
              <h2 className="font-heading-lg" style={{ color: 'var(--color-success)', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Successful!</h2>
              <p style={{ color: 'var(--text-mute)', fontSize: '14px' }}>Thank you. Your order has been placed.</p>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--color-canvas)', color: 'var(--text-mute)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '16px', borderTop: '1px solid var(--color-hairline-soft)' }}>
          <ShieldAlert size={14} />
          <span>Secured by Paystack (Demo Checkout Interface)</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
