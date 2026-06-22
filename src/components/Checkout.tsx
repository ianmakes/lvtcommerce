import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, User, MapPin, CreditCard, Smartphone, CheckCircle, ShieldAlert, Loader2, Lock, Tag, ChevronRight } from 'lucide-react';
import { CartItem, ShopSettings, Order, OrderItem, ShippingZone, TaxClass, showToast } from '../types';
import { getBuyerProfile } from '../db';
import { navigate, Link } from '../Router';
import { BuyerAuth } from './BuyerAuth';

interface CheckoutProps {
  settings: ShopSettings;
  cart: CartItem[];
  currentUser: FirebaseUser | null;
  onSubmitOrder: (order: Order) => void;
  discountPercent: number;
  flatDiscount: number;
  orderNote: string;
  onChangeOrderNote: (note: string) => void;
  shippingZones: ShippingZone[];
  taxClasses: TaxClass[];
  promoCode?: string;
  onApplyPromo?: (code: string) => void | Promise<void>;
}

function generateOrderId(): string {
  return `ord-${Math.floor(1000 + Math.random() * 9000)}`;
}

function generateDemoRef(): string {
  return `GC-REF-${Math.floor(100000000 + Math.random() * 900000000)}`;
}

export const Checkout: React.FC<CheckoutProps> = ({
  settings,
  cart,
  currentUser,
  onSubmitOrder,
  discountPercent,
  flatDiscount,
  orderNote,
  onChangeOrderNote,
  shippingZones,
  taxClasses,
  promoCode,
  onApplyPromo,
}) => {
  // Input states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Billing address state
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingName, setBillingName] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'paystack'>('cod');

  // Error/Loading states
  const [errorMsg, setErrorMsg] = useState('');
  const [paystackLoading, setPaystackLoading] = useState(false);

  // Demo payment modal states
  const [demoState, setDemoState] = useState<'none' | 'input' | 'processing' | 'otp' | 'verifying' | 'success'>('none');
  const [demoPayChannel, setDemoPayChannel] = useState<'mobile_money' | 'card'>('mobile_money');
  const [demoCardNumber, setDemoCardNumber] = useState('');
  const [demoCardExpiry, setDemoCardExpiry] = useState('');
  const [demoCardCvv, setDemoCardCvv] = useState('');
  const [demoMpesaNumber, setDemoMpesaNumber] = useState('');
  const [demoOtpValue, setDemoOtpValue] = useState('');
  const [demoOtpError, setDemoOtpError] = useState('');
  const [demoRefCode, setDemoRefCode] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [couponVal, setCouponVal] = useState(promoCode || '');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (promoCode) {
      setCouponVal(promoCode);
    }
  }, [promoCode]);

  useEffect(() => {
    if (!name || !address || !phone) {
      setShowAddressForm(true);
    }
  }, [name, address, phone]);

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
              setDemoMpesaNumber(userProfile.phone);
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
      <div className="container" style={{ padding: '40px 0' }}>
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
        <BuyerAuth settings={settings} onSuccess={() => {}} />
      </div>
    );
  }

  // Settle calculations
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const itemsSubtotal = cart.reduce((acc, item) => {
    const price = item.selectedVariant 
      ? item.selectedVariant.price 
      : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
          ? item.product.salePrice
          : item.product.basePrice);
    return acc + price * item.quantity;
  }, 0);

  let discountAmount = 0;
  if (discountPercent > 0) {
    discountAmount = (itemsSubtotal * discountPercent) / 100;
  } else if (flatDiscount > 0) {
    discountAmount = Math.min(flatDiscount, itemsSubtotal);
  }

  const subtotalAfterDiscount = Math.max(0, itemsSubtotal - discountAmount);

  // Dynamic Shipping Zone Cost Match (Matches Shipping Address)
  const findShippingCost = (addr: string): number => {
    if (!addr || !shippingZones || shippingZones.length === 0) {
      return typeof settings.shippingFee === 'number' ? settings.shippingFee : 1500;
    }
    const addrLower = addr.toLowerCase();
    for (const zone of shippingZones) {
      const regionsList = zone.regions.split(',').map(r => r.trim().toLowerCase());
      for (const reg of regionsList) {
        if (reg && addrLower.includes(reg)) {
          return zone.cost;
        }
      }
    }
    return typeof settings.shippingFee === 'number' ? settings.shippingFee : 1500;
  };

  const shippingFeeSetting = findShippingCost(address);
  const shippingFreeThresholdSetting = typeof settings.shippingFreeThreshold === 'number' ? settings.shippingFreeThreshold : 30000;

  // Calculate delivery fee
  const deliveryFee = subtotalAfterDiscount >= shippingFreeThresholdSetting ? 0 : shippingFeeSetting;

  // Calculate tax dynamically based on each item's tax class rate
  const taxAmount = cart.reduce((acc, item) => {
    const price = item.selectedVariant 
      ? item.selectedVariant.price 
      : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
          ? item.product.salePrice
          : item.product.basePrice);
    const itemSubtotal = price * item.quantity;

    // Determine tax rate
    let rate = typeof settings.taxRate === 'number' ? settings.taxRate : 16;
    const taxClassId = item.selectedVariant?.taxClassId || item.product.taxClassId;
    if (taxClassId && taxClasses) {
      const matchClass = taxClasses.find(tc => tc.id === taxClassId);
      if (matchClass) {
        rate = matchClass.rate;
      }
    }

    // Apply coupon proportion
    const proportion = itemsSubtotal > 0 ? itemSubtotal / itemsSubtotal : 0;
    const itemDiscount = discountAmount * proportion;
    const itemSubtotalAfterDiscount = Math.max(0, itemSubtotal - itemDiscount);

    const itemTax = itemSubtotalAfterDiscount * (rate / 100);
    return acc + Math.round(itemTax);
  }, 0);

  // Calculate final grand total
  const grandTotal = subtotalAfterDiscount + taxAmount + deliveryFee;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d+ ]/g, '');
    setPhone(value);
    setDemoMpesaNumber(value);
  };

  const handleBillingPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d+ ]/g, '');
    setBillingPhone(value);
  };

  const handlePaymentSuccess = (reference: string) => {
    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      variantDetails: item.selectedVariant 
        ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ') 
        : 'Standard Option',
      price: item.selectedVariant 
        ? item.selectedVariant.price 
        : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
            ? item.product.salePrice
            : item.product.basePrice),
      quantity: item.quantity,
      variantId: item.selectedVariant?.id
    }));

    const orderId = generateOrderId();

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
      subtotal: itemsSubtotal,
      taxAmount: taxAmount,
      shippingFee: deliveryFee,
      billingName: billingSameAsShipping ? name : billingName,
      billingPhone: billingSameAsShipping ? phone : billingPhone,
      billingAddress: billingSameAsShipping ? address : billingAddress,
      billingSameAsShipping,
      paymentMethod: 'Paystack Card/M-Pesa',
      notes: orderNote || undefined
    };

    if (currentUser?.email) {
      newOrder.buyerEmail = currentUser.email;
    }

    onSubmitOrder(newOrder);
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
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
    if (!billingSameAsShipping) {
      if (!billingName.trim()) {
        setErrorMsg("Please type in your billing name.");
        return;
      }
      if (billingPhone.replace(/\D/g, '').length < 8) {
        setErrorMsg("Please enter a valid billing phone number.");
        return;
      }
      if (billingAddress.trim().length < 10) {
        setErrorMsg("Please write down your complete billing address.");
        return;
      }
    }
    setErrorMsg('');

    if (paymentMethod === 'cod') {
      // Direct Cash on Delivery
      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        variantDetails: item.selectedVariant 
          ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ') 
          : 'Standard Option',
        price: item.selectedVariant 
          ? item.selectedVariant.price 
          : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
              ? item.product.salePrice
              : item.product.basePrice),
        quantity: item.quantity,
        variantId: item.selectedVariant?.id
      }));

      const orderId = generateOrderId();

      const newOrder: Order = {
        id: orderId,
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        items: orderItems,
        totalAmount: grandTotal,
        paymentStatus: 'Pending',
        orderStatus: 'Pending',
        createdAt: new Date().toISOString(),
        subtotal: itemsSubtotal,
        taxAmount: taxAmount,
        shippingFee: deliveryFee,
        billingName: billingSameAsShipping ? name : billingName,
        billingPhone: billingSameAsShipping ? phone : billingPhone,
        billingAddress: billingSameAsShipping ? address : billingAddress,
        billingSameAsShipping,
        paymentMethod: 'Cash on Delivery',
        notes: orderNote || undefined
      };

      if (currentUser?.email) {
        newOrder.buyerEmail = currentUser.email;
      }

      onSubmitOrder(newOrder);
    } else {
      // Paystack Payment integration
      const isDemo = settings.demoMode || !settings.paystackPublicKey;
      if (isDemo) {
        // Init Demo Modal
        setDemoRefCode(generateDemoRef());
        setDemoState('input');
      } else {
        // Init Live Paystack Payment
        setPaystackLoading(true);
        const scriptId = 'paystack-inline-js';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        const initializePaystack = () => {
          if (window.PaystackPop) {
            const paystack = new window.PaystackPop();
            const refCode = generateDemoRef();
            paystack.newTransaction({
              key: settings.paystackPublicKey || '',
              email: `${phone.replace(/[^\d]/g, '') || 'customer'}@${(settings.shopName || 'goldencare').replace(/[^a-z0-9]/gi, '').toLowerCase()}.com`,
              amount: grandTotal * 100, // In cents
              currency: 'KES',
              ref: refCode,
              brandColor: settings.brandingPrimaryColor || '#111111',
              logo: settings.logoUrl || 'https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png',
              metadata: {
                custom_fields: [
                  { display_name: "Customer Name", variable_name: "customer_name", value: name },
                  { display_name: "Customer Phone", variable_name: "customer_phone", value: phone },
                  { display_name: "Customer Note", variable_name: "customer_note", value: orderNote || 'N/A' }
                ]
              },
              onSuccess: function (transaction: { reference: string }) {
                setPaystackLoading(false);
                handlePaymentSuccess(transaction.reference);
              },
              onCancel: function () {
                setPaystackLoading(false);
              }
            });
          } else {
            setPaystackLoading(false);
            showToast("Failed to initialize Paystack inline script.", "warning");
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
          initializePaystack();
        }
      }
    }
  };

  // Demo Handlers
  const handleDemoCancel = () => {
    setDemoState('none');
  };

  const handleDemoCardPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoCardNumber.length < 16 || demoCardExpiry.length < 5 || demoCardCvv.length < 3) {
      showToast("Please fill in valid card details. You can copy the test card on screen.", "warning");
      return;
    }
    setDemoState('processing');
    setTimeout(() => {
      setDemoState('otp');
    }, 2000);
  };

  const handleDemoMpesaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoMpesaNumber.replace(/\D/g, '').length < 8) {
      showToast("Please enter a valid phone number to send the M-Pesa STK Push.", "warning");
      return;
    }
    setDemoState('processing');
    setTimeout(() => {
      setDemoState('otp');
    }, 2000);
  };

  const handleDemoOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoOtpValue === '1234') {
      setDemoState('verifying');
      setTimeout(() => {
        setDemoState('success');
        setTimeout(() => {
          setDemoState('none');
          handlePaymentSuccess(demoRefCode);
        }, 1500);
      }, 2000);
    } else {
      setDemoOtpError(
        demoPayChannel === 'mobile_money'
          ? "Incorrect PIN. Enter '1234' to authorize simulated payment."
          : "Incorrect OTP. Enter '1234' to authorize simulated payment."
      );
    }
  };

  const handleDemoCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setDemoCardNumber(formatted.substring(0, 19));
  };

  const handleDemoExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val;
    if (val.length > 2) {
      formatted = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setDemoCardExpiry(formatted.substring(0, 5));
  };

  const codEnabled = settings.codActive !== false;
  const paystackEnabled = settings.paystackActive !== false && !!settings.paystackPublicKey;

  // ─── MOBILE CHECKOUT VIEW ─────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="mobile-checkout-container" style={{ padding: '16px 12px 100px', backgroundColor: '#f5f5f5', minHeight: '100vh', color: 'var(--color-ink)' }}>
        
        {/* Mobile Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button 
            type="button"
            onClick={() => navigate('/cart')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
            aria-label="Back to Cart"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-heading-lg" style={{ margin: 0, fontWeight: 700, fontSize: '18px' }}>Place your order</h1>
        </div>

        {/* T&C banner */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#1e40af', lineHeight: '1.4' }}>
          If you proceed, you are automatically accepting our <Link to="/terms" style={{ textDecoration: 'underline', color: '#1e40af', fontWeight: 600 }}>Terms & Conditions</Link>
        </div>

        {errorMsg && (
          <div style={{ color: 'var(--color-sale)', backgroundColor: '#fff5f5', padding: '12px', border: '1px solid var(--color-sale)', marginBottom: '16px', fontWeight: 500, fontSize: '13px', borderRadius: '6px' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* ORDER SUMMARY */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid var(--color-hairline-soft)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Order Summary
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-mute)' }}>Item's total ({totalItems})</span>
                <span>KSh {itemsSubtotal.toLocaleString()}</span>
              </div>
              
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                  <span>Promo Discount:</span>
                  <span>-KSh {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-mute)' }}>Delivery fees</span>
                <span>{deliveryFee === 0 ? "FREE" : `KSh ${deliveryFee.toLocaleString()}`}</span>
              </div>

              {taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-mute)' }}>VAT Tax</span>
                  <span>KSh {taxAmount.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px', borderTop: '1px solid #f3f4f6', paddingTop: '8px', marginTop: '4px' }}>
                <span>Total</span>
                <span>KSh {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Coupon Code Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 12px' }}>
              <Tag size={16} style={{ color: 'var(--text-stone)' }} />
              <input 
                type="text" 
                placeholder="Enter code here"
                value={couponVal}
                onChange={e => setCouponVal(e.target.value)}
                style={{ flexGrow: 1, border: 'none', outline: 'none', fontSize: '13px', padding: '8px 0', backgroundColor: 'transparent' }}
              />
              <button 
                type="button"
                onClick={() => onApplyPromo && onApplyPromo(couponVal.trim().toUpperCase())}
                style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 700, fontSize: '12px', cursor: 'pointer', padding: '4px' }}
              >
                APPLY
              </button>
            </div>
          </div>

          {/* PAYMENT METHOD */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid var(--color-hairline-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Payment Method
              </span>
              <button 
                type="button"
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
              >
                {showPaymentForm ? 'CLOSE' : 'CHANGE'}
              </button>
            </div>

            {!showPaymentForm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <CreditCard size={18} style={{ color: 'var(--text-mute)' }} />
                <span style={{ fontWeight: 600 }}>
                  {paymentMethod === 'cod' 
                    ? 'Pay on delivery with Mobile Money and Bank Cards' 
                    : 'Pay online securely with Paystack Gateway'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                {codEnabled && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '8px 0' }}>
                    <input 
                      type="radio" 
                      name="pay-method-mobile"
                      checked={paymentMethod === 'cod'} 
                      onChange={() => { setPaymentMethod('cod'); setShowPaymentForm(false); }}
                      style={{ accentColor: '#f97316' }}
                    />
                    <span>Pay on Delivery (COD / M-Pesa Transfer)</span>
                  </label>
                )}
                {paystackEnabled && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '8px 0' }}>
                    <input 
                      type="radio" 
                      name="pay-method-mobile"
                      checked={paymentMethod === 'paystack'} 
                      onChange={() => { setPaymentMethod('paystack'); setShowPaymentForm(false); }}
                      style={{ accentColor: '#f97316' }}
                    />
                    <span>Pay Online (Cards, M-Pesa STK push)</span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* ADDRESS */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid var(--color-hairline-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Address
              </span>
              <button 
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
              >
                {showAddressForm ? 'CLOSE' : 'CHANGE YOUR ADDRESS'}
              </button>
            </div>

            {!showAddressForm ? (
              <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600 }}>{name || 'No name added'}</span>
                <span style={{ color: 'var(--text-mute)' }}>{address || 'No address added'}</span>
                <span style={{ color: 'var(--text-mute)' }}>Phone: {phone || 'No phone added'}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Phone number"
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Delivery Address</label>
                  <textarea
                    className="form-input"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Full delivery address"
                    style={{ minHeight: '60px', borderRadius: '6px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox" 
                      checked={billingSameAsShipping} 
                      onChange={e => setBillingSameAsShipping(e.target.checked)}
                      style={{ accentColor: '#f97316' }}
                    />
                    <span>Billing Same as Delivery</span>
                  </label>
                  
                  {!billingSameAsShipping && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Billing name"
                        value={billingName}
                        onChange={e => setBillingName(e.target.value)}
                        style={{ borderRadius: '6px' }}
                      />
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="Billing phone"
                        value={billingPhone}
                        onChange={handleBillingPhoneChange}
                        style={{ borderRadius: '6px' }}
                      />
                      <textarea
                        className="form-input"
                        placeholder="Billing address"
                        value={billingAddress}
                        onChange={e => setBillingAddress(e.target.value)}
                        style={{ minHeight: '60px', borderRadius: '6px', resize: 'vertical' }}
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={() => setShowAddressForm(false)} 
                  className="btn btn-secondary btn-small"
                  style={{ alignSelf: 'flex-end', height: '32px', minHeight: '32px', fontSize: '11px', marginTop: '4px' }}
                >
                  SAVE DETAILS
                </button>
              </div>
            )}
          </div>

          {/* DELIVERY */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '16px', border: '1px solid var(--color-hairline-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Delivery
              </span>
            </div>
            
            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600 }}>Home Delivery / Pickup Station</span>
              <span style={{ color: '#f97316', fontWeight: 600 }}>
                Delivery estimated between {new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} and {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
              </span>
              <span style={{ color: 'var(--text-mute)', fontSize: '12px', marginTop: '4px' }}>
                Fulfilled by {settings.shopName || 'GoldenCare'} Express
              </span>
            </div>
          </div>

        </div>

        {/* Demo payment modal overlay */}
        {demoState !== 'none' && (
          <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="paystack-iframe-mock" style={{ width: '100%', maxWidth: '440px', border: '1px solid var(--color-ink)', borderRadius: '12px', boxSizing: 'border-box' }}>
              
              <div className="paystack-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-hairline-soft)', backgroundColor: '#fff' }}>
                <div className="paystack-merchant" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={settings.logoUrl || "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png"} 
                    alt={settings.shopName} 
                    style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
                  />
                  <div>
                    <span className="paystack-merchant-name" style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>{settings.shopName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-mute)' }}>{name} ({phone})</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="paystack-amount" style={{ fontSize: '16px', fontWeight: 700 }}>KSh {grandTotal.toLocaleString()}</span>
                  <div style={{ fontSize: '9px', color: 'var(--color-sale)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                    DEMO GATEWAY
                  </div>
                </div>
              </div>

              <div className="paystack-body" style={{ padding: '24px', backgroundColor: '#fff' }}>
                {demoState === 'input' && (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <button 
                        type="button" 
                        className={`paystack-channel ${demoPayChannel === 'mobile_money' ? 'active' : ''}`}
                        onClick={() => setDemoPayChannel('mobile_money')}
                        style={{ padding: '12px', border: `1px solid ${demoPayChannel === 'mobile_money' ? '#f97316' : '#e5e7eb'}`, borderRadius: '6px', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'none' }}
                      >
                        <Smartphone size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>M-Pesa</span>
                      </button>

                      <button 
                        type="button" 
                        className={`paystack-channel ${demoPayChannel === 'card' ? 'active' : ''}`}
                        onClick={() => setDemoPayChannel('card')}
                        style={{ padding: '12px', border: `1px solid ${demoPayChannel === 'card' ? '#f97316' : '#e5e7eb'}`, borderRadius: '6px', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'none' }}
                      >
                        <CreditCard size={16} />
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>Card</span>
                      </button>
                    </div>

                    {demoPayChannel === 'mobile_money' ? (
                      <form onSubmit={handleDemoMpesaSubmit}>
                        <div style={{ backgroundColor: '#f0fbf5', border: '1px solid var(--color-success)', padding: '12px', fontSize: '13px', color: 'var(--color-success)', marginBottom: '16px', borderRadius: '6px' }}>
                          <span style={{ fontWeight: 600 }}>Simulated M-Pesa STK Push:</span><br />
                          Enter your M-Pesa number. Use mock PIN <strong>1234</strong> to authorize.
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                          <label className="form-label" style={{ fontSize: '12px' }}>M-PESA MOBILE NUMBER</label>
                          <input 
                            type="tel" 
                            className="form-input" 
                            placeholder="e.g. 0712345678"
                            value={demoMpesaNumber}
                            onChange={e => setDemoMpesaNumber(e.target.value)}
                            style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '6px' }}
                            required
                          />
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" style={{ height: '44px', minHeight: '44px', backgroundColor: '#f97316', border: 'none', borderRadius: '6px' }}>
                          Send STK Push
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleDemoCardPaySubmit}>
                        <div style={{ backgroundColor: '#f0fbf5', border: '1px solid var(--color-success)', padding: '12px', fontSize: '13px', color: 'var(--color-success)', marginBottom: '16px', borderRadius: '6px' }}>
                          <span style={{ fontWeight: 600 }}>Simulated Card Pay:</span><br />
                          Fill in mock details. Use mock OTP <strong>1234</strong> on the next screen.
                        </div>

                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label className="form-label" style={{ fontSize: '12px' }}>CARD NUMBER</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="4000 1234 5678 9010"
                            value={demoCardNumber}
                            onChange={handleDemoCardNumberChange}
                            style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '6px' }}
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>EXPIRY</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="MM/YY"
                              value={demoCardExpiry}
                              onChange={handleDemoExpiryChange}
                              style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '6px' }}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>CVV</label>
                            <input 
                              type="password" 
                              className="form-input" 
                              placeholder="123"
                              maxLength={4}
                              value={demoCardCvv}
                              onChange={e => setDemoCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                              style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '6px' }}
                              required
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-full" style={{ height: '44px', minHeight: '44px', backgroundColor: '#f97316', border: 'none', borderRadius: '6px' }}>
                          Pay Card
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {demoState === 'processing' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Loader2 style={{ animation: 'spin 1.5s linear infinite', color: '#f97316', margin: '0 auto 20px' }} size={40} />
                    <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>
                      {demoPayChannel === 'mobile_money' 
                        ? "Sending STK push prompt request..." 
                        : "Verifying secure card data..."}
                    </p>
                  </div>
                )}

                {demoState === 'otp' && (
                  <form onSubmit={handleDemoOtpSubmit}>
                    <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '12px', fontSize: '13px', color: '#d48806', marginBottom: '16px', borderRadius: '6px' }}>
                      <strong>Demo Security Verification</strong><br />
                      Please enter the authorization PIN or OTP: <strong>1234</strong>
                    </div>

                    {demoOtpError && (
                      <div style={{ color: 'var(--color-sale)', fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>
                        {demoOtpError}
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>
                        {demoPayChannel === 'mobile_money' ? "ENTER M-PESA 4-DIGIT PIN" : "ENTER SECURE CARD OTP CODE"}
                      </label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••"
                        maxLength={6}
                        value={demoOtpValue}
                        onChange={e => setDemoOtpValue(e.target.value)}
                        style={{ minHeight: '44px', padding: '10px', fontSize: '18px', textAlign: 'center', letterSpacing: '8px', borderRadius: '6px' }}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" style={{ height: '44px', minHeight: '44px', backgroundColor: '#f97316', border: 'none', borderRadius: '6px' }}>
                      Verify & Pay
                    </button>
                  </form>
                )}

                {demoState === 'verifying' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Loader2 style={{ animation: 'spin 1.5s linear infinite', color: '#f97316', margin: '0 auto 20px' }} size={40} />
                    <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>Confirming transaction settlement with bank...</p>
                  </div>
                )}

                {demoState === 'success' && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-success)' }}>
                    <CheckCircle size={48} style={{ margin: '0 auto 16px' }} />
                    <h3 className="font-heading-md" style={{ margin: '0 0 8px', textTransform: 'uppercase' }}>Payment Authorized</h3>
                    <p style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Reference: {demoRefCode}</p>
                  </div>
                )}
              </div>

              <div className="paystack-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--color-hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                <button 
                  type="button" 
                  onClick={handleDemoCancel}
                  style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Cancel Payment
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-mute)', fontWeight: 600 }}>
                  <Lock size={12} />
                  <span>Secured by Paystack Demo</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Sticky Bottom Confirm Order Button */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '76px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 999
        }}>
          <button 
            type="button" 
            onClick={handlePlaceOrder}
            disabled={paystackLoading || (!codEnabled && !paystackEnabled)}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#f97316',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {paystackLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 className="spinner" size={16} />
                <span>Processing...</span>
              </span>
            ) : (
              <span>CONFIRM ORDER</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── DESKTOP CHECKOUT VIEW ────────────────────────────────────────
  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '40px 16px' }}>
      <button 
        className="btn btn-secondary btn-small"
        onClick={() => navigate('/cart')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', height: '36px', minHeight: '36px' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Cart</span>
      </button>

      <h1 className="font-heading-xl" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Checkout Order</h1>
      <p className="font-body-md" style={{ color: 'var(--text-mute)', marginBottom: '40px' }}>
        Complete your shipping address and payment details below.
      </p>

      {errorMsg && (
        <div style={{ color: 'var(--color-sale)', backgroundColor: '#fff5f5', padding: '16px', border: '1px solid var(--color-sale)', marginBottom: '32px', fontWeight: 500, fontSize: '14px', borderRadius: '0px' }}>
          {errorMsg}
        </div>
      )}

      <div className="responsive-grid-main">
        
        {/* LEFT COLUMN: Shipping details + Billing details + Payment method */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Shipping/Delivery Form */}
          <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '32px', borderRadius: '0px' }}>
            <h2 className="font-heading-lg" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase' }}>
              <User size={24} />
              <span>1. Delivery Information</span>
            </h2>

            {/* Name */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="ship-name">Your Full Name</label>
              <input
                id="ship-name"
                type="text"
                className="form-input"
                placeholder="e.g. Samuel Adebayo"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ borderRadius: '0px' }}
                required
              />
            </div>

            {/* Phone */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="ship-phone">Phone Number</label>
              <input
                id="ship-phone"
                type="tel"
                className="form-input"
                placeholder="e.g. 0712 345678"
                value={phone}
                onChange={handlePhoneChange}
                style={{ borderRadius: '0px' }}
                required
              />
            </div>

            {/* Address */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="ship-address">Full Delivery Address</label>
              <textarea
                id="ship-address"
                className="form-input"
                placeholder="e.g. House 5, Graceful Lane, off Ngong Road, Nairobi"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', borderRadius: '0px' }}
                required
              />
            </div>
          </div>

          {/* Billing same/different Toggle */}
          <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '32px', borderRadius: '0px' }}>
            <h2 className="font-heading-lg" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase' }}>
              <MapPin size={24} />
              <span>2. Billing Address</span>
            </h2>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 500, userSelect: 'none', marginBottom: '20px' }}>
              <input 
                type="checkbox" 
                checked={billingSameAsShipping} 
                onChange={e => setBillingSameAsShipping(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-ink)' }}
              />
              <span>Billing Address is same as Delivery Address</span>
            </label>

            {!billingSameAsShipping && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Billing Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="bill-name">Billing Name</label>
                  <input
                    id="bill-name"
                    type="text"
                    className="form-input"
                    placeholder="Full billing name"
                    value={billingName}
                    onChange={e => setBillingName(e.target.value)}
                    style={{ borderRadius: '0px' }}
                    required={!billingSameAsShipping}
                  />
                </div>

                {/* Billing Phone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="bill-phone">Billing Phone</label>
                  <input
                    id="bill-phone"
                    type="tel"
                    className="form-input"
                    placeholder="Billing phone number"
                    value={billingPhone}
                    onChange={handleBillingPhoneChange}
                    style={{ borderRadius: '0px' }}
                    required={!billingSameAsShipping}
                  />
                </div>

                {/* Billing Address */}
                <div className="form-group">
                  <label className="form-label" htmlFor="bill-address">Billing Address</label>
                  <textarea
                    id="bill-address"
                    className="form-input"
                    placeholder="Billing street address, town, city"
                    value={billingAddress}
                    onChange={e => setBillingAddress(e.target.value)}
                    style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', borderRadius: '0px' }}
                    required={!billingSameAsShipping}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Order notes */}
          <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '32px', borderRadius: '0px' }}>
            <h2 className="font-heading-lg" style={{ marginBottom: '16px', textTransform: 'uppercase' }}>3. Order Notes (Optional)</h2>
            <textarea
              className="form-input"
              placeholder="Add details such as gate code, delivery directions, packaging requests, etc."
              value={orderNote}
              onChange={e => onChangeOrderNote(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', borderRadius: '0px' }}
            />
          </div>

          {/* Payment Options Selection */}
          <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '32px', borderRadius: '0px' }}>
            <h2 className="font-heading-lg" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase' }}>
              <Lock size={24} />
              <span>4. Payment Method</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {codEnabled && (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '16px 20px', 
                  border: `1px solid ${paymentMethod === 'cod' ? 'var(--color-ink)' : 'var(--color-hairline)'}`, 
                  cursor: 'pointer',
                  borderRadius: '0px',
                  backgroundColor: paymentMethod === 'cod' ? 'rgba(17,17,17,0.02)' : 'transparent'
                }}>
                  <input 
                    type="radio" 
                    name="pay-method"
                    checked={paymentMethod === 'cod'} 
                    onChange={() => setPaymentMethod('cod')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-ink)' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', fontSize: '15px' }}>Cash on Delivery (COD)</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Pay in cash or mobile transfer when your package is delivered.</span>
                  </div>
                </label>
              )}

              {paystackEnabled && (
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '16px 20px', 
                  border: `1px solid ${paymentMethod === 'paystack' ? 'var(--color-ink)' : 'var(--color-hairline)'}`, 
                  cursor: 'pointer',
                  borderRadius: '0px',
                  backgroundColor: paymentMethod === 'paystack' ? 'rgba(17,17,17,0.02)' : 'transparent'
                }}>
                  <input 
                    type="radio" 
                    name="pay-method"
                    checked={paymentMethod === 'paystack'} 
                    onChange={() => setPaymentMethod('paystack')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-ink)' }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', fontSize: '15px' }}>Paystack Gateway (Cards & M-Pesa)</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Securely pay online with Card, M-Pesa STK push, or Bank transfer.</span>
                  </div>
                </label>
              )}

              {!codEnabled && !paystackEnabled && (
                <div style={{ color: 'var(--color-sale)', fontWeight: 600, fontSize: '14px' }}>
                  No active payment gateways are configured. Please contact the administrator.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary and Calculations */}
        <div className="card" style={{ border: '1px solid var(--color-hairline)', padding: '32px', borderRadius: '0px', position: 'sticky', top: '100px' }}>
          <h3 className="font-heading-md" style={{ marginBottom: '24px', textTransform: 'uppercase', borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '12px' }}>Order Summary ({totalItems} items)</h3>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '6px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.map(item => {
              const price = item.selectedVariant 
                ? item.selectedVariant.price 
                : (item.product.salePrice && item.product.salePrice > 0 && item.product.salePrice < item.product.basePrice
                    ? item.product.salePrice
                    : item.product.basePrice);
              const variantDesc = item.selectedVariant 
                ? Object.entries(item.selectedVariant.options).map(([k, v]) => `${k}: ${v}`).join(', ')
                : 'Standard';

              return (
                <div 
                  key={item.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-ink)' }}>{item.product.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-mute)', marginTop: '2px' }}>{variantDesc} x {item.quantity}</div>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-ink)' }}>KSh {(price * item.quantity).toLocaleString()}</span>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-mute)' }}>Subtotal (excl. tax & shipping):</span>
              <span style={{ fontWeight: 500 }}>KSh {itemsSubtotal.toLocaleString()}</span>
            </div>
            
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 600 }}>
                <span>Promo Discount:</span>
                <span>-KSh {discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-mute)' }}>Tax (VAT calculated per-item):</span>
              <span style={{ fontWeight: 500 }}>KSh {taxAmount.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-mute)' }}>Delivery Fee:</span>
              <span style={{ fontWeight: 500 }}>{deliveryFee === 0 ? "FREE" : `KSh ${deliveryFee.toLocaleString()}`}</span>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontWeight: 700, 
                fontSize: '20px', 
                borderTop: '1px solid var(--color-hairline)', 
                paddingTop: '16px', 
                marginTop: '12px',
                color: 'var(--color-ink)'
              }}
            >
              <span>Grand Total:</span>
              <span>KSh {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {!isMobile && (
            <button 
              type="button" 
              onClick={handlePlaceOrder}
              disabled={paystackLoading || (!codEnabled && !paystackEnabled)}
              className="btn btn-primary btn-full" 
              style={{ marginTop: '32px', height: '48px', minHeight: '48px', fontSize: '15px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {paystackLoading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Place Order</span>
              )}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-mute)', fontSize: '12px', marginTop: '16px' }}>
            <ShieldAlert size={14} />
            <span>Secure checkout by industry standards.</span>
          </div>
        </div>
      </div>

      {/* Demo payment modal overlay */}
      {demoState !== 'none' && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="paystack-iframe-mock" style={{ width: '100%', maxWidth: '460px', border: '1px solid var(--color-ink)', borderRadius: '0px', boxSizing: 'border-box' }}>
            
            {/* Header */}
            <div className="paystack-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-hairline-soft)' }}>
              <div className="paystack-merchant" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img 
                  src={settings.logoUrl || "https://res.cloudinary.com/dhvnbtkgw/image/upload/v1781035261/main-sample.png"} 
                  alt={settings.shopName} 
                  style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '0px' }} 
                />
                <div>
                  <span className="paystack-merchant-name" style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>{settings.shopName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-mute)' }}>{name} ({phone})</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="paystack-amount" style={{ fontSize: '16px', fontWeight: 700 }}>KSh {grandTotal.toLocaleString()}</span>
                <div style={{ fontSize: '10px', color: 'var(--color-sale)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>
                  DEMO GATEWAY
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="paystack-body" style={{ padding: '24px' }}>
              {demoState === 'input' && (
                <div>
                  {/* Channels tabs */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button 
                      type="button" 
                      className={`paystack-channel ${demoPayChannel === 'mobile_money' ? 'active' : ''}`}
                      onClick={() => setDemoPayChannel('mobile_money')}
                      style={{ padding: '12px', border: '1px solid var(--color-hairline)', borderRadius: '0px', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'none' }}
                    >
                      <Smartphone size={16} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>M-Pesa</span>
                    </button>

                    <button 
                      type="button" 
                      className={`paystack-channel ${demoPayChannel === 'card' ? 'active' : ''}`}
                      onClick={() => setDemoPayChannel('card')}
                      style={{ padding: '12px', border: '1px solid var(--color-hairline)', borderRadius: '0px', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', background: 'none' }}
                    >
                      <CreditCard size={16} />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Card</span>
                    </button>
                  </div>

                  {demoPayChannel === 'mobile_money' ? (
                    <form onSubmit={handleDemoMpesaSubmit}>
                      <div style={{ backgroundColor: '#f0fbf5', border: '1px solid var(--color-success)', padding: '12px', fontSize: '13px', color: 'var(--color-success)', marginBottom: '16px', borderRadius: '0px' }}>
                        <span style={{ fontWeight: 600 }}>Simulated M-Pesa STK Push:</span><br />
                        Enter your M-Pesa number. Use mock PIN <strong>1234</strong> on next screen to authorize.
                      </div>

                      <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>M-PESA MOBILE NUMBER</label>
                        <input 
                          type="tel" 
                          className="form-input" 
                          placeholder="e.g. 0712345678"
                          value={demoMpesaNumber}
                          onChange={e => setDemoMpesaNumber(e.target.value)}
                          style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '0px' }}
                          required
                        />
                      </div>

                      <button type="submit" className="btn btn-primary btn-full" style={{ height: '44px', minHeight: '44px' }}>
                        Send STK Push
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleDemoCardPaySubmit}>
                      <div style={{ backgroundColor: '#f0fbf5', border: '1px solid var(--color-success)', padding: '12px', fontSize: '13px', color: 'var(--color-success)', marginBottom: '16px', borderRadius: '0px' }}>
                        <span style={{ fontWeight: 600 }}>Simulated Card Pay:</span><br />
                        Fill in mock details. Use mock OTP <strong>1234</strong> on the next screen.
                      </div>

                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label" style={{ fontSize: '12px' }}>CARD NUMBER</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="4000 1234 5678 9010"
                          value={demoCardNumber}
                          onChange={handleDemoCardNumberChange}
                          style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '0px' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '12px' }}>EXPIRY</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="MM/YY"
                            value={demoCardExpiry}
                            onChange={handleDemoExpiryChange}
                            style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '0px' }}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '12px' }}>CVV</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            placeholder="123"
                            maxLength={4}
                            value={demoCardCvv}
                            onChange={e => setDemoCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                            style={{ minHeight: '44px', padding: '10px', fontSize: '15px', borderRadius: '0px' }}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary btn-full" style={{ height: '44px', minHeight: '44px' }}>
                        Pay Card
                      </button>
                    </form>
                  )}
                </div>
              )}

              {demoState === 'processing' && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Loader2 style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-ink)', margin: '0 auto 20px' }} size={40} />
                  <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>
                    {demoPayChannel === 'mobile_money' 
                      ? "Sending STK push prompt request..." 
                      : "Verifying secure card data..."}
                  </p>
                </div>
              )}

              {demoState === 'otp' && (
                <form onSubmit={handleDemoOtpSubmit}>
                  <div style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '12px', fontSize: '13px', color: '#d48806', marginBottom: '16px', borderRadius: '0px' }}>
                    <strong>Demo Security Verification</strong><br />
                    Please enter the authorization PIN or OTP: <strong>1234</strong>
                  </div>

                  {demoOtpError && (
                    <div style={{ color: 'var(--color-sale)', fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>
                      {demoOtpError}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>
                      {demoPayChannel === 'mobile_money' ? "ENTER M-PESA 4-DIGIT PIN" : "ENTER SECURE CARD OTP CODE"}
                    </label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="••••"
                      maxLength={6}
                      value={demoOtpValue}
                      onChange={e => setDemoOtpValue(e.target.value)}
                      style={{ minHeight: '44px', padding: '10px', fontSize: '18px', textAlign: 'center', letterSpacing: '8px', borderRadius: '0px' }}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-full" style={{ height: '44px', minHeight: '44px' }}>
                    Verify & Pay
                  </button>
                </form>
              )}

              {demoState === 'verifying' && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Loader2 style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-ink)', margin: '0 auto 20px' }} size={40} />
                  <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>Confirming transaction settlement with bank...</p>
                </div>
              )}

              {demoState === 'success' && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-success)' }}>
                  <CheckCircle size={48} style={{ margin: '0 auto 16px' }} />
                  <h3 className="font-heading-md" style={{ margin: '0 0 8px', textTransform: 'uppercase' }}>Payment Authorized</h3>
                  <p style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Reference: {demoRefCode}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="paystack-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--color-hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                onClick={handleDemoCancel}
                style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Cancel Payment
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-mute)', fontWeight: 600 }}>
                <Lock size={12} />
                <span>Secured by Paystack Demo</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {isMobile && (
        <div className="mobile-sticky-checkout-bar">
          <div className="mobile-sticky-checkout-bar-details">
            <span style={{ color: 'var(--text-mute)', fontSize: '13px' }}>Estimated Total:</span>
            <span className="mobile-sticky-checkout-bar-total">KSh {grandTotal.toLocaleString()}</span>
          </div>
          <button 
            type="button" 
            onClick={handlePlaceOrder}
            disabled={paystackLoading || (!codEnabled && !paystackEnabled)}
            className="btn btn-primary btn-full" 
          >
            {paystackLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 className="spinner" size={16} />
                <span>Processing...</span>
              </span>
            ) : (
              <span>Confirm Order</span>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        .container .card,
        .responsive-grid-main .card,
        .card {
          border: 1px solid var(--color-hairline-soft) !important;
          border-radius: 10px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03) !important;
          background-color: var(--color-canvas) !important;
          transition: all 0.3s ease !important;
        }
        .container .form-input,
        .form-input {
          border-radius: 6px !important;
          border: 1px solid #dcdcdc !important;
          padding: 12px 16px !important;
          transition: all 0.2s ease !important;
        }
        .container .form-input:focus,
        .form-input:focus {
          border-color: var(--color-ink) !important;
          box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.05) !important;
          outline: none !important;
        }
        .container .btn,
        .btn {
          border-radius: 6px !important;
          transition: all 0.2s ease !important;
        }
        .container .btn-primary:hover,
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(17, 17, 17, 0.15) !important;
        }
        .paystack-iframe-mock {
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2) !important;
        }
      `}</style>

    </div>
  );
};
