import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

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
        // Register user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update user profile with name
        await updateProfile(userCredential.user, {
          displayName: fullName.trim()
        });
      } else {
        // Sign in user
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Authentication error:", error);
      let message = error.message || "An error occurred. Please try again.";
      if (error.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already registered. Please Sign In instead.";
      if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = "Incorrect email or password.";
      }
      if (error.code === 'auth/invalid-credential') {
        message = "Invalid credentials. Please verify your email and password.";
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '24px auto', padding: '0 16px' }}>
      <div className="card" style={{ padding: '32px 24px' }}>
        
        {/* Toggle tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '28px' }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: !isSignUp ? '3px solid var(--accent-primary)' : '3px solid transparent',
              fontWeight: 'bold',
              color: !isSignUp ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: isSignUp ? '3px solid var(--accent-primary)' : '3px solid transparent',
              fontWeight: 'bold',
              color: isSignUp ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            Create Account
          </button>
        </div>

        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', textAlign: 'center' }}>
          {isSignUp ? "Join GoldenCare Market" : "Welcome Back"}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '24px' }}>
          {isSignUp 
            ? "Create an account to save your checkout delivery details and track your orders." 
            : "Sign in with your account to proceed to checkout."
          }
        </p>

        {errorMsg && (
          <div 
            style={{ 
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              color: 'var(--warning-color)', 
              backgroundColor: 'var(--warning-light)', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--warning-color)',
              marginBottom: '20px',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name (Sign Up only) */}
          {isSignUp && (
            <div className="form-group">
              <label className="form-label" htmlFor="buyer-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} />
                <span>Full Name:</span>
              </label>
              <input 
                id="buyer-name"
                type="text" 
                className="form-input" 
                placeholder="Samuel Wambui"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Email input */}
          <div className="form-group">
            <label className="form-label" htmlFor="buyer-email" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} />
              <span>Email Address:</span>
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
            />
          </div>

          {/* Password input */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" htmlFor="buyer-password" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} />
              <span>Password:</span>
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
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', minHeight: '48px' }}
          >
            {loading ? (
              <>
                <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={20} />
                <span>Please wait...</span>
              </>
            ) : (
              <span>{isSignUp ? "Sign Up & Continue" : "Sign In & Continue"}</span>
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
