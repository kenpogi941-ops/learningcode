'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../actions';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';

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
      setError('Invalid admin ID');
      return;
    }

    startTransition(async () => {
      const result = await login(password);
      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || 'Identity verification failed');
      }
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      backgroundImage: `
        radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.05) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.05) 0px, transparent 50%),
        url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2364748b' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
      `,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '32px',
        padding: '56px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Top Accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #0ea5e9, #6366f1)'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '72px', height: '72px', 
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)', 
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            border: '1px solid rgba(14, 165, 233, 0.1)'
          }}>
            <ShieldCheck size={36} color="#0ea5e9" strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Secure Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px', marginTop: '10px', fontWeight: 500 }}>
            Enter your credentials to access the console
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="form-group">
            <label style={{ color: '#0f172a', marginBottom: '8px', fontWeight: 600 }}>Administrator ID</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <User size={18} />
              </span>
              <input 
                type="text" 
                placeholder="admintech2003"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ 
                  width: '100%', 
                  padding: '14px 16px 14px 44px', 
                  borderRadius: '16px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  backgroundColor: '#f8fafc'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0ea5e9';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(14, 165, 233, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: '#0f172a', marginBottom: '8px', fontWeight: 600 }}>Secret Key</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Lock size={18} />
              </span>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ 
                  width: '100%', 
                  padding: '14px 16px 14px 44px', 
                  borderRadius: '16px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '15px',
                  transition: 'all 0.2s',
                  backgroundColor: '#f8fafc'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0ea5e9';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(14, 165, 233, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: '#fff1f2', color: '#e11d48', padding: '14px', 
              borderRadius: '16px', fontSize: '14px', textAlign: 'center',
              border: '1px solid rgba(225, 29, 72, 0.1)',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            style={{ 
              width: '100%', 
              height: '56px',
              background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if(!isPending) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(14, 165, 233, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if(!isPending) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(14, 165, 233, 0.3)';
              }
            }}
          >
            {isPending ? 'Verified Identity...' : (
              <>
                Sign In <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '40px', 
          paddingTop: '32px', 
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center' 
        }}>
          <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>
            &copy; 2026 CRM Toolkit. Authorized Personnel Only.
          </p>
        </div>
      </div>
    </div>
  );
}
