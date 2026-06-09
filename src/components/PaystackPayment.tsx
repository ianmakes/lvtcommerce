import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { ShopSettings } from '../types';

interface PaystackPaymentProps {
  settings: ShopSettings;
  amount: number; // In Kenyan Shillings (KES)
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
  const [payChannel, setPayChannel] = useState<'card' | 'mobile_money'>('mobile_money');
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [refCode, setRefCode] = useState('');
  
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
      // @ts-ignore
      if (window.PaystackPop) {
        // @ts-ignore
        const handler = window.PaystackPop.setup({
          key: settings.paystackPublicKey,
          email: `${customerPhone.replace(/[^\d]/g, '') || 'customer'}@goldencare.com`, // Paystack requires email format
          amount: totalCents,
          currency: 'KES', // Kenya Shillings
          channels: ['mobile_money', 'card'], // Mobile Money (M-Pesa) default, then Card
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
             console.log("Paystack Payment Successful! Transaction reference code:", response.reference);
             onSuccess(response.reference);
           },
           onClose: function () {
             setPaymentInitiated(false);
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
       script.onload = initializePaystack;
       initializePaystack();
     }
 
     return () => {
       // Keep script loaded
     };
   }, [isDemo, paymentInitiated, settings, customerPhone, totalCents, refCode, customerName, onSuccess, onCancel]);

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
      alert("Please fill in valid card details. You can copy the test card on screen.");
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
      alert("Please enter a valid phone number to send the M-Pesa STK Push.");
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

  // If payment hasn't been initiated yet, render the premium "Proceed to Pay" trigger card
  if (!paymentInitiated) {
    return (
      <div className="card animate-fade-in" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <CreditCard size={24} style={{ color: 'var(--accent-primary)' }} />
          <span>Payment Method</span>
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          We use Paystack to secure your transaction. You can pay with your M-Pesa account or Credit/Debit card.
        </p>

        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold', textTransform: 'uppercase' }}>Amount to Pay</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary)' }}>KSh {amount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-color)', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <CheckCircle size={16} />
            <span>Secure checkout</span>
          </div>
        </div>

        <button 
          className="btn btn-primary btn-full" 
          onClick={handleStartPayment}
          style={{ fontSize: '1.1rem', gap: '8px', minHeight: '56px' }}
        >
          <CreditCard size={20} />
          <span>Proceed to Pay KSh {amount.toLocaleString()}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#999999', fontSize: '11px', marginTop: '4px' }}>
          <ShieldAlert size={14} />
          <span>Secured by Paystack (M-Pesa & Cards)</span>
        </div>
      </div>
    );
  }

  // If live mode, render a loading state since Paystack Inline SDK will overlay its own beautiful UI
  if (!isDemo) {
    return (
      <div className="card text-center" style={{ padding: '40px' }}>
        <Loader2 className="voice-wave" size={48} style={{ margin: '0 auto 20px', color: 'var(--accent-primary)', animation: 'spin 1.5s linear infinite' }} />
        <h3>Loading Paystack Secure Gateway</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Connecting to Paystack (M-Pesa / Card)...</p>
        <button 
          className="btn btn-secondary mt-12" 
          onClick={() => {
            setPaymentInitiated(false);
            onCancel();
          }}
        >
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
          <span className="paystack-amount">KSh {amount.toLocaleString()}</span>
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
                className={`paystack-channel ${payChannel === 'mobile_money' ? 'active' : ''}`}
                onClick={() => setPayChannel('mobile_money')}
              >
                <Smartphone size={18} style={{ color: '#3ac582' }} />
                <span>M-Pesa Mobile</span>
              </button>

              <button 
                type="button" 
                className={`paystack-channel ${payChannel === 'card' ? 'active' : ''}`}
                onClick={() => setPayChannel('card')}
              >
                <CreditCard size={18} style={{ color: '#3ac582' }} />
                <span>Pay with Card</span>
              </button>
            </div>

            {payChannel === 'mobile_money' ? (
              <form onSubmit={handleDemoMpesaSubmit}>
                {/* Mpesa prompt instruction */}
                <div style={{ backgroundColor: '#eef9f5', border: '1px solid #3ac582', padding: '14px', borderRadius: '6px', fontSize: '13px', color: '#1e6d45', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 'bold' }}>Simulated M-Pesa STK Push:</span><br />
                  Initiate a mock STK Push. Enter your mobile number below and follow instructions on screen.
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ fontSize: '14px', color: '#444' }}>M-PESA MOBILE NUMBER</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    placeholder="e.g. 0712345678"
                    value={mpesaNumber}
                    onChange={e => setMpesaNumber(e.target.value)}
                    style={{ minHeight: '48px', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
                    required
                  />
                </div>

                <button type="submit" className="paystack-pay-btn">
                  Send STK Push (KSh {amount.toLocaleString()})
                </button>
              </form>
            ) : (
              <form onSubmit={handleDemoCardPaySubmit}>
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
                  Pay KSh {amount.toLocaleString()}
                </button>
              </form>
            )}

            <button 
              type="button" 
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '14px', marginTop: '16px', textDecoration: 'underline', width: '100%', cursor: 'pointer' }}
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
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#333' }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px', color: '#3ac582' }} size={48} />
            <h3 style={{ marginBottom: '8px' }}>
              {payChannel === 'mobile_money' ? "Sending M-Pesa STK Push..." : "Processing payment..."}
            </h3>
            <p style={{ color: '#666' }}>Please do not close this window or press the back button.</p>
          </div>
        )}

        {demoState === 'otp' && (
          <form onSubmit={handleOtpSubmit} style={{ color: '#333' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>
              {payChannel === 'mobile_money' ? "M-Pesa Authorization" : "Authorize Transaction"}
            </h3>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '24px' }}>
              {payChannel === 'mobile_money' 
                ? "Simulated: Enter the M-Pesa PIN/authorization code to confirm payment."
                : "Enter the OTP code sent to your registered phone number."
              }
            </p>

            <div style={{ backgroundColor: '#fff8f2', border: '1px solid #ffb066', padding: '12px', borderRadius: '6px', fontSize: '13px', color: '#aa5500', marginBottom: '16px', textAlign: 'center' }}>
              {payChannel === 'mobile_money' ? "Simulated M-Pesa PIN / PIN Code: " : "Demo Authorization Code: "}
              <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>1234</span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '14px', color: '#444', textAlign: 'center', display: 'block' }}>
                {payChannel === 'mobile_money' ? "ENTER PIN CODE" : "ENTER OTP CODE"}
              </label>
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
              Confirm Payment
            </button>
          </form>
        )}

        {demoState === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#333' }}>
            <Loader2 style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 20px', color: '#3ac582' }} size={48} />
            <h3 style={{ marginBottom: '8px' }}>Verifying Transaction...</h3>
            <p style={{ color: '#666' }}>Checking M-Pesa transaction status on secure networks.</p>
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
