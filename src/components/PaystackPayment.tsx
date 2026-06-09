import React, { useState, useEffect } from 'react';
import { CreditCard, Landmark, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { ShopSettings } from '../types';

interface PaystackPaymentProps {
  settings: ShopSettings;
  amount: number; // In Naira (NGN)
  customerName: string;
  customerPhone: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

export const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  settings,
  amount,
  customerName,
  customerPhone,
  onSuccess,
  onCancel,
}) => {
  const isDemo = settings.demoMode || !settings.paystackPublicKey;
  const [payChannel, setPayChannel] = useState<'card' | 'transfer'>('card');
  
  // Card input states for Demo Mode
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // Demo processing states
  const [demoState, setDemoState] = useState<'input' | 'processing' | 'otp' | 'verifying' | 'success'>('input');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  // Clean form values
  const totalKobo = amount * 100;
  const refCode = `GC-REF-${Math.floor(100000000 + Math.random() * 900000000)}`;

  // Load Real Paystack Inline SDK if not in Demo mode
  useEffect(() => {
    if (isDemo) return;

    // Load Paystack script dynamically
    const scriptId = 'paystack-inline-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initializePaystack = () => {
      // @ts-ignore
      if (window.PaystackPop) {
        // @ts-ignore
        const handler = window.PaystackPop.setup({
          key: settings.paystackPublicKey,
          email: `${customerPhone}@goldencare.com`, // Paystack requires email, create mock email from phone
          amount: totalKobo,
          currency: 'NGN',
          ref: refCode,
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
              }
            ]
          },
          callback: function (response: any) {
            onSuccess(response.reference);
          },
          onClose: function () {
            onCancel();
          }
        });
        handler.openIframe();
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = initializePaystack;
      document.body.appendChild(script);
    } else {
      initializePaystack();
    }

    return () => {
      // Keep script loaded but don't re-initialize
    };
  }, [isDemo]);

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

  // Demo form submissions
  const handleDemoPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
      alert("Please fill in valid card details. You can copy the test card on screen.");
      return;
    }
    
    setDemoState('processing');

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
        setTimeout(() => {
          onSuccess(refCode);
        }, 1500);
      }, 2000);
    } else {
      setOtpError("Incorrect OTP. Please enter '1234' for this demo checkout.");
    }
  };

  const handleDemoTransferConfirm = () => {
    setDemoState('processing');

    setTimeout(() => {
      setDemoState('success');
      setTimeout(() => {
        onSuccess(refCode);
      }, 1500);
    }, 3000);
  };

  // If live mode, render a loading state since Paystack Inline SDK will overlay its own beautiful UI
  if (!isDemo) {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <Loader2 className="voice-wave" size={48} style={{ margin: '0 auto 20px', color: 'var(--accent-primary)', animation: 'spin 1.5s linear infinite' }} />
        <h3>Loading Paystack Secure Gateway</h3>
        <p style={{ color: 'var(--text-secondary)' }}>A secure payment window is loading. Please complete your payment there.</p>
        <button className="btn btn-secondary mt-12" onClick={onCancel}>
          Cancel Payment
        </button>
      </div>
    );
  }

  // Render simulated Paystack checkout
  return (
    <div className="paystack-iframe-mock">
      {/* Header */}
      <div className="paystack-header">
        <div className="paystack-merchant">
          <span className="paystack-merchant-name">{settings.shopName}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>{customerName} ({customerPhone})</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="paystack-amount">₦{amount.toLocaleString()}</span>
          <div style={{ fontSize: '11px', color: '#ff6b6b', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '2px' }}>
            DEMO CHECKOUT
          </div>
        </div>
      </div>

      {/* Body container */}
      <div className="paystack-body">
        {demoState === 'input' && (
          <div>
            {/* Pay channels tabs */}
            <div className="paystack-sidebar">
              <button 
                type="button" 
                className={`paystack-channel ${payChannel === 'card' ? 'active' : ''}`}
                onClick={() => setPayChannel('card')}
              >
                <CreditCard size={18} style={{ color: '#3ac582' }} />
                <span>Pay with Card</span>
              </button>
              
              <button 
                type="button" 
                className={`paystack-channel ${payChannel === 'transfer' ? 'active' : ''}`}
                onClick={() => setPayChannel('transfer')}
              >
                <Landmark size={18} style={{ color: '#3ac582' }} />
                <span>Bank Transfer</span>
              </button>
            </div>

            {payChannel === 'card' ? (
              <form onSubmit={handleDemoPaySubmit}>
                {/* Test Card Cue */}
                <div style={{ backgroundColor: '#eef9f5', border: '1px solid #3ac582', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#1e6d45', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 'bold' }}>Test Card Details (Copy to use):</span><br />
                  Card: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>4081 0000 0000 0000</span> | Expiry: <span style={{ fontWeight: 'bold' }}>12/28</span> | CVV: <span style={{ fontWeight: 'bold' }}>123</span>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '14px', color: '#444' }}>CARD NUMBER</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="4081 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    style={{ minHeight: '48px', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '14px', color: '#444' }}>CARD EXPIRY</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      style={{ minHeight: '48px', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '14px', color: '#444' }}>CVV</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="123"
                      maxLength={3}
                      value={cardCvv}
                      onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      style={{ minHeight: '48px', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="paystack-pay-btn">
                  Pay ₦{amount.toLocaleString()}
                </button>
              </form>
            ) : (
              <div style={{ color: '#333' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '6px', border: '1px solid #e1e1e1', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>TRANSFER AMOUNT</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a', margin: '4px 0' }}>₦{(amount).toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Please send this exact amount.</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '14px' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', color: '#666' }}>Bank Name</td>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', textAlign: 'right' }}>Wema Bank (Demo)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px 0', color: '#666' }}>Account Number</td>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', textAlign: 'right', fontFamily: 'monospace', fontSize: '16px' }}>9988776655</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 0', color: '#666' }}>Beneficiary</td>
                      <td style={{ padding: '8px 0', fontWeight: 'bold', textAlign: 'right' }}>{settings.shopName}</td>
                    </tr>
                  </tbody>
                </table>

                <button 
                  type="button" 
                  className="paystack-pay-btn"
                  onClick={handleDemoTransferConfirm}
                >
                  I've sent the money
                </button>
              </div>
            )}

            <button 
              type="button" 
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '14px', marginTop: '16px', textDecoration: 'underline', width: '100%', cursor: 'pointer' }}
              onClick={onCancel}
            >
              Cancel Payment
            </button>
          </div>
        )}

        {demoState === 'processing' && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#333' }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px', color: '#3ac582' }} size={48} />
            <h3 style={{ marginBottom: '8px' }}>Processing payment...</h3>
            <p style={{ color: '#666' }}>Please do not close this window or press the back button.</p>
          </div>
        )}

        {demoState === 'otp' && (
          <form onSubmit={handleOtpSubmit} style={{ color: '#333' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>Authorize Transaction</h3>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              Enter the OTP code sent to your registered phone number.
            </p>

            <div style={{ backgroundColor: '#fff8f2', border: '1px solid #ffb066', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#aa5500', marginBottom: '16px', textAlign: 'center' }}>
              Demo Authorization Code: <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>1234</span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '14px', color: '#444' }}>ENTER CODE</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="1234"
                value={otpValue}
                onChange={e => setOtpValue(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px', minHeight: '56px' }}
                required
              />
            </div>

            {otpError && (
              <div style={{ color: 'red', fontSize: '13px', marginBottom: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                {otpError}
              </div>
            )}

            <button type="submit" className="paystack-pay-btn">
              Authorize Payment
            </button>
          </form>
        )}

        {demoState === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#333' }}>
            <Loader2 style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 20px', color: '#3ac582' }} size={48} />
            <h3 style={{ marginBottom: '8px' }}>Verifying OTP...</h3>
            <p style={{ color: '#666' }}>Connecting to bank secure networks.</p>
          </div>
        )}

        {demoState === 'success' && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#333' }}>
            <CheckCircle style={{ margin: '0 auto 20px', color: '#2e7d32' }} size={64} />
            <h2 style={{ color: '#2e7d32', marginBottom: '8px' }}>Payment Successful!</h2>
            <p style={{ color: '#666' }}>Thank you. Your order has been placed.</p>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#ffffff', color: '#999999', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '16px', borderTop: '1px solid #eeeeee' }}>
        <ShieldAlert size={14} />
        <span>Secured by Paystack (Demo Checkout Interface)</span>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
