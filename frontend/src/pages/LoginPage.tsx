import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { YatraSaarthiLogo } from '../components/branding/YatraSaarthiLogo';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = isRegister ? '/api/v1/auth/register' : '/api/v1/auth/login';
    const payload = isRegister
      ? { email, password, full_name: fullName }
      : { email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Authentication failed');
      }

      const data = await res.json();
      setAuth(data.access_token, data.user);
      navigate('/app');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-soft flex items-center justify-center p-4 safe-bottom select-none">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-nav-floating border border-border-clean space-y-5">
        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link to="/" className="inline-block transition-opacity hover:opacity-90">
            <YatraSaarthiLogo variant="auth" height={90} className="justify-center" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight pt-1">
            {isRegister ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-xs text-ink-body">
            {isRegister
              ? 'Register to save custom routes and trip history.'
              : 'Sign in to access your navigation history and preferences.'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5 pl-1">Full name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-ink-mute absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas-soft rounded-full border border-border-clean text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-black focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink mb-1.5 pl-1">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-mute absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-canvas-soft rounded-full border border-border-clean text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1.5 pl-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-mute absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-canvas-soft rounded-full border border-border-clean text-sm text-ink placeholder:text-ink-mute focus:outline-none focus:border-black focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-2"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Sign in'}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-border-clean">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-ink font-medium hover:underline cursor-pointer"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
