import React, { useState, useEffect } from 'react';
import { User as FirebaseUser, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendEmailVerification, multiFactor, TotpMultiFactorGenerator, TotpSecret } from 'firebase/auth';
import { ShoppingBag, MapPin, CheckCircle, Loader2, Calendar, Heart, Trash2, ShoppingCart, Activity, Lock, X, Printer, User } from 'lucide-react';
import { Order, BuyerProfile, Product, CartItem, ShopSettings } from '../types';
import { getOrders, getBuyerProfile, saveBuyerProfile, subscribeToNewsletter, deleteNewsletterSubscriber, getNewsletterSubscribers } from '../db';
import { navigate, Link } from '../Router';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { printReceipt } from '../utils/printReceipt';

interface BuyerAccountProps {
  currentUser: FirebaseUser;
  wishlist: string[];
  products: Product[];
  onRemoveWishlist: (productId: string) => void;
  onAddToCart: (item: CartItem) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning') => void;
  initialTab?: string;
  settings: ShopSettings;
  onProfileUpdate?: (avatarUrl: string | null) => void;
}

export const BuyerAccount: React.FC<BuyerAccountProps> = ({
  currentUser,
  wishlist,
  products,
  onRemoveWishlist,
  onAddToCart,
  onShowToast,
  initialTab,
  settings,
  onProfileUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'wishlist' | 'address' | 'profile' | 'security'>('overview');
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

  // Avatar Upload & Crop States
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string>('');
  const [cropScale, setCropScale] = useState<number>(1);
  const [cropX, setCropX] = useState<number>(0);
  const [cropY, setCropY] = useState<number>(0);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  // 2FA state variables
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [mfaEnrollmentOpen, setMfaEnrollmentOpen] = useState(false);
  const [mfaModalStep, setMfaModalStep] = useState<'unverified' | 'password' | 'scan' | 'recovery' | 'verify'>('password');
  const [mfaPassword, setMfaPassword] = useState('');
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [totpQrUrl, setTotpQrUrl] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [downloadedCodes, setDownloadedCodes] = useState(false);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');

  // Sync activeTab when initialTab prop or URL path changes
  useEffect(() => {
    const syncTab = () => {
      const pathSegment = window.location.pathname.replace('/account/', '');
      if (['overview', 'orders', 'wishlist', 'address', 'profile', 'security'].includes(pathSegment)) {
        setActiveTab(pathSegment as any);
        return;
      }
      
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['overview', 'orders', 'wishlist', 'address', 'profile', 'security'].includes(tabParam)) {
        setActiveTab(tabParam as any);
        return;
      }

      if (initialTab && ['overview', 'orders', 'wishlist', 'address', 'profile', 'security'].includes(initialTab)) {
        setActiveTab(initialTab as any);
      }
    };

    syncTab();
    window.addEventListener('popstate', syncTab);
    return () => window.removeEventListener('popstate', syncTab);
  }, [initialTab]);

  // Load account data (orders and profile settings)
  const loadData = async () => {
    setIsLoading(true);
    try {
      setIs2FAEnabled(multiFactor(currentUser).enrolledFactors.length > 0);
      let currentPhone = '';
      // Check newsletter status
      const subscribers = await getNewsletterSubscribers();
      const userProfile = await getBuyerProfile(currentUser.uid);
      const emailToMatch = (userProfile?.email || currentUser.email || '').toLowerCase();
      const isSubscribed = emailToMatch ? subscribers.some(s => s.email.toLowerCase() === emailToMatch) : false;

      if (userProfile) {
        setProfile({ ...userProfile, notifyNewsletter: isSubscribed });
        currentPhone = userProfile.phone;
        if (onProfileUpdate) onProfileUpdate(userProfile.avatarUrl || null);
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
          role: 'customer',
          notifyNewsletter: isSubscribed
        };
        await saveBuyerProfile(initialProfile);
        setProfile(initialProfile);
        if (onProfileUpdate) onProfileUpdate(null);
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

  const generateRecoveryCodes = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.push(code);
    }
    return codes;
  };

  const hashRecoveryCode = async (code: string) => {
    const msgBuffer = new TextEncoder().encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleDownloadRecoveryCodes = () => {
    const content = `GoldenCare Market Shopper MFA Recovery Codes\n=========================================\n\nSave these codes securely. Each code is ONE-TIME use.\n\n${generatedCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goldencare_shopper_mfa_recovery_codes_${currentUser.uid}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedCodes(true);
  };

  const handleSendVerificationEmail = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      await sendEmailVerification(currentUser);
      onShowToast("Verification email sent! Please check your inbox.", "success");
    } catch (err) {
      const error = err as Error;
      console.error("Failed to send verification email:", error);
      setMfaError(error.message || "Failed to send verification email. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      await currentUser.reload();
      if (currentUser.emailVerified) {
        setMfaModalStep('password');
        onShowToast("Email verified successfully! You can now proceed.", "success");
      } else {
        setMfaError("Email is still unverified. Please check your inbox and click the verification link.");
      }
    } catch (err) {
      const error = err as Error;
      console.error("Failed to check verification status:", error);
      setMfaError(error.message || "Failed to check status. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyPasswordStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    try {
      if (!currentUser.email) {
        throw new Error("No authenticated user email found.");
      }
      const credential = EmailAuthProvider.credential(currentUser.email, mfaPassword);
      await reauthenticateWithCredential(currentUser, credential);

      const session = await multiFactor(currentUser).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      setTotpSecret(secret);
      
      const qrUrl = secret.generateQrCodeUrl(currentUser.email, "GoldenCare Market");
      setTotpQrUrl(qrUrl);

      const codes = generateRecoveryCodes();
      setGeneratedCodes(codes);
      setDownloadedCodes(false);

      setMfaModalStep('scan');
    } catch (err) {
      const error = err as { code?: string; message?: string };
      console.error("Re-authentication failed:", error);
      if (error.code === 'auth/unverified-email') {
        setMfaModalStep('unverified');
        setMfaError("Your email must be verified before enrolling a second factor.");
      } else {
        setMfaError(error.message || "Incorrect password. Please try again.");
      }
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyTotpStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    try {
      if (!totpSecret) {
        throw new Error("Enrollment session expired. Please restart.");
      }

      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, totpVerificationCode);
      await multiFactor(currentUser).enroll(assertion, "Authenticator App");

      const hashedCodes = await Promise.all(generatedCodes.map(c => hashRecoveryCode(c)));
      const secRef = doc(db, "users", currentUser.uid, "security", "recovery");
      await setDoc(secRef, {
        recoveryCodes: hashedCodes,
        totpSecretKey: totpSecret.secretKey
      });

      setIs2FAEnabled(true);
      setMfaEnrollmentOpen(false);

      // Save enable2FA state to profile
      const updatedProfile = { ...profile, enable2FA: true };
      setProfile(updatedProfile);
      await saveBuyerProfile(updatedProfile);

      onShowToast("Two-Factor Authentication enrolled successfully!", "success");
    } catch (err) {
      console.error("Verification failed:", err);
      setMfaError("Invalid verification code. Please check your app and try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (is2FAEnabled) {
      if (confirm("Are you sure you want to disable Two-Factor Authentication? Recovery codes will also be deleted.")) {
        try {
          const factors = multiFactor(currentUser).enrolledFactors;
          for (const f of factors) {
            await multiFactor(currentUser).unenroll(f);
          }
          const secRef = doc(db, "users", currentUser.uid, "security", "recovery");
          await deleteDoc(secRef);
          setIs2FAEnabled(false);

          // Save enable2FA state to profile
          const updatedProfile = { ...profile, enable2FA: false };
          setProfile(updatedProfile);
          await saveBuyerProfile(updatedProfile);

          onShowToast("Two-Factor Authentication disabled.", "success");
        } catch (err) {
          console.error("Unenroll failed:", err);
          alert("Failed to disable 2FA. You may need to refresh or log in again.");
        }
      }
    } else {
      setMfaPassword('');
      setTotpVerificationCode('');
      setMfaError('');
      
      if (!currentUser.emailVerified) {
        setMfaModalStep('unverified');
      } else {
        setMfaModalStep('password');
      }
      setMfaEnrollmentOpen(true);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImageSrc(reader.result as string);
        setCropScale(1);
        setCropX(0);
        setCropY(0);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx && uploadedImageSrc) {
      const img = new Image();
      img.src = uploadedImageSrc;
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 256);
        
        ctx.save();
        ctx.translate(128, 128);
        ctx.scale(cropScale, cropScale);
        ctx.translate(cropX * (256 / 150), cropY * (256 / 150));
        
        let drawW = 256;
        let drawH = 256;
        const aspect = img.width / img.height;
        if (aspect > 1) {
          drawH = 256 / aspect;
        } else {
          drawW = 256 * aspect;
        }
        
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setProfile(prev => ({ ...prev, avatarUrl: croppedDataUrl }));
        setIsCropping(false);
        setUploadedImageSrc('');
      };
    }
  };

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

  const handleSaveProfileOnly = async (e: React.FormEvent) => {
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
      if (onProfileUpdate) onProfileUpdate(profile.avatarUrl || null);

      // Sync newsletter subscription
      const oldProfile = await getBuyerProfile(currentUser.uid);
      const oldEmail = oldProfile?.email;
      if (oldEmail && oldEmail.trim().toLowerCase() !== profile.email.trim().toLowerCase()) {
        await deleteNewsletterSubscriber(oldEmail);
      }

      if (profile.notifyNewsletter) {
        const names = profile.fullName.trim().split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';
        await subscribeToNewsletter(firstName, lastName, profile.phone || '', profile.email);
      } else {
        await deleteNewsletterSubscriber(profile.email);
      }

      setSuccessMsg("Profile settings updated successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to update profile settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSecurityOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      await updatePassword(currentUser, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg("Password updated successfully!");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to update password.");
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
    { id: 'profile', label: 'Profile Settings', icon: <User size={18} /> },
    { id: 'security', label: 'Security', icon: <Lock size={18} /> }
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
              onClick={() => { navigate('/account/' + tab.id); setActiveTab(tab.id); setSuccessMsg(''); setErrorMsg(''); }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          
          <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline-soft)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-mute)', paddingLeft: '16px', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
              More Information
            </span>
            <Link 
              to="/about"
              className="admin-nav-item"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <span>About GoldenCare</span>
            </Link>
            <Link 
              to="/policy"
              className="admin-nav-item"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <span>Return Policy</span>
            </Link>
            <Link 
              to="/terms"
              className="admin-nav-item"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            >
              <span>Terms of Use</span>
            </Link>
          </div>
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

              <div className="responsive-grid-main">
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
                               <span style={{ fontSize: '12px', color: 'var(--text-mute)', fontWeight: 600 }}>
                                 {prod.salePrice && prod.salePrice > 0 && prod.salePrice < prod.basePrice ? (
                                   <>
                                     <span style={{ color: 'var(--color-sale)', marginRight: '6px' }}>KSh {prod.salePrice.toLocaleString()}</span>
                                     <span style={{ textDecoration: 'line-through', color: 'var(--text-stone)', fontSize: '11px' }}>KSh {prod.basePrice.toLocaleString()}</span>
                                   </>
                                 ) : (
                                   `KSh ${prod.basePrice.toLocaleString()}`
                                 )}
                               </span>
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

                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-hairline-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ fontSize: '13px', color: 'var(--text-mute)' }}>
                            <strong>Shipping To:</strong> {order.customerName} &bull; {order.customerAddress} &bull; Phone: {order.customerPhone}
                          </div>
                          <button 
                            className="btn btn-secondary btn-small"
                            onClick={() => printReceipt(order, settings)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', height: 'auto', minHeight: 'auto', fontSize: '12px' }}
                          >
                            <Printer size={14} />
                            <span>Print Receipt</span>
                          </button>
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
                    const isOnSale = !!(prod.salePrice && prod.salePrice > 0 && prod.salePrice < prod.basePrice);
                    const prodPrice = prod.variants && prod.variants.length > 0
                      ? `From KSh ${(isOnSale ? prod.salePrice! : prod.basePrice).toLocaleString()}`
                      : `KSh ${(isOnSale ? prod.salePrice! : prod.basePrice).toLocaleString()}`;

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

          {/* TAB: Profile Settings */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfileOnly} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Profile Settings</h2>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Manage your personal details and configure notification preferences.</p>
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
                    <label className="form-label" style={{ fontWeight: 600 }}>Avatar Image (1:1 Ratio)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      {profile.avatarUrl ? (
                        <img 
                          src={profile.avatarUrl} 
                          alt="Avatar Preview" 
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--color-hairline-soft)' }} 
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-soft-cloud)', border: '1px solid var(--color-hairline-soft)', fontSize: '11px', fontWeight: 600, color: 'var(--text-mute)' }}>
                          {getInitials()}
                        </div>
                      )}
                      <div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="avatar-upload-input" 
                          style={{ display: 'none' }} 
                          onChange={handleFileChange}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => document.getElementById('avatar-upload-input')?.click()}
                          style={{ height: '36px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, padding: '0 12px', borderRadius: 0, margin: 0 }}
                        >
                          Upload Local Image
                        </button>
                      </div>
                    </div>

                    {isCropping && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                      }}>
                        <div style={{
                          backgroundColor: 'var(--color-canvas)',
                          padding: '32px',
                          maxWidth: '400px',
                          width: '100%',
                          border: '1px solid var(--color-hairline-soft)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '20px'
                        }}>
                          <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)' }}>Position & Scale Avatar</h3>
                          
                          <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid var(--color-ink)',
                            position: 'relative',
                            backgroundColor: '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <img 
                              src={uploadedImageSrc} 
                              alt="Upload source" 
                              style={{
                                transform: `translate(${cropX}px, ${cropY}px) scale(${cropScale})`,
                                transformOrigin: 'center center',
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                pointerEvents: 'none'
                              }}
                            />
                          </div>

                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-stone)' }}>
                                <span>Zoom / Scale</span>
                                <span>{Math.round(cropScale * 100)}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="1" 
                                max="3" 
                                step="0.05" 
                                value={cropScale} 
                                onChange={e => setCropScale(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-stone)' }}>
                                <span>Position X</span>
                                <span>{cropX}px</span>
                              </div>
                              <input 
                                type="range" 
                                min="-100" 
                                max="100" 
                                value={cropX} 
                                onChange={e => setCropX(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-stone)' }}>
                                <span>Position Y</span>
                                <span>{cropY}px</span>
                              </div>
                              <input 
                                type="range" 
                                min="-100" 
                                max="100" 
                                value={cropY} 
                                onChange={e => setCropY(parseInt(e.target.value))}
                                style={{ width: '100%' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={handleApplyCrop}
                              style={{ flex: 1, height: '40px', textTransform: 'uppercase', fontWeight: 600, fontSize: '12px', borderRadius: 0 }}
                            >
                              Apply Crop
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => { setIsCropping(false); setUploadedImageSrc(''); }}
                              style={{ flex: 1, height: '40px', textTransform: 'uppercase', fontWeight: 600, fontSize: '12px', borderRadius: 0, backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', border: 'none' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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

                <div className="form-group" style={{ opacity: profile.email && !currentUser.phoneNumber ? 0.7 : 1 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={profile.email || ''} 
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    disabled={!!(profile.email && !currentUser.phoneNumber)} 
                    style={{ borderRadius: 0, cursor: profile.email && !currentUser.phoneNumber ? 'not-allowed' : 'text' }}
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

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginTop: '12px' }}>
                      <input 
                        type="checkbox" 
                        style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }}
                        checked={!!profile.notifyNewsletter}
                        onChange={e => setProfile({ ...profile, notifyNewsletter: e.target.checked })}
                      />
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 600, display: 'block' }}>Newsletter Subscription</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Receive standard newsletters, product updates, and weekly articles.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 24px', textTransform: 'uppercase', fontWeight: 600 }}>
                Save Profile Settings
              </button>
            </form>
          )}

          {/* TAB: Security */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 className="font-heading-lg" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>Security & Credentials</h2>
                <p className="font-body-md" style={{ color: 'var(--text-mute)', fontSize: '14px', margin: 0 }}>Configure Two-Factor Authentication and update your account password.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 2FA Status Box */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', border: '1px solid var(--color-hairline-soft)', padding: '20px', background: '#fafafa' }}>
                  <button
                    type="button"
                    onClick={handleToggle2FA}
                    className={`btn btn-${is2FAEnabled ? 'secondary' : 'primary'}`}
                    style={{
                      borderRadius: 0,
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      minHeight: '38px',
                      height: '38px',
                      backgroundColor: is2FAEnabled ? '#d30005' : 'var(--color-ink)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Two-Factor Authentication (2FA) - Status: <strong style={{ color: is2FAEnabled ? 'var(--color-success)' : 'var(--color-sale)' }}>{is2FAEnabled ? 'Active' : 'Inactive'}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>Add an extra layer of protection. When signing in you will be asked for a code generated by an authenticator application.</span>
                  </div>
                </div>

                {/* Password Change Form */}
                <form onSubmit={handleSaveSecurityOnly} style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid var(--color-hairline-soft)', paddingTop: '20px' }}>
                  <h4 className="font-heading-xs" style={{ textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                    Update Password
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-mute)', marginBottom: '16px' }}>
                    Enter a new password below to update your login credentials.
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
                        required
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
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px', textTransform: 'uppercase', fontWeight: 600, marginTop: '8px' }}>
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* 2FA Enrollment Modal */}
      {mfaEnrollmentOpen && (
        <div className="modal-overlay" style={{ zIndex: 3500 }}>
          <div className="modal-content" style={{ maxWidth: '500px', borderRadius: 0, border: '1px solid #c3c4c7', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #c3c4c7', background: '#f6f7f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink)' }}>
                Set up Two-Factor Authentication
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  if (mfaModalStep === 'recovery' && !downloadedCodes) {
                    alert("Please download or save your recovery codes first.");
                    return;
                  }
                  setMfaEnrollmentOpen(false);
                }} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#646970' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', color: 'var(--color-ink)' }}>
              {mfaError && (
                <div style={{ backgroundColor: '#fcf0f1', borderLeft: '4px solid #d30005', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#d30005' }}>
                  {mfaError}
                </div>
              )}

              {/* STEP 0: Unverified Email Warning */}
              {mfaModalStep === 'unverified' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Your email address must be verified before you can enroll in Two-Factor Authentication. This is a security requirement to prevent lockout.
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 20px' }}>
                    Current Email: {currentUser.email}
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleSendVerificationEmail}
                      disabled={mfaLoading}
                      style={{ width: '100%', justifyContent: 'center', borderRadius: 0 }}
                    >
                      {mfaLoading ? 'Sending...' : 'Send Verification Email'}
                    </button>
                    
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCheckVerificationStatus}
                      disabled={mfaLoading}
                      style={{ width: '100%', justifyContent: 'center', borderRadius: 0, backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', border: 'none' }}
                    >
                      Check Verification Status
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #c3c4c7' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setMfaEnrollmentOpen(false)}
                      disabled={mfaLoading}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: Re-authenticate */}
              {mfaModalStep === 'password' && (
                <form onSubmit={handleVerifyPasswordStep}>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    To enable 2FA, please verify your identity by entering your shopper account password.
                  </p>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
                      Password:
                    </label>
                    <input 
                      type="password" 
                      className="form-input"
                      value={mfaPassword}
                      onChange={e => setMfaPassword(e.target.value)}
                      required
                      placeholder="Enter password"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setMfaEnrollmentOpen(false)}
                      disabled={mfaLoading}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={mfaLoading || !mfaPassword}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      {mfaLoading ? 'Verifying...' : 'Next'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Scan QR */}
              {mfaModalStep === 'scan' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    Scan this QR code with your authenticator app (e.g. Google Authenticator or Microsoft Authenticator).
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', padding: '16px', background: '#fff', border: '1px solid #c3c4c7', borderRadius: '4px' }}>
                    {totpQrUrl && <QRCodeSVG value={totpQrUrl} size={200} />}
                  </div>
                  <div style={{ backgroundColor: '#f0f0f1', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '12px', wordBreak: 'break-all' }}>
                    <strong>Manual entry key:</strong> <code style={{ userSelect: 'all', display: 'block', marginTop: '4px', background: '#fff', padding: '4px 6px', border: '1px solid #c3c4c7' }}>{totpSecret?.secretKey}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => setMfaModalStep('recovery')}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      Next: Recovery Codes &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Recovery Codes */}
              {mfaModalStep === 'recovery' && (
                <div>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    These recovery codes allow you to access your account if you lose your device. Each code can be used <strong>only once</strong>. Keep them safe.
                  </p>
                  <div style={{ 
                    maxHeight: '160px', 
                    overflowY: 'auto', 
                    border: '1px solid #c3c4c7', 
                    background: '#f6f7f7', 
                    padding: '12px', 
                    marginBottom: '16px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '6px'
                  }}>
                    {generatedCodes.map((c, i) => (
                      <div key={c}>{i + 1}. <strong>{c}</strong></div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleDownloadRecoveryCodes}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', borderRadius: 0, minHeight: '34px', height: '34px', padding: '0 12px' }}
                    >
                      Download Codes (.txt)
                    </button>
                    {downloadedCodes ? (
                      <span style={{ fontSize: '12px', color: 'green', fontWeight: 600 }}>✓ Downloaded</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#d30005', fontWeight: 600 }}>⚠ Download required</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => setMfaModalStep('verify')}
                      disabled={!downloadedCodes}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      Next: Verify Code &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Verify Code */}
              {mfaModalStep === 'verify' && (
                <form onSubmit={handleVerifyTotpStep}>
                  <p style={{ fontSize: '13px', color: '#646970', margin: '0 0 16px' }}>
                    Enter the 6-digit code from your authenticator app to verify setup.
                  </p>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
                      Verification Code:
                    </label>
                    <input 
                      type="text" 
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-input"
                      value={totpVerificationCode}
                      onChange={e => setTotpVerificationCode(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="000000"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setMfaModalStep('recovery')}
                      disabled={mfaLoading}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={mfaLoading || totpVerificationCode.length !== 6}
                      style={{ borderRadius: 0, minHeight: '38px', height: '38px' }}
                    >
                      {mfaLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
