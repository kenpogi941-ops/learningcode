'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../actions';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email !== 'admintech2003') {
      setError('Invalid email');
      return;
    }

    startTransition(async () => {
      const result = await login(password);
      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || 'Login failed');
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '20px'
    }}>
      <div className="panel" style={{ maxWidth: '450px', width: '100%', padding: '48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', height: '64px', backgroundColor: 'rgba(14, 165, 233, 0.1)', 
            borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={32} color="#0ea5e9" />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>Admin Access</h1>
          <p style={{ color: '#64748b', fontSize: '15px', marginTop: '8px' }}>Please sign in to manage your CRM checklists</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="text" 
              placeholder="admintech2003"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ 
              backgroundColor: '#fff1f2', color: '#e11d48', padding: '12px', 
              borderRadius: '12px', fontSize: '14px', textAlign: 'center',
              border: '1px solid #fda4af'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn primary" 
            disabled={isPending}
            style={{ width: '100%', height: '52px' }}
          >
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '32px' }}>
          &copy; 2026 CRM Toolkit Security System
        </p>
      </div>
    </div>
  );
}
