import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, updateProfile, updatePassword } from 'firebase/auth';
import { ShoppingBag, MapPin, User, Bell, CheckCircle, Loader2, Calendar, Heart, Trash2, ShoppingCart } from 'lucide-react';
import { Order, BuyerProfile, Product, CartItem } from '../types';
import { getOrders, getBuyerProfile, saveBuyerProfile } from '../db';
import { navigate } from '../Router';


interface BuyerAccountProps {
  currentUser: FirebaseUser;
  wishlist: string[];
  products: Product[];
  onRemoveWishlist: (productId: string) => void;
  onAddToCart: (item: CartItem) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning') => void;
  initialTab?: string;
}

export const BuyerAccount: React.FC<BuyerAccountProps> = ({
  currentUser,
  wishlist,
  products,
  onRemoveWishlist,
  onAddToCart,
  onShowToast,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'shipping' | 'profile' | 'notifications' | 'wishlist'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<BuyerProfile>({
    uid: currentUser.uid,
    fullName: currentUser.displayName || '',
    email: currentUser.email || '',
    phone: '',
    address: '',
    notifyEmail: true,
    notifySms: false,
    notifyPromos: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync activeTab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(initialTab as typeof activeTab);
    }
  }, [initialTab]);

  // Load account data (orders and profile settings)
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch user profile first to get the phone number
      let currentPhone = '';
      const userProfile = await getBuyerProfile(currentUser.uid);
      if (userProfile) {
        setProfile(userProfile);
        currentPhone = userProfile.phone;
      } else {
        const initialProfile: BuyerProfile = {
          uid: currentUser.uid,
          fullName: currentUser.displayName || '',
          email: currentUser.email || '',
          phone: '',
          address: '',
          notifyEmail: true,
          notifySms: false,
          notifyPromos: true,
        };
        await saveBuyerProfile(initialProfile);
        setProfile(initialProfile);
      }

      // 2. Fetch and filter orders using the loaded profile data
      const allOrders = await getOrders();
      const userOrders = allOrders.filter(
        o => o.buyerEmail === currentUser.email || (currentPhone && o.customerPhone === currentPhone)
      );
      setOrders(userOrders);
    } catch (err) {
      console.error("Error loading account data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await saveBuyerProfile(profile);
      setSuccessMsg("Shipping address saved successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save shipping address.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (profile.fullName.trim() !== (currentUser.displayName || '')) {
        await updateProfile(currentUser, {
          displayName: profile.fullName.trim()
        });
      }

      await saveBuyerProfile(profile);

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await updatePassword(currentUser, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      setSuccessMsg("Profile settings updated successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to update profile settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await saveBuyerProfile(profile);
      setSuccessMsg("Notification preferences saved successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save preferences.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '30px 0' }}>
      
      {isLoading && (
        <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 9999, backgroundColor: 'var(--color-ink)', color: 'var(--color-canvas)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
          <span>Syncing Account...</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--color-hairline-soft)', paddingBottom: '16px' }}>
        <div>
          <h1 className="font-heading-xl" style={{ margin: 0 }}>My Account</h1>
          <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginTop: '4px' }}>
            Manage your profile, shipping addresses, and track active orders.
          </p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => navigate('/shop')}>
          Back to Store
        </button>
      </div>

      {successMsg && (
        <div 
          style={{ 
            color: 'var(--color-success)', 
            backgroundColor: '#f0fbf5', 
            padding: '16px', 
            border: '1px solid var(--color-success)',
            marginBottom: '24px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div 
          style={{ 
            color: 'var(--color-sale)', 
            backgroundColor: '#fff5f5', 
            padding: '16px', 
            border: '1px solid var(--color-sale)',
            marginBottom: '24px',
            fontWeight: 500,
            fontSize: '14px'
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="admin-container">
        
        {/* Sidebar Nav */}
        <aside className="admin-sidebar" style={{ border: '1px solid var(--color-hairline-soft)' }}>
          <button 
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <ShoppingBag size={18} />
            <span>Orders ({orders.length})</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => { setActiveTab('wishlist'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <Heart size={18} />
            <span>Wishlist ({wishlist.length})</span>
          </button>

          <button 
            className={`admin-nav-item ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => { setActiveTab('shipping'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <MapPin size={18} />
            <span>Shipping Info</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <User size={18} />
            <span>Profile Settings</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notifications'); setSuccessMsg(''); setErrorMsg(''); }}
            style={{ border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
        </aside>

        {/* Content Panel */}
        <main className="admin-content" style={{ border: '1px solid var(--color-hairline-soft)', backgroundColor: 'var(--color-canvas)', padding: '24px' }}>
          
          {/* TAB 1: Order History */}
          {activeTab === 'orders' && (
            <div>
              <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Order History</h2>
              <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '24px' }}>Track shipment progress and inspect purchase invoice receipts.</p>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mute)', border: '1px solid var(--color-hairline-soft)' }}>
                  <ShoppingBag size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h3 className="font-heading-md">No Orders Found</h3>
                  <p style={{ fontSize: '14px' }}>You haven't purchased any items yet. Browse our store to make your first order.</p>
                  <button className="btn btn-primary mt-24" onClick={() => navigate('/shop')}>
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {orders.map(order => (
                    <div key={order.id} className="card" style={{ border: '1px solid var(--color-hairline-soft)', padding: 0 }}>
                      {/* Order summary bar */}
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          flexWrap: 'wrap', 
                          gap: '16px', 
                          backgroundColor: 'var(--color-soft-cloud)', 
                          padding: '16px 24px', 
                          borderBottom: '1px solid var(--color-hairline-soft)' 
                        }}
                      >
                        <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                          <div>
                            <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '11px', fontWeight: 600 }}>ORDER NUMBER</span>
                            <span style={{ fontWeight: 600 }}>{order.id}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '11px', fontWeight: 600 }}>DATE PLACED</span>
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '11px', fontWeight: 600 }}>TOTAL AMOUNT</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>KSh {order.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={`status-badge ${order.orderStatus.toLowerCase()}`} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: 'var(--radius-lg)' }}>
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>

                      {/* Order Details Body */}
                      <div style={{ padding: '20px', fontSize: '14px' }}>
                        <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Items Purchased</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: idx < order.items.length - 1 ? '1px dashed var(--color-hairline-soft)' : 'none' }}>
                              <div>
                                <span style={{ fontWeight: 600 }}>{item.name}</span>
                                <span style={{ color: 'var(--text-mute)', fontSize: '13px', marginLeft: '12px' }}>
                                  ({item.variantDetails}) x{item.quantity}
                                </span>
                              </div>
                              <span style={{ fontWeight: 600 }}>KSh {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-hairline-soft)', fontSize: '13px', color: 'var(--text-mute)' }}>
                          <strong>Shipping To:</strong> {order.customerName} &bull; {order.customerAddress} &bull; Phone: {order.customerPhone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Shipping Address */}
          {activeTab === 'shipping' && (
            <form onSubmit={handleSaveShipping}>
              <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Shipping Address</h2>
              <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '24px' }}>Configure your primary shipment info to speed up future checkouts.</p>

              <div className="card" style={{ border: 'none', padding: 0 }}>
                {/* Contact Phone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="ship-phone">Contact Phone Number</label>
                  <input 
                    id="ship-phone"
                    type="tel" 
                    className="form-input" 
                    placeholder="e.g. 0712345678"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                {/* Default Address */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="ship-address">Default Delivery Address</label>
                  <textarea 
                    id="ship-address"
                    className="form-input" 
                    placeholder="House number, apartment, street address, and region in Kenya..."
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                    style={{ minHeight: '100px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Save Shipping Address
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Profile Settings */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile}>
              <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Profile Settings</h2>
              <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '24px' }}>Update your user display name and secure account password.</p>

              <div className="card" style={{ border: 'none', padding: 0 }}>
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="pref-fullname">Shopper Full Name</label>
                  <input 
                    id="pref-fullname"
                    type="text" 
                    className="form-input" 
                    value={profile.fullName}
                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                    required
                  />
                </div>

                {/* Email (Disabled) */}
                <div className="form-group" style={{ opacity: 0.7 }}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={profile.email} 
                    disabled 
                  />
                </div>

                {/* Password Change Divider */}
                <h3 className="font-heading-md" style={{ marginTop: '32px', marginBottom: '8px', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '24px', textTransform: 'uppercase' }}>
                  Change Password
                </h3>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '13px', marginBottom: '16px' }}>
                  Leave these fields blank if you do not want to modify your password.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-newpass">New Password</label>
                    <input 
                      id="pref-newpass"
                      type="password" 
                      className="form-input" 
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-confirmpass">Confirm Password</label>
                    <input 
                      id="pref-confirmpass"
                      type="password" 
                      className="form-input" 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Save Profile Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Notifications */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotifications}>
              <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Notifications</h2>
              <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '24px' }}>Configure how you would like us to send order fulfillment alerts and invoices.</p>

              <div className="card" style={{ border: 'none', padding: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Email Notifications */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                      checked={profile.notifyEmail}
                      onChange={e => setProfile({ ...profile, notifyEmail: e.target.checked })}
                    />
                    <div>
                      <span className="font-body-strong" style={{ fontSize: '15px', display: 'block' }}>Email Order Confirmations</span>
                      <span className="font-caption-sm" style={{ display: 'block', marginTop: '2px' }}>
                        Send invoices and shipping status alerts directly to your registered email address.
                      </span>
                    </div>
                  </label>

                  {/* SMS Notifications */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                      checked={profile.notifySms}
                      onChange={e => setProfile({ ...profile, notifySms: e.target.checked })}
                    />
                    <div>
                      <span className="font-body-strong" style={{ fontSize: '15px', display: 'block' }}>SMS Shipment Alerts</span>
                      <span className="font-caption-sm" style={{ display: 'block', marginTop: '2px' }}>
                        Receive text message updates when courier riders dispatch your items.
                      </span>
                    </div>
                  </label>

                  {/* Promotions */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                      checked={profile.notifyPromos}
                      onChange={e => setProfile({ ...profile, notifyPromos: e.target.checked })}
                    />
                    <div>
                      <span className="font-body-strong" style={{ fontSize: '15px', display: 'block' }}>Exclusive Health & Mobility Offers</span>
                      <span className="font-caption-sm" style={{ display: 'block', marginTop: '2px' }}>
                        Send weekly newsletters, recovery guides, and pre-order drops notifications.
                      </span>
                    </div>
                  </label>

                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '24px' }}>
                  Save Preferences
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: Wishlist */}
          {activeTab === 'wishlist' && (
            <div>
              <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>My Wishlist</h2>
              <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', marginBottom: '24px' }}>
                Your saved items. You can quickly add them to your shopping cart or remove them.
              </p>

              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-mute)', border: '1px solid var(--color-hairline-soft)' }}>
                  <Heart size={40} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--color-sale)' }} />
                  <h3 className="font-heading-md">Your Wishlist is Empty</h3>
                  <p style={{ fontSize: '14px' }}>Browse our catalog and tap the heart icon on any product to save it here.</p>
                  <button className="btn btn-primary mt-24" onClick={() => navigate('/shop')}>
                    Browse Products
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {wishlist.map(prodId => {
                    const prod = products.find(p => p.id === prodId);
                    if (!prod) return null;
                    const prodPrice = prod.variants && prod.variants.length > 0
                      ? `From KSh ${prod.basePrice.toLocaleString()}`
                      : `KSh ${prod.basePrice.toLocaleString()}`;

                    const handleAddWishItemToCart = () => {
                      const hasVars = prod.attributes && prod.attributes.length > 0;
                      const matchedVar = hasVars && prod.variants && prod.variants.length > 0
                        ? prod.variants[0]
                        : null;

                      const cartId = matchedVar 
                        ? `${prod.id}-${matchedVar.id}` 
                        : `${prod.id}-base`;

                      const item: CartItem = {
                        id: cartId,
                        product: prod,
                        selectedVariant: matchedVar,
                        quantity: 1
                      };
                      onAddToCart(item);
                      onShowToast(`Added 1 of ${prod.name} to cart.`, 'success');
                    };

                    return (
                      <div 
                        key={prod.id} 
                        className="prod-card" 
                        style={{ margin: 0 }}
                      >
                        <div className="prod-img-container">
                          <img src={prod.image} alt={prod.name} className="prod-img" />
                        </div>
                        
                        <div className="prod-card-metadata">
                          <span className="prod-card-category">{prod.category}</span>
                          <h4 className="prod-card-title" style={{ fontSize: '14px' }}>{prod.name}</h4>
                          <span style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px', display: 'block' }}>{prodPrice}</span>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              onClick={handleAddWishItemToCart}
                              style={{ flex: 1, height: '36px', minHeight: '36px', fontSize: '12px', padding: '0 8px' }}
                            >
                              <ShoppingCart size={13} />
                              <span>Add to Cart</span>
                            </button>
                            
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={() => {
                                onRemoveWishlist(prod.id);
                                onShowToast(`Removed ${prod.name} from wishlist.`, 'success');
                              }}
                              style={{ width: '36px', height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                              title="Remove from Wishlist"
                            >
                              <Trash2 size={13} style={{ color: 'var(--color-sale)' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

    </div>
  );
};
