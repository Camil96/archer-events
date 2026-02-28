import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/common/Spinner';
import ErrorBanner from '@/components/common/ErrorBanner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Kon geen magic link versturen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-width-2xl max-w-lg bg-white border border-neutral-200 rounded-2xl shadow-lg p-8 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-500 font-semibold mb-2">Archer Events</p>
          <h1 className="text-2xl font-bold text-neutral-900">Log in met je e-mail</h1>
          <p className="text-sm text-neutral-600 mt-1">We sturen je een magic link.</p>
        </div>

        {error && <ErrorBanner message={error} />}
        {sent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 p-4 text-sm">
            Magic link verzonden! Check je mailbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-neutral-700">E-mailadres</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
                placeholder="jij@archer.finance"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 rounded-lg bg-archer-blue text-white font-medium hover:bg-archer-dark disabled:opacity-60"
            >
              {loading ? <Spinner size="sm" /> : 'Stuur magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
