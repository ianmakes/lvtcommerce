import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, updateProfile, updatePassword } from 'firebase/auth';
import { ShoppingBag, MapPin, User, Bell, Lock, CheckCircle, Loader2, Calendar, DollarSign, Heart, Trash2, ShoppingCart } from 'lucide-react';
import { Order, BuyerProfile, Product, CartItem } from '../types';
import { getOrders, getBuyerProfile, saveBuyerProfile } from '../db';
import { auth } from '../firebase';

interface BuyerAccountProps {
  currentUser: FirebaseUser;
  onReturnToStore: () => void;
  wishlist: string[];
  products: Product[];
  onRemoveWishlist: (productId: string) => void;
  onAddToCart: (item: CartItem) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning') => void;
  initialTab?: string;
}

export const BuyerAccount: React.FC<BuyerAccountProps> = ({
  currentUser,
  onReturnToStore,
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
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  // Load account data (orders and profile settings)
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load orders and filter by user email
      const allOrders = await getOrders();
      const userOrders = allOrders.filter(
        o => o.buyerEmail === currentUser.email || o.customerPhone === profile.phone
      );
      setOrders(userOrders);

      // Load profile preferences from Firestore
      const userProfile = await getBuyerProfile(currentUser.uid);
      if (userProfile) {
        setProfile(userProfile);
      } else {
        // Create initial profile record if not found
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
    } catch (err) {
      console.error("Error loading account data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      // 1. Update display name in Auth
      if (profile.fullName.trim() !== (currentUser.displayName || '')) {
        await updateProfile(currentUser, {
          displayName: profile.fullName.trim()
        });
      }

      // 2. Save profile in Firestore
      await saveBuyerProfile(profile);

      // 3. Update password if filled
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
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update profile settings.");
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
    <div className="container" style={{ padding: '40px 24px' }}>
      
      {isLoading && (
        <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 9999, backgroundColor: 'var(--accent-primary)', color: 'white', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
          <span>Syncing Account...</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', margin: 0 }}>My Account</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Manage your profile, shipping addresses, and track active orders.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={onReturnToStore}>
          Back to Store
        </button>
      </div>

      {successMsg && (
        <div 
          style={{ 
            color: 'var(--success-color)', 
            backgroundColor: 'var(--success-light)', 
            padding: '16px', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--success-color)',
            marginBottom: '24px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div 
          style={{ 
            color: 'var(--warning-color)', 
            backgroundColor: 'var(--warning-light)', 
            padding: '16px', 
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--warning-color)',
            marginBottom: '24px',
            fontWeight: 'bold'
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="admin-container">
        
        {/* Sidebar Nav */}
        <aside className="admin-sidebar">
          <button 
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            <ShoppingBag size={20} />
            <span>Order History ({orders.length})</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => { setActiveTab('wishlist'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            <Heart size={20} />
            <span>My Wishlist ({wishlist.length})</span>
          </button>

          <button 
            className={`admin-nav-item ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => { setActiveTab('shipping'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            <MapPin size={20} />
            <span>Shipping Address</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            <User size={20} />
            <span>Profile Settings</span>
          </button>
          
          <button 
            className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notifications'); setSuccessMsg(''); setErrorMsg(''); }}
          >
            <Bell size={20} />
            <span>Notifications</span>
          </button>
        </aside>

        {/* Content Panel */}
        <main className="admin-content">
          
          {/* TAB 1: Order History */}
          {activeTab === 'orders' && (
            <div>
              <h2>Order History</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Track shipment progress and inspect purchase invoice receipts.</p>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <h3>No Orders Found</h3>
                  <p>You haven't purchased any items yet. Browse our store to make your first order.</p>
                  <button className="btn btn-primary" onClick={onReturnToStore} style={{ marginTop: '20px' }}>
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {orders.map(order => (
                    <div key={order.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                      {/* Order summary bar */}
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          flexWrap: 'wrap', 
                          gap: '16px', 
                          backgroundColor: 'var(--bg-secondary)', 
                          padding: '16px 24px', 
                          borderBottom: '1px solid var(--border-color)' 
                        }}
                      >
                        <div style={{ display: 'flex', gap: '24px' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>ORDER NUMBER</span>
                            <span style={{ fontWeight: 'bold' }}>{order.id}</span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>DATE PLACED</span>
                            <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} />
                              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>TOTAL AMOUNT</span>
                            <span style={{ fontWeight: '900', color: 'var(--accent-primary)' }}>KSh {order.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`status-badge ${order.orderStatus.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>

                      {/* Order Details Body */}
                      <div style={{ padding: '24px' }}>
                        <h4 style={{ marginBottom: '12px' }}>Items Purchased:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: idx < order.items.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                              <div>
                                <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginLeft: '12px' }}>
                                  ({item.variantDetails}) x{item.quantity}
                                </span>
                              </div>
                              <span style={{ fontWeight: 'bold' }}>KSh {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
              <h2>Default Shipping Address</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Configure your primary shipment info to speed up future checkouts.</p>

              <div className="card">
                {/* Contact Phone */}
                <div className="form-group">
                  <label className="form-label" htmlFor="ship-phone">Contact Phone Number:</label>
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
                  <label className="form-label" htmlFor="ship-address">Default Delivery Address:</label>
                  <textarea 
                    id="ship-address"
                    className="form-input" 
                    placeholder="House number, apartment, street address, and region in Kenya..."
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                    style={{ minHeight: '120px', fontFamily: 'inherit' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                  Save Shipping Address
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Profile Settings */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile}>
              <h2>Profile & Account Security</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Update your user display name and secure account password.</p>

              <div className="card">
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="pref-fullname">Shopper Full Name:</label>
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
                  <label className="form-label">Email Address (Cannot be modified):</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={profile.email} 
                    disabled 
                  />
                </div>

                {/* Password Change Divider */}
                <h3 style={{ marginTop: '32px', marginBottom: '16px', fontSize: '1.2rem', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                  Change Password
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Leave these fields blank if you do not want to modify your password.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-newpass">New Password:</label>
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
                    <label className="form-label" htmlFor="pref-confirmpass">Confirm Password:</label>
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

                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px', marginTop: '16px' }}>
                  Save Profile Settings
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Notifications */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveNotifications}>
              <h2>Notification Preferences</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Configure how you would like us to send order fulfillment alerts and invoices.</p>

              <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Email Notifications */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '24px', height: '24px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                      checked={profile.notifyEmail}
                      onChange={e => setProfile({ ...profile, notifyEmail: e.target.checked })}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'block' }}>Email Order Confirmations</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Send invoices and shipping status alerts directly to your registered email address.
                      </span>
                    </div>
                  </label>

                  {/* SMS Notifications */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '24px', height: '24px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                      checked={profile.notifySms}
                      onChange={e => setProfile({ ...profile, notifySms: e.target.checked })}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'block' }}>SMS Shipment Alerts</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Receive text message updates when courier riders dispatch your items. (Standard SMS rates may apply).
                      </span>
                    </div>
                  </label>

                  {/* Promotions */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '12px' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '24px', height: '24px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                      checked={profile.notifyPromos}
                      onChange={e => setProfile({ ...profile, notifyPromos: e.target.checked })}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1.05rem', display: 'block' }}>Exclusive Health & Mobility Offers</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Send weekly newsletters, healthy lifestyle tips, and coupon codes for wellness tools.
                      </span>
                    </div>
                  </label>

                </div>

                <button type="submit" className="btn btn-primary" style={{ minHeight: '44px', marginTop: '16px' }}>
                  Save Preferences
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: Wishlist */}
          {activeTab === 'wishlist' && (
            <div>
              <h2>My Wishlist</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Your saved items. You can quickly add them to your shopping cart or remove them.
              </p>

              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <Heart size={48} style={{ margin: '0 auto 16px', opacity: 0.5, color: 'var(--warning-color)' }} />
                  <h3>Your Wishlist is Empty</h3>
                  <p>Browse our catalog and tap the heart icon on any product to save it here.</p>
                  <button className="btn btn-primary" onClick={onReturnToStore} style={{ marginTop: '20px' }}>
                    Browse Products
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {wishlist.map(prodId => {
                    const prod = products.find(p => p.id === prodId);
                    if (!prod) return null;
                    const prodPrice = prod.variants && prod.variants.length > 0
                      ? `From KSh ${prod.basePrice.toLocaleString()}`
                      : `KSh ${prod.basePrice.toLocaleString()}`;

                    const handleAddWishItemToCart = () => {
                      const hasVars = prod.attributes && prod.attributes.length > 0;
                      const matchedVar = hasVars && prod.variants && prod.variants.length > 0
                        ? prod.variants[0] // Add first variant by default
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
                        className="card animate-fade-in" 
                        style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--border-color)' }}
                      >
                        <div style={{ height: '150px', width: '100%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                          <img src={prod.image} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', margin: '0 0 6px 0', flexGrow: 1 }}>{prod.name}</h4>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '12px', display: 'block' }}>{prodPrice}</span>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-small"
                            onClick={handleAddWishItemToCart}
                            style={{ flex: 1, minHeight: '36px', display: 'flex', gap: '4px', padding: '0 8px', fontSize: '0.8rem' }}
                          >
                            <ShoppingCart size={14} />
                            <span>Add to Cart</span>
                          </button>
                          
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => {
                              onRemoveWishlist(prod.id);
                              onShowToast(`Removed ${prod.name} from wishlist.`, 'success');
                            }}
                            style={{ width: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            title="Remove from Wishlist"
                          >
                            <Trash2 size={14} style={{ color: 'var(--warning-color)' }} />
                          </button>
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
