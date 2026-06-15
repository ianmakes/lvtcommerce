import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut, getMultiFactorResolver, TotpMultiFactorGenerator } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { getBuyerProfile } from '../db';
import * as OTPAuth from 'otpauth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

interface AdminLoginProps {
  superAdminUid: string;
  onLoginSuccess: () => void;
}

const hashRecoveryCode = async (code: string) => {
  const msgBuffer = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const AdminLogin: React.FC<AdminLoginProps> = ({
  superAdminUid,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // MFA Challenge State
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [totpInput, setTotpInput] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaChallengeType, setMfaChallengeType] = useState<'totp' | 'recovery'>('totp');

  const checkAdminAccess = async (user: any) => {
    if (user.uid === superAdminUid) {
      onLoginSuccess();
    } else {
      const profile = await getBuyerProfile(user.uid);
      if (profile && (profile.role === 'admin' || profile.role === 'shop_manager' || profile.role === 'contributor')) {
        onLoginSuccess();
      } else {
        // Sign out immediately if not authorized
        await signOut(auth);
        setErrorMsg("Access Denied: You do not have permissions to access the Admin Dashboard.");
        setShowMfaChallenge(false);
        setMfaResolver(null);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check UID / Role
      await checkAdminAccess(user);
    } catch (error) {
      console.error("Login error:", error);
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error as any);
        setMfaResolver(resolver);
        setShowMfaChallenge(true);
        setMfaChallengeType('totp');
        return;
      }
      let message = "Invalid email or password. Please try again.";
      if (firebaseError.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
        message = "Incorrect email or password.";
      }
      setErrorMsg(message);
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
      const userCredential = await mfaResolver.resolveSignIn(assertion);
      const user = userCredential.user;

      await checkAdminAccess(user);
    } catch (error: any) {
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
      // 1. Find user UID by email query
      const usersQuery = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(usersQuery);
      if (querySnapshot.empty) {
        throw new Error("User profile not found.");
      }
      const userDoc = querySnapshot.docs[0];
      const uid = userDoc.id;

      // 2. Fetch the security doc
      const secRef = doc(db, "users", uid, "security", "recovery");
      const secSnap = await getDoc(secRef);
      if (!secSnap.exists()) {
        throw new Error("No 2FA recovery options set up for this user.");
      }

      const { recoveryCodes, totpSecretKey } = secSnap.data() as { recoveryCodes: string[], totpSecretKey: string };
      if (!recoveryCodes || !totpSecretKey) {
        throw new Error("Recovery codes or secret key missing from configuration.");
      }

      // 3. Hash the input recovery code
      const inputHashed = await hashRecoveryCode(recoveryInput.trim());

      // 4. Compare with stored hashes
      if (!recoveryCodes.includes(inputHashed)) {
        throw new Error("Invalid recovery code. Please check and try again.");
      }

      // 5. Generate TOTP code using otpauth
      const totp = new OTPAuth.TOTP({
        secret: totpSecretKey
      });
      const generatedCode = totp.generate();

      // 6. Sign in
      const hint = mfaResolver.hints[0];
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, generatedCode);
      const userCredential = await mfaResolver.resolveSignIn(assertion);
      const user = userCredential.user;

      // 7. Consume the code
      const updatedCodes = recoveryCodes.filter(c => c !== inputHashed);
      await updateDoc(secRef, {
        recoveryCodes: updatedCodes
      });

      await checkAdminAccess(user);
    } catch (error: any) {
      console.error("MFA Recovery Code verification failed:", error);
      setMfaError(error.message || "Failed to verify recovery code. Please try again.");
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

  if (showMfaChallenge) {
    return (
      <div style={{ maxWidth: '450px', margin: '80px auto', padding: '0 24px' }}>
        <div className="card" style={{ padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent-light)', 
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Two-Factor Authentication</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              {mfaChallengeType === 'totp' 
                ? "Please enter the 6-digit code from your authenticator app." 
                : "Please enter one of your 8-character recovery codes."}
            </p>
          </div>

          {mfaError && (
            <div 
              style={{ 
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                color: 'var(--warning-color)', 
                backgroundColor: 'var(--warning-light)', 
                padding: '16px', 
                borderRadius: 'var(--radius-none)',
                border: '1px solid var(--warning-color)',
                marginBottom: '24px',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}
            >
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <span>{mfaError}</span>
            </div>
          )}

          {mfaChallengeType === 'totp' ? (
            <form onSubmit={handleVerifyTotp}>
              <div className="form-group">
                <label className="form-label" htmlFor="mfa-totp" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} />
                  <span>Verification Code:</span>
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
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-full"
                  disabled={mfaLoading || totpInput.length !== 6}
                  style={{ borderRadius: 'var(--radius-none)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
                >
                  {mfaLoading ? (
                    <>
                      <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Code</span>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleCancelMfa}
                  disabled={mfaLoading}
                  style={{ borderRadius: 'var(--radius-none)' }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => { setMfaChallengeType('recovery'); setMfaError(''); }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--color-ink)', 
                    textDecoration: 'underline', 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500
                  }}
                >
                  Lost your device? Use a recovery code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyRecoveryCode}>
              <div className="form-group">
                <label className="form-label" htmlFor="mfa-recovery" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={18} />
                  <span>Recovery Code:</span>
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
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-full"
                  disabled={mfaLoading || recoveryInput.trim().length === 0}
                  style={{ borderRadius: 'var(--radius-none)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
                >
                  {mfaLoading ? (
                    <>
                      <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Recovery Code</span>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleCancelMfa}
                  disabled={mfaLoading}
                  style={{ borderRadius: 'var(--radius-none)' }}
                >
                  Cancel
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => { setMfaChallengeType('totp'); setMfaError(''); }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--color-ink)', 
                    textDecoration: 'underline', 
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 500
                  }}
                >
                  Use authenticator app code instead
                </button>
              </div>
            </form>
          )}
        </div>
        <style>{`
          @keyframes spin {
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '450px', margin: '80px auto', padding: '0 24px' }}>
      <div className="card" style={{ padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--accent-light)', 
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Shop Manager Login</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Only authorized administrators can access this section.
          </p>
        </div>

        {errorMsg && (
          <div 
            style={{ 
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              color: 'var(--warning-color)', 
              backgroundColor: 'var(--warning-light)', 
              padding: '16px', 
              borderRadius: 'var(--radius-none)',
              border: '1px solid var(--warning-color)',
              marginBottom: '24px',
              fontWeight: 'bold',
              fontSize: '0.95rem'
            }}
          >
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email input */}
          <div className="form-group">
            <label className="form-label" htmlFor="admin-email" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} />
              <span>Email Address:</span>
            </label>
            <input 
              id="admin-email"
              type="email" 
              className="form-input" 
              placeholder="admin@lvtcommerce.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Password input */}
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label className="form-label" htmlFor="admin-password" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} />
              <span>Password:</span>
            </label>
            <input 
              id="admin-password"
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ borderRadius: 'var(--radius-none)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
          >
            {loading ? (
              <>
                <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
