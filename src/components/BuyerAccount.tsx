import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, updateProfile, updatePassword } from 'firebase/auth';
import { ShoppingBag, MapPin, CheckCircle, Loader2, Calendar, Heart, Trash2, ShoppingCart, Activity, Lock } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'address' | 'security'>('overview');
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

  // Sync activeTab when initialTab prop or query parameter changes
  useEffect(() => {
    const handleUrlTabSync = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['overview', 'orders', 'wishlist', 'address', 'security'].includes(tabParam)) {
        setActiveTab(tabParam as 'overview' | 'orders' | 'wishlist' | 'address' | 'security');
      }
    };

    // Run on initial mount
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'orders', 'wishlist', 'address', 'security'].includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam as 'overview' | 'orders' | 'wishlist' | 'address' | 'security');
    } else if (initialTab && ['overview', 'orders', 'wishlist', 'address', 'security'].includes(initialTab)) {
      setActiveTab(initialTab as 'overview' | 'orders' | 'wishlist' | 'address' | 'security');
    }

    window.addEventListener('popstate', handleUrlTabSync);
    return () => window.removeEventListener('popstate', handleUrlTabSync);
  }, [initialTab]);

  // Load account data (orders and profile settings)
  const loadData = async () => {
    setIsLoading(true);
    try {
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
          username: '',
          firstName: '',
          lastName: '',
          avatarUrl: '',
          enable2FA: false,
          role: 'customer'
        };
        await saveBuyerProfile(initialProfile);
        setProfile(initialProfile);
      }

      const allOrders = await getOrders();
      const userOrders = allOrders.filter(
        o => o.buyerEmail === currentUser.email || (currentPhone && o.customerPhone === currentPhone)
      );
      // Sort orders descending by date
      userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

      setSuccessMsg("Profile and security settings updated successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to update profile settings.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper calculations
  const totalSpent = orders
    .filter(o => o.paymentStatus === 'Paid' && o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const activeDeliveriesCount = orders.filter(
    o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled'
  ).length;

  const getInitials = () => {
    const name = profile.fullName || currentUser.displayName || '';
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const memberSince = currentUser.metadata.creationTime 
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'June 2026';

  const getProgressWidth = (status: Order['orderStatus']) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Paid': return 33;
      case 'Dispatched': return 66;
      case 'Delivered': return 100;
      default: return 0;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={18} /> },
    { id: 'orders', label: `Orders (${orders.length})`, icon: <ShoppingBag size={18} /> },
    { id: 'wishlist', label: `Wishlist (${wishlist.length})`, icon: <Heart size={18} /> },
    { id: 'address', label: 'Shipping Address', icon: <MapPin size={18} /> },
    { id: 'security', label: 'Security & Profile', icon: <Lock size={18} /> }
  ] as const;

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      {isLoading && (
        <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 9999, backgroundColor: 'var(--color-ink)', color: 'var(--color-canvas)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
          <span>Syncing Account...</span>
        </div>
      )}

      {/* Top Banner section */}
      <div className="account-banner">
        <div className="account-banner-profile">
          {isLoading ? (
            <>
              <div className="account-avatar skeleton-pulse" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
              <div>
                <div className="skeleton-row-box skeleton-pulse" style={{ height: '12px', width: '100px', backgroundColor: 'rgba(255, 255, 255, 0.15)', marginBottom: '8px' }} />
                <div className="skeleton-row-box skeleton-pulse" style={{ height: '24px', width: '250px', backgroundColor: 'rgba(255, 255, 255, 0.15)', marginBottom: '8px' }} />
                <div className="skeleton-row-box skeleton-pulse" style={{ height: '14px', width: '200px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
              </div>
            </>
          ) : (
            <>
              {profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.fullName || 'Avatar'} 
                  className="account-avatar" 
                  style={{ objectFit: 'cover', borderRadius: '0px', width: '80px', height: '80px' }} 
                />
              ) : (
                <div className="account-avatar">{getInitials()}</div>
              )}
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.7, display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                  Registered Member
                </span>
                <h1 className="font-heading-lg" style={{ margin: 0, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {profile.fullName || currentUser.displayName || 'Valued Shopper'}
                </h1>
                <span style={{ fontSize: '13px', opacity: 0.8, display: 'block', marginTop: '4px' }}>
                  {profile.email} &bull; Member since {memberSince}
                </span>
              </div>
            </>
          )}
        </div>
        {!isLoading && (
          <button 
            className="btn btn-secondary btn-small" 
            onClick={() => navigate('/shop')} 
            style={{ backgroundColor: '#ffffff', color: 'var(--color-ink)', border: 'none', fontWeight: 600 }}
          >
            Continue Shopping
          </button>
        )}
      </div>

      {/* 4 Stats Cards */}
      <div className="account-stats-row">
        <div className="account-stat-card">
          {isLoading ? (
            <div className="skeleton-row-box skeleton-pulse" style={{ height: '32px', width: '60px', margin: '0 auto 8px' }} />
          ) : (
            <span className="account-stat-val">{orders.length}</span>
          )}
          <span className="account-stat-label">Total Purchases</span>
        </div>
        <div className="account-stat-card">
          {isLoading ? (
            <div className="skeleton-row-box skeleton-pulse" style={{ height: '32px', width: '120px', margin: '0 auto 8px' }} />
          ) : (
            <span className="account-stat-val">KSh {totalSpent.toLocaleString()}</span>
          )}
          <span className="account-stat-label">Spent</span>
        </div>
        <div className="account-stat-card">
          {isLoading ? (
            <div className="skeleton-row-box skeleton-pulse" style={{ height: '32px', width: '60px', margin: '0 auto 8px' }} />
          ) : (
            <span className="account-stat-val">{wishlist.length}</span>
          )}
          <span className="account-stat-label">Saved Items</span>
        </div>
        <div className="account-stat-card">
          {isLoading ? (
            <div className="skeleton-row-box skeleton-pulse" style={{ height: '32px', width: '60px', margin: '0 auto 8px' }} />
          ) : (
            <span className="account-stat-val">{activeDeliveriesCount}</span>
          )}
          <span className="account-stat-label">Active Deliveries</span>
        </div>
      </div>

      {/* Messages */}
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

      {/* Dashboard Body Grid */}
      <div className="account-dashboard-wrapper">
        
        {/* Navigation Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSuccessMsg(''); setErrorMsg(''); }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Panel */}
        <main className="account-content-card">
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="skeleton-row-box skeleton-pulse" style={{ height: '28px', width: '200px' }} />
              <div className="skeleton-row-box skeleton-pulse" style={{ height: '16px', width: '350px', marginBottom: '16px' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2].map(n => (
                  <div key={n} style={{ border: '1px solid var(--color-hairline-soft)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div className="skeleton-row-box skeleton-pulse" style={{ height: '24px', width: '120px' }} />
                      <div className="skeleton-row-box skeleton-pulse" style={{ height: '24px', width: '80px' }} />
                    </div>
                    <div className="skeleton-row-box skeleton-pulse" style={{ height: '16px', width: '180px' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* TAB: Overview */}
              {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <h3 className="font-heading-md" style={{ textTransform: 'uppercase', margin: '0 0 8px 0' }}>Welcome, {profile.fullName || currentUser.displayName || 'Member'}!</h3>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>
                  Manage your recent orders, addresses, security profile, and saved wishlist items.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
                {/* Column 1: Recent Order */}
                <div>
                  <h4 className="font-heading-xs" style={{ textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>Recent Order</h4>
                  {orders.length === 0 ? (
                    <div style={{ padding: '40px 20px', border: '1px solid var(--color-hairline-soft)', textAlign: 'center', color: 'var(--text-mute)' }}>
                      <ShoppingBag size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', margin: 0 }}>No orders placed yet.</p>
                    </div>
                  ) : (
                    (() => {
                      const recentOrder = orders[0];
                      return (
                        <div style={{ border: '1px solid var(--color-hairline-soft)', padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                            <div>
                              <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '10px', fontWeight: 600 }}>ORDER ID</span>
                              <span style={{ fontWeight: 600 }}>{recentOrder.id}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '10px', fontWeight: 600 }}>STATUS</span>
                              <span className={`status-badge ${recentOrder.orderStatus.toLowerCase()}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {recentOrder.orderStatus}
                              </span>
                            </div>
                          </div>
                          <div style={{ margin: '16px 0', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '16px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-mute)' }}>Total:</span>
                              <span style={{ fontWeight: 600 }}>KSh {recentOrder.totalAmount.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                              <span style={{ color: 'var(--text-mute)' }}>Date:</span>
                              <span style={{ fontWeight: 600 }}>{new Date(recentOrder.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button 
                            className="btn btn-secondary btn-small" 
                            onClick={() => setActiveTab('orders')} 
                            style={{ width: '100%', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}
                          >
                            View Order Timeline
                          </button>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Column 2: Wishlist Snapshot */}
                <div>
                  <h4 className="font-heading-xs" style={{ textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>Saved Items Preview</h4>
                  {wishlist.length === 0 ? (
                    <div style={{ padding: '40px 20px', border: '1px solid var(--color-hairline-soft)', textAlign: 'center', color: 'var(--text-mute)' }}>
                      <Heart size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p style={{ fontSize: '13px', margin: 0 }}>Your wishlist is empty.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {wishlist.slice(0, 3).map(prodId => {
                        const prod = products.find(p => p.id === prodId);
                        if (!prod) return null;
                        return (
                          <div key={prod.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid var(--color-hairline-soft)', padding: '8px' }}>
                            <img src={prod.image} alt={prod.name} style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</h5>
                              <span style={{ fontSize: '12px', color: 'var(--text-mute)', fontWeight: 600 }}>KSh {prod.basePrice.toLocaleString()}</span>
                            </div>
                            <button className="btn btn-secondary btn-small" onClick={() => setActiveTab('wishlist')} style={{ padding: '4px 8px', fontSize: '11px' }}>
                              View
                            </button>
                          </div>
                        );
                      })}
                      {wishlist.length > 3 && (
                        <button 
                          className="btn btn-link" 
                          onClick={() => setActiveTab('wishlist')} 
                          style={{ fontSize: '12px', textAlign: 'center', marginTop: '4px', border: 'none', background: 'none', padding: 0 }}
                        >
                          View all {wishlist.length} saved items &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Orders */}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {orders.map(order => (
                    <div key={order.id} style={{ border: '1px solid var(--color-hairline-soft)', padding: 0 }}>
                      
                      {/* Order Header Summary */}
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
                            <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '10px', fontWeight: 600 }}>ORDER NUMBER</span>
                            <span style={{ fontWeight: 600 }}>{order.id}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '10px', fontWeight: 600 }}>DATE PLACED</span>
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-mute)', display: 'block', fontSize: '10px', fontWeight: 600 }}>TOTAL AMOUNT</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>KSh {order.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={`status-badge ${order.orderStatus.toLowerCase()}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Area */}
                      <div style={{ padding: '24px 24px 8px' }}>
                        {order.orderStatus === 'Cancelled' ? (
                          <div style={{ padding: '12px 16px', backgroundColor: '#fff5f5', color: 'var(--color-sale)', border: '1px solid #ffe3e3', fontSize: '13px', fontWeight: 600 }}>
                            This order has been cancelled.
                          </div>
                        ) : (
                          <div className="order-timeline">
                            <div className="order-timeline-line"></div>
                            <div className="order-timeline-progress" style={{ width: `${getProgressWidth(order.orderStatus)}%` }}></div>
                            
                            <div className={`order-timeline-step ${['Pending', 'Paid', 'Dispatched', 'Delivered'].includes(order.orderStatus) ? 'completed' : ''}`}>
                              <div className="order-timeline-bubble">
                                {['Paid', 'Dispatched', 'Delivered'].includes(order.orderStatus) ? '✓' : '1'}
                              </div>
                              <span className="order-timeline-label">Placed</span>
                            </div>

                            <div className={`order-timeline-step ${order.orderStatus === 'Paid' ? 'active' : ['Dispatched', 'Delivered'].includes(order.orderStatus) ? 'completed' : ''}`}>
                              <div className="order-timeline-bubble">
                                {['Dispatched', 'Delivered'].includes(order.orderStatus) ? '✓' : '2'}
                              </div>
                              <span className="order-timeline-label">Processing</span>
                            </div>

                            <div className={`order-timeline-step ${order.orderStatus === 'Dispatched' ? 'active' : order.orderStatus === 'Delivered' ? 'completed' : ''}`}>
                              <div className="order-timeline-bubble">
                                {order.orderStatus === 'Delivered' ? '✓' : '3'}
                              </div>
                              <span className="order-timeline-label">Dispatched</span>
                            </div>

                            <div className={`order-timeline-step ${order.orderStatus === 'Delivered' ? 'completed' : ''}`}>
                              <div className="order-timeline-bubble">4</div>
                              <span className="order-timeline-label">Delivered</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Order Items with thumbnails */}
                      <div style={{ padding: '24px', fontSize: '14px', borderTop: '1px solid var(--color-hairline-soft)' }}>
                        <h4 style={{ fontWeight: 600, marginBottom: '16px', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>Items Purchased</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {order.items.map((item, idx) => {
                            const prod = products.find(p => p.id === item.productId);
                            const imageSrc = prod ? prod.image : 'https://placehold.co/100';
                            return (
                              <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center', paddingBottom: '16px', borderBottom: idx < order.items.length - 1 ? '1px dashed var(--color-hairline-soft)' : 'none' }}>
                                <img 
                                  src={imageSrc} 
                                  alt={item.name} 
                                  style={{ width: '64px', height: '64px', objectFit: 'cover', border: '1px solid var(--color-hairline-soft)', flexShrink: 0 }} 
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                      <h5 style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{item.name}</h5>
                                      <span style={{ color: 'var(--text-mute)', fontSize: '13px', display: 'block', marginTop: '2px' }}>
                                        {item.variantDetails} &bull; Qty: {item.quantity}
                                      </span>
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>KSh {(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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

          {/* TAB: Wishlist */}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
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
                        style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                      >
                        <div className="prod-img-container" style={{ aspectRatio: '1/1' }}>
                          <img src={prod.image} alt={prod.name} className="prod-img" />
                        </div>
                        
                        <div className="prod-card-metadata" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between', padding: '16px' }}>
                          <div>
                            <span className="prod-card-category">{(prod.categories && prod.categories.length > 0) ? prod.categories[0] : prod.category}</span>
                            <h4 className="prod-card-title" style={{ fontSize: '14px', margin: '4px 0' }}>{prod.name}</h4>
                            <span style={{ fontWeight: 600, fontSize: '14px', marginTop: '2px', display: 'block' }}>{prodPrice}</span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              onClick={handleAddWishItemToCart}
                              style={{ flex: 1, height: '36px', minHeight: '36px', fontSize: '12px', padding: '0 8px', textTransform: 'uppercase', fontWeight: 600 }}
                            >
                              <ShoppingCart size={13} style={{ marginRight: '6px' }} />
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

          {/* TAB: Address */}
          {activeTab === 'address' && (
            <form onSubmit={handleSaveShipping} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Shipping Address</h2>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Configure your primary shipment info to speed up future checkouts.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ship-phone" style={{ fontWeight: 600 }}>Contact Phone Number</label>
                  <input 
                    id="ship-phone"
                    type="tel" 
                    className="form-input" 
                    placeholder="e.g. 0712345678"
                    value={profile.phone}
                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                    style={{ borderRadius: 0 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ship-address" style={{ fontWeight: 600 }}>Default Delivery Address</label>
                  <textarea 
                    id="ship-address"
                    className="form-input" 
                    placeholder="House number, apartment, street address, and region in Kenya..."
                    value={profile.address}
                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                    style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical', borderRadius: 0 }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px', textTransform: 'uppercase', fontWeight: 600 }}>
                Save Shipping Address
              </button>
            </form>
          )}

          {/* TAB: Security */}
          {activeTab === 'security' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Security & Profile Settings</h2>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Manage your personal details, change password, and configure notification settings.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-firstname" style={{ fontWeight: 600 }}>First Name</label>
                    <input 
                      id="pref-firstname"
                      type="text" 
                      className="form-input" 
                      value={profile.firstName || ''}
                      onChange={e => {
                        const nextProfile = { ...profile, firstName: e.target.value };
                        nextProfile.fullName = `${e.target.value} ${profile.lastName || ''}`.trim();
                        setProfile(nextProfile);
                      }}
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-lastname" style={{ fontWeight: 600 }}>Last Name</label>
                    <input 
                      id="pref-lastname"
                      type="text" 
                      className="form-input" 
                      value={profile.lastName || ''}
                      onChange={e => {
                        const nextProfile = { ...profile, lastName: e.target.value };
                        nextProfile.fullName = `${profile.firstName || ''} ${e.target.value}`.trim();
                        setProfile(nextProfile);
                      }}
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-username" style={{ fontWeight: 600 }}>Username</label>
                    <input 
                      id="pref-username"
                      type="text" 
                      className="form-input" 
                      value={profile.username || ''}
                      onChange={e => setProfile({ ...profile, username: e.target.value })}
                      placeholder="e.g. samuel99"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pref-avatar" style={{ fontWeight: 600 }}>Avatar URL (1:1 Aspect Ratio)</label>
                    <input 
                      id="pref-avatar"
                      type="text" 
                      className="form-input" 
                      value={profile.avatarUrl || ''}
                      onChange={e => setProfile({ ...profile, avatarUrl: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pref-fullname" style={{ fontWeight: 600 }}>Shopper Full Name</label>
                  <input 
                    id="pref-fullname"
                    type="text" 
                    className="form-input" 
                    value={profile.fullName}
                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                    required
                    style={{ borderRadius: 0 }}
                  />
                </div>

                <div className="form-group" style={{ opacity: 0.7 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={profile.email} 
                    disabled 
                    style={{ borderRadius: 0, cursor: 'not-allowed' }}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px' }}>
                  <h4 className="font-heading-xs" style={{ textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
                    Communication Preferences
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                        checked={profile.notifyEmail}
                        onChange={e => setProfile({ ...profile, notifyEmail: e.target.checked })}
                      />
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>Email Notifications</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Receive order invoices and tracking updates.</span>
                      </div>
                    </label>
                    
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                        checked={profile.notifySms}
                        onChange={e => setProfile({ ...profile, notifySms: e.target.checked })}
                      />
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>SMS Updates</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Receive delivery notifications on your phone.</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                        checked={profile.notifyPromos}
                        onChange={e => setProfile({ ...profile, notifyPromos: e.target.checked })}
                      />
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>Exclusive Health & Mobility Offers</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Send weekly newsletters, recovery guides, and pre-order drops notifications.</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                        checked={profile.enable2FA || false}
                        onChange={e => setProfile({ ...profile, enable2FA: e.target.checked })}
                      />
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>Two-Factor Authentication (2FA) <span style={{ fontSize: '10px', backgroundColor: 'var(--color-ink)', color: '#fff', padding: '2px 6px', marginLeft: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coming Soon</span></span>
                        <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Secure your account using a secondary mobile authenticator.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px' }}>
                  <h4 className="font-heading-xs" style={{ textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                    Update Password
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-mute)', marginBottom: '16px' }}>
                    Leave these fields blank if you do not want to change your password.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pref-newpass" style={{ fontWeight: 600 }}>New Password</label>
                      <input 
                        id="pref-newpass"
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="pref-confirmpass" style={{ fontWeight: 600 }}>Confirm New Password</label>
                      <input 
                        id="pref-confirmpass"
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px', marginTop: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                Save Settings
              </button>
            </form>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
