import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, User, AlertCircle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface BuyerAuthProps {
  onSuccess: () => void;
}

export const BuyerAuth: React.FC<BuyerAuthProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error("Please enter your full name.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (error) {
      console.error("Authentication error:", error);
      const firebaseError = error as { code?: string; message?: string };
      let message = firebaseError.message || "An error occurred. Please try again.";
      if (firebaseError.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      if (firebaseError.code === 'auth/email-already-in-use') message = "This email is already registered. Please Sign In instead.";
      if (firebaseError.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
        message = "Incorrect email or password.";
      }
      if (firebaseError.code === 'auth/invalid-credential') {
        message = "Invalid credentials. Please verify your email and password.";
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { title: "Member-Only Drops", desc: "First access to premium recovery gear and drops." },
    { title: "Live Tracking", desc: "Follow your order status from rider dispatch to your doorstep." },
    { title: "Curated Wishlist", desc: "Save your favorite products and add to cart with one click." },
    { title: "Express Checkouts", desc: "Securely save your shipping details for next-day dispatch." }
  ];

  return (
    <div className="auth-wrapper">
      
      {/* Brand Column (Left) */}
      <div className="auth-brand-column">
        <div>
          <span className="auth-brand-badge">GoldenCare Co.</span>
          <h2 className="auth-brand-title">EVERYTHING YOU NEED TO RECOVER.</h2>
          <p className="auth-brand-subtitle">
            Join the GoldenCare membership to unlock a smarter recovery and mobility shopping experience.
          </p>
          
          <div className="auth-benefits-list">
            {benefits.map((b, idx) => (
              <div key={idx} className="auth-benefit-item">
                <CheckCircle2 size={18} className="auth-benefit-icon" />
                <div>
                  <h4 className="auth-benefit-title">{b.title}</h4>
                  <p className="auth-benefit-desc">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="auth-brand-footer">
          GoldenCare Co. &copy; 2026. All rights reserved.
        </div>
      </div>

      {/* Form Column (Right) */}
      <div className="auth-form-column">
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Custom Minimalist Tab Header */}
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
              className={`auth-tab-btn ${!isSignUp ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
              className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
            >
              Join Us
            </button>
          </div>

          <h3 className="auth-form-title">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h3>
          <p className="auth-form-subtitle">
            {isSignUp 
              ? "Fill in your details to create an account and access your member benefits." 
              : "Enter your registered email and password to log in."
            }
          </p>

          {errorMsg && (
            <div className="auth-error-alert">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Full Name (Join Us only) */}
            {isSignUp && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="buyer-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <User size={16} />
                  <span>Full Name</span>
                </label>
                <input 
                  id="buyer-name"
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Samuel Wambui"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  style={{ borderRadius: 0 }}
                />
              </div>
            )}

            {/* Email input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="buyer-email" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Mail size={16} />
                <span>Email Address</span>
              </label>
              <input 
                id="buyer-email"
                type="email" 
                className="form-input" 
                placeholder="name@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ borderRadius: 0 }}
              />
            </div>

            {/* Password input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="buyer-password" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Lock size={16} />
                <span>Password</span>
              </label>
              <input 
                id="buyer-password"
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ borderRadius: 0 }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', marginTop: '8px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0 }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? "Join Membership" : "Sign In"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .auth-wrapper {
          display: grid;
          grid-template-columns: 1fr;
          min-height: 580px;
          border: 1px solid var(--color-hairline-soft);
          background-color: var(--color-canvas);
          margin: 40px auto;
          max-width: 1000px;
        }
        @media (min-width: 768px) {
          .auth-wrapper {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }
        .auth-brand-column {
          display: none;
          background-color: var(--color-ink);
          color: #ffffff;
          padding: 48px;
          flex-direction: column;
          justify-content: space-between;
          text-align: left;
        }
        @media (min-width: 768px) {
          .auth-brand-column {
            display: flex;
          }
        }
        .auth-brand-badge {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          opacity: 0.8;
          display: block;
          margin-bottom: 24px;
        }
        .auth-brand-title {
          font-size: 28px;
          font-weight: 800;
          text-transform: uppercase;
          line-height: 1.2;
          margin: 0 0 16px 0;
          letter-spacing: 0.5px;
        }
        .auth-brand-subtitle {
          font-size: 14px;
          line-height: 1.5;
          color: #ffffff;
          opacity: 0.95;
          margin: 0 0 40px 0;
        }
        .auth-benefits-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .auth-benefit-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .auth-benefit-icon {
          color: var(--color-success);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .auth-benefit-title {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }
        .auth-benefit-desc {
          margin: 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.4;
        }
        .auth-brand-footer {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 40px;
        }
        .auth-form-column {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
        }
        @media (max-width: 480px) {
          .auth-form-column {
            padding: 32px 16px;
          }
        }
        .auth-tabs {
          display: flex;
          gap: 24px;
          border-bottom: 1px solid var(--color-hairline-soft);
          margin-bottom: 32px;
        }
        .auth-tab-btn {
          background: none;
          border: none;
          padding: 8px 0 12px 0;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          color: var(--text-stone);
          position: relative;
          transition: color 0.2s ease;
        }
        .auth-tab-btn.active {
          color: var(--color-ink);
        }
        .auth-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--color-ink);
        }
        .auth-form-title {
          font-size: 20px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 8px 0;
          letter-spacing: 0.5px;
        }
        .auth-form-subtitle {
          font-size: 13px;
          color: var(--text-mute);
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        .auth-error-alert {
          display: flex;
          gap: 10px;
          align-items: center;
          color: var(--color-sale); 
          background-color: #fff5f5; 
          padding: 12px 16px; 
          border: 1px solid #ffe3e3;
          margin-bottom: 24px;
          font-weight: 600;
          font-size: 13px;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
