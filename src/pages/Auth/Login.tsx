import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Kon geen link versturen. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-neutral-100 flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(0,0,255,0.12),transparent_42%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-300 bg-white/95 shadow-[0_22px_60px_rgba(45,48,54,0.16)] backdrop-blur-sm p-7 sm:p-9">
        <div className="mb-8 text-center">
          <img
            src="/archer-wordmark.png"
            alt="Archer"
            className="mx-auto h-12 w-auto"
          />
          <p className="mt-4 text-sm tracking-[0.18em] uppercase text-neutral-600">Archer Events</p>
          <h1 className="mt-2 text-3xl font-bold text-neutral-900">Log in met je e-mailadres</h1>
          <p className="mt-2 text-neutral-700">We sturen je een beveiligde link.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Link verzonden. Controleer je mailbox en open de link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="block text-sm font-semibold text-neutral-800 mb-1.5">E-mailadres</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="naam@bedrijf.com"
                className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition focus:ring-2 focus:ring-archer-blue/25 focus:border-archer-blue"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-archer-blue text-white px-4 py-3 font-semibold tracking-wide hover:bg-archer-dark transition disabled:opacity-60"
            >
              {loading ? 'Verzenden...' : 'Stuur link'}
            </button>
          </form>
        )}

        <div className="mt-7 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 h-12 flex items-center justify-center px-2">
            <img src="/archer-wordmark.png" alt="Archer Academy" className="max-h-5 w-auto object-contain" />
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 h-12 flex items-center justify-center px-2">
            <img src="/brands/invest-logo.svg" alt="Archer Invest" className="max-h-4 w-auto object-contain" />
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 h-12 flex items-center justify-center px-2">
            <img src="/brands/fund-logo.png" alt="Archer Investment Fund" className="max-h-6 w-auto object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
