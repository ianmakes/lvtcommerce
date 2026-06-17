import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  getMultiFactorResolver, 
  TotpMultiFactorGenerator, 
  MultiFactorResolver, 
  MultiFactorError,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { Mail, Lock, User, AlertCircle, Loader2, CheckCircle2, ArrowRight, Phone } from 'lucide-react';
import * as OTPAuth from 'otpauth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { subscribeToNewsletter, saveBuyerProfile, getBuyerProfile } from '../db';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface BuyerAuthProps {
  onSuccess: () => void;
}

const hashRecoveryCode = async (code: string) => {
  const msgBuffer = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const BuyerAuth: React.FC<BuyerAuthProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [joinNewsletter, setJoinNewsletter] = useState(true);

  // Authentication mode: 'email' | 'phone' | 'forgot'
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'forgot'>('email');

  // Phone Authentication States
  const [phoneVal, setPhoneVal] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // MFA Challenge State
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [totpInput, setTotpInput] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaChallengeType, setMfaChallengeType] = useState<'totp' | 'recovery'>('totp');

  // Helper to verify duplicates
  const checkDuplicateUser = async (emailToCheck?: string, phoneToCheck?: string) => {
    if (emailToCheck) {
      const emailQuery = query(collection(db, "users"), where("email", "==", emailToCheck.trim()));
      const snap = await getDocs(emailQuery);
      if (!snap.empty) {
        throw new Error("This email is already registered. Please Sign In instead.");
      }
    }
    if (phoneToCheck) {
      const phoneQuery = query(collection(db, "users"), where("phone", "==", phoneToCheck.trim()));
      const snap = await getDocs(phoneQuery);
      if (!snap.empty) {
        throw new Error("This phone number is already registered under another account.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error("Please enter your full name.");
        }
        // Duplicate check
        await checkDuplicateUser(email, phoneVal || undefined);

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });

        if (joinNewsletter) {
          try {
            const names = fullName.trim().split(/\s+/);
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';
            await subscribeToNewsletter(firstName, lastName, '', email);
          } catch (newsletterErr) {
            console.error("Failed to subscribe on signup:", newsletterErr);
          }
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Authentication error:", error);
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error as MultiFactorError);
        setMfaResolver(resolver);
        setShowMfaChallenge(true);
        setMfaChallengeType('totp');
        return;
      }
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

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user is logging in or if we need to prevent duplicates
      // Google automatically links or handles accounts, but let's query the profile
      const userProfile = await getBuyerProfile(user.uid);
      if (!userProfile && user.email) {
        // If signup: check if email is already in use by email/password
        const emailQuery = query(collection(db, "users"), where("email", "==", user.email));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          // Profile exists under another provider
          console.warn("User already exists with this email.");
        }
      }
      onSuccess();
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error as MultiFactorError);
        setMfaResolver(resolver);
        setShowMfaChallenge(true);
        setMfaChallengeType('totp');
        return;
      }
      setErrorMsg(error.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  // Phone Sign-In initialization
  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!phoneVal.startsWith('+')) {
        throw new Error("Phone number must include country code (e.g., +254712345678).");
      }

      // Check duplicate accounts
      if (isSignUp) {
        await checkDuplicateUser(undefined, phoneVal);
      }

      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'sign-in-button', {
          'size': 'invisible',
          'callback': () => {
            // reCAPTCHA solved
          }
        });
      }

      const confirmation = await signInWithPhoneNumber(auth, phoneVal.trim(), window.recaptchaVerifier);
      setConfirmationResult(confirmation);
    } catch (error: any) {
      console.error("Phone sign-in error:", error);
      setErrorMsg(error.message || "Failed to send verification code. Please try again.");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!confirmationResult) return;
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;

      const userProfile = await getBuyerProfile(user.uid);
      if (!userProfile) {
        const initialProfile = {
          uid: user.uid,
          fullName: fullName.trim() || user.displayName || 'Phone User',
          email: user.email || '',
          phone: user.phoneNumber || phoneVal,
          address: '',
          notifyEmail: true,
          notifySms: true,
          notifyPromos: true,
          role: 'customer'
        };
        await saveBuyerProfile(initialProfile);
      }
      onSuccess();
    } catch (error: any) {
      console.error("OTP verification error:", error);
      setErrorMsg("Invalid OTP code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetEmailSent(true);
    } catch (error: any) {
      console.error("Password reset error:", error);
      setErrorMsg(error.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    setMfaLoading(true);
    setMfaError('');

    try {
      const hint = mfaResolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, totpInput);
      await mfaResolver.resolveSignIn(assertion);
      onSuccess();
    } catch (error) {
      console.error("MFA TOTP verification failed:", error);
      setMfaError("Invalid verification code. Please check your app and try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaResolver) return;
    setMfaLoading(true);
    setMfaError('');

    try {
      const usersQuery = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(usersQuery);
      if (querySnapshot.empty) {
        throw new Error("User profile not found.");
      }
      const userDoc = querySnapshot.docs[0];
      const uid = userDoc.id;

      const secRef = doc(db, "users", uid, "security", "recovery");
      const secSnap = await getDoc(secRef);
      if (!secSnap.exists()) {
        throw new Error("No 2FA recovery options set up for this user.");
      }

      const { recoveryCodes, totpSecretKey } = secSnap.data() as { recoveryCodes: string[], totpSecretKey: string };
      if (!recoveryCodes || !totpSecretKey) {
        throw new Error("Recovery codes or secret key missing from configuration.");
      }

      const inputHashed = await hashRecoveryCode(recoveryInput.trim());

      if (!recoveryCodes.includes(inputHashed)) {
        throw new Error("Invalid recovery code. Please check and try again.");
      }

      const totp = new OTPAuth.TOTP({
        secret: totpSecretKey
      });
      const generatedCode = totp.generate();

      const hint = mfaResolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, generatedCode);
      await mfaResolver.resolveSignIn(assertion);

      const updatedCodes = recoveryCodes.filter(c => c !== inputHashed);
      const { updateDoc: updateFirestoreDoc } = await import('firebase/firestore');
      await updateFirestoreDoc(secRef, {
        recoveryCodes: updatedCodes
      });

      onSuccess();
    } catch (error) {
      const err = error as Error;
      console.error("MFA Recovery Code verification failed:", err);
      setMfaError(err.message || "Failed to verify recovery code. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCancelMfa = () => {
    setShowMfaChallenge(false);
    setMfaResolver(null);
    setTotpInput('');
    setRecoveryInput('');
    setMfaError('');
  };

  const benefits = [
    { title: "Member-Only Drops", desc: "First access to premium recovery gear and drops." },
    { title: "Live Tracking", desc: "Follow your order status from rider dispatch to your doorstep." },
    { title: "Curated Wishlist", desc: "Save your favorite products and add to cart with one click." },
    { title: "Express Checkouts", desc: "Securely save your shipping details for next-day dispatch." }
  ];

  return (
    <div className="auth-wrapper">
      <div id="recaptcha-container"></div>
      
      {/* Brand Column (Left) */}
      <div className="auth-brand-column">
        <div>
          <span className="auth-brand-badge">GoldenCare Co.</span>
          <h2 className="auth-brand-title" style={{ color: '#ffffff' }}>EVERYTHING YOU NEED TO RECOVER.</h2>
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
          {showMfaChallenge ? (
            <div>
              <h3 className="auth-form-title">Two-Factor Authentication</h3>
              <p className="auth-form-subtitle">
                {mfaChallengeType === 'totp' 
                  ? "Please enter the 6-digit code from your authenticator app." 
                  : "Please enter one of your 8-character recovery codes."}
              </p>

              {mfaError && (
                <div className="auth-error-alert">
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{mfaError}</span>
                </div>
              )}

              {mfaChallengeType === 'totp' ? (
                <form onSubmit={handleVerifyTotp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="mfa-totp" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <Lock size={16} />
                      <span>Verification Code</span>
                    </label>
                    <input 
                      id="mfa-totp"
                      type="text" 
                      pattern="[0-9]*"
                      inputMode="numeric"
                      maxLength={6}
                      className="form-input" 
                      placeholder="000000"
                      value={totpInput}
                      onChange={e => setTotpInput(e.target.value.replace(/\D/g, ''))}
                      required
                      disabled={mfaLoading}
                      autoFocus
                      style={{ borderRadius: 0 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={mfaLoading || totpInput.length !== 6}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0 }}
                    >
                      {mfaLoading ? (
                        <>
                          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Code</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelMfa}
                      disabled={mfaLoading}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0, backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', border: 'none' }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => { setMfaChallengeType('recovery'); setMfaError(''); }}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--color-ink)', 
                        textDecoration: 'underline', 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Lost your device? Use a recovery code
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyRecoveryCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="mfa-recovery" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <Lock size={16} />
                      <span>Recovery Code</span>
                    </label>
                    <input 
                      id="mfa-recovery"
                      type="text" 
                      maxLength={8}
                      className="form-input" 
                      placeholder="XXXX-XXXX"
                      value={recoveryInput}
                      onChange={e => setRecoveryInput(e.target.value.toUpperCase())}
                      required
                      disabled={mfaLoading}
                      autoFocus
                      style={{ borderRadius: 0 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={mfaLoading || recoveryInput.trim().length === 0}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0 }}
                    >
                      {mfaLoading ? (
                        <>
                          <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify Recovery Code</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelMfa}
                      disabled={mfaLoading}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0, backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', border: 'none' }}
                    >
                      Cancel
                    </button>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => { setMfaChallengeType('totp'); setMfaError(''); }}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--color-ink)', 
                        textDecoration: 'underline', 
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      Use authenticator app code instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              {/* Custom Minimalist Tab Header */}
              <div className="auth-tabs">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setErrorMsg(''); setResetEmailSent(false); setAuthMethod('email'); }}
                  className={`auth-tab-btn ${!isSignUp && authMethod !== 'forgot' ? 'active' : ''}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setErrorMsg(''); setResetEmailSent(false); setAuthMethod('email'); }}
                  className={`auth-tab-btn ${isSignUp ? 'active' : ''}`}
                >
                  Join Us
                </button>
              </div>

              {/* Login Method Toggle (Email/Password vs Phone) */}
              {authMethod !== 'forgot' && (
                <div className="auth-sub-tabs">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('email'); setErrorMsg(''); }}
                    className={`sub-tab-btn ${authMethod === 'email' ? 'active' : ''}`}
                  >
                    Email Method
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('phone'); setErrorMsg(''); }}
                    className={`sub-tab-btn ${authMethod === 'phone' ? 'active' : ''}`}
                  >
                    Phone Method
                  </button>
                </div>
              )}

              <h3 className="auth-form-title">
                {authMethod === 'forgot' ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
              </h3>
              <p className="auth-form-subtitle">
                {authMethod === 'forgot' 
                  ? "Enter your email address and we'll send you a recovery link." 
                  : isSignUp 
                  ? "Fill in your details to create an account and access your member benefits." 
                  : `Enter your details below to log in using ${authMethod === 'email' ? 'email' : 'phone'}.`
                }
              </p>

              {errorMsg && (
                <div className="auth-error-alert">
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {resetEmailSent && (
                <div className="auth-success-alert">
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <span>Reset link sent! Please check your email inbox.</span>
                </div>
              )}

              {/* Email / Password Form */}
              {authMethod === 'email' && (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="buyer-password" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, margin: 0 }}>
                        <Lock size={16} />
                        <span>Password</span>
                      </label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => { setAuthMethod('forgot'); setErrorMsg(''); setResetEmailSent(false); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-mute)', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <input 
                      id="buyer-password"
                      type="password" 
                      className="form-input" 
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      style={{ borderRadius: 0, marginTop: '8px' }}
                    />
                  </div>

                  {isSignUp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <input 
                        id="joinNewsletter"
                        type="checkbox" 
                        checked={joinNewsletter}
                        onChange={e => setJoinNewsletter(e.target.checked)}
                        disabled={loading}
                        style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                      />
                      <label htmlFor="joinNewsletter" style={{ cursor: 'pointer', fontSize: '13px', color: 'var(--text-charcoal)', fontWeight: 500, userSelect: 'none' }}>
                        Join our newsletter to receive updates & offers
                      </label>
                    </div>
                  )}

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
              )}

              {/* Phone Login Form */}
              {authMethod === 'phone' && (
                <div>
                  {!confirmationResult ? (
                    <form onSubmit={handlePhoneSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {isSignUp && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" htmlFor="buyer-name-phone" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <User size={16} />
                            <span>Full Name</span>
                          </label>
                          <input 
                            id="buyer-name-phone"
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

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="buyer-phone" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <Phone size={16} />
                          <span>Phone Number (with country code)</span>
                        </label>
                        <input 
                          id="buyer-phone"
                          type="tel" 
                          className="form-input" 
                          placeholder="e.g. +254712345678"
                          value={phoneVal}
                          onChange={e => setPhoneVal(e.target.value)}
                          required
                          disabled={loading}
                          style={{ borderRadius: 0 }}
                        />
                      </div>

                      <button 
                        id="sign-in-button"
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', marginTop: '8px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0 }}
                      >
                        {loading ? (
                          <>
                            <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
                            <span>Sending OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Verification Code</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="verification-code" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <Lock size={16} />
                          <span>Enter 6-Digit SMS OTP Code</span>
                        </label>
                        <input 
                          id="verification-code"
                          type="text" 
                          maxLength={6}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          className="form-input" 
                          placeholder="000000"
                          value={verificationCode}
                          onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          required
                          disabled={loading}
                          style={{ borderRadius: 0 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          type="submit" 
                          className="btn btn-primary"
                          disabled={loading || verificationCode.length !== 6}
                          style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0 }}
                        >
                          {loading ? (
                            <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
                          ) : (
                            <span>Verify Code</span>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setConfirmationResult(null)}
                          style={{ height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0, backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', border: 'none', padding: '0 20px' }}
                        >
                          Back
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Forgot Password Form */}
              {authMethod === 'forgot' && (
                <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="reset-email" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <Mail size={16} />
                      <span>Email Address</span>
                    </label>
                    <input 
                      id="reset-email"
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0 }}
                    >
                      {loading ? (
                        <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={18} />
                      ) : (
                        <span>Send Recovery Link</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setAuthMethod('email'); setErrorMsg(''); setResetEmailSent(false); }}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '48px', textTransform: 'uppercase', fontWeight: 600, fontSize: '14px', borderRadius: 0, backgroundColor: 'var(--color-soft-cloud)', color: 'var(--color-ink)', border: 'none' }}
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* Premium Google Sign-In Button */}
              {authMethod !== 'forgot' && (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline-soft)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-hairline-soft)' }} />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="google-btn"
                    disabled={loading}
                  >
                    <svg className="google-icon" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 1.84 14.93 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.85 3C6.31 7.55 8.94 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.11 2.73-2.37 3.58l3.68 2.85c2.15-1.98 3.74-4.9 3.74-8.53z" />
                      <path fill="#FBBC05" d="M5.35 14.73c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28l-3.85-3C.72 8.79 0 10.31 0 12s.72 3.21 1.5 4.82l3.85-3.09z" />
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.68-2.85c-1.02.68-2.33 1.09-4.28 1.09-3.06 0-5.69-2.51-6.65-5.46l-3.85 3C3.4 20.35 7.35 23 12 23z" />
                    </svg>
                    <span>Google Secure Login</span>
                  </button>
                </div>
              )}
            </div>
          )}
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
          color: #ffffff;
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
          margin-bottom: 24px;
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
        
        .auth-sub-tabs {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .sub-tab-btn {
          background: var(--color-soft-cloud);
          border: 1px solid var(--color-hairline-soft);
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          color: var(--color-ink);
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .sub-tab-btn.active {
          background: var(--color-ink);
          color: #ffffff;
          border-color: var(--color-ink);
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
        .auth-success-alert {
          display: flex;
          gap: 10px;
          align-items: center;
          color: var(--color-success); 
          background-color: #f4fbf7; 
          padding: 12px 16px; 
          border: 1px solid #e1f5eb;
          margin-bottom: 24px;
          font-weight: 600;
          font-size: 13px;
        }
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 48px;
          border: 1px solid var(--color-hairline-soft);
          background: #ffffff;
          color: var(--color-ink);
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }
        .google-btn:hover {
          background: var(--color-soft-cloud);
          border-color: var(--color-ink);
        }
        .google-icon {
          width: 18px;
          height: 18px;
        }
        #recaptcha-container {
          display: none;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
