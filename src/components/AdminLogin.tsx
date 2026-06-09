import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

interface AdminLoginProps {
  superAdminUid: string;
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  superAdminUid,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check UID
      if (user.uid === superAdminUid) {
        onLoginSuccess();
      } else {
        // Sign out immediately if not the super admin
        await signOut(auth);
        setErrorMsg("Access Denied: You are not authorized as the Super Admin.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Invalid email or password. Please try again.";
      if (error.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "Incorrect email or password.";
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

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
              borderRadius: 'var(--radius-sm)',
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
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
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
