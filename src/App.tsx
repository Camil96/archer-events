import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import { User } from './types';
import SettingsLayout from './pages/Settings/SettingsLayout';
import Login from './pages/Auth/Login';

// Import existing vanilla JS components for backward compatibility
// These would need to be converted to React components later
// import { renderAppShell } from './appShell.js';

const AUTH_TIMEOUT_MS = 8000;

function mapUserProfile(profile: any, authUser: any): User {
  const now = new Date().toISOString();
  return {
    id: profile?.id || authUser?.id || '',
    created_at: profile?.created_at || now,
    updated_at: profile?.updated_at || now,
    email: profile?.email || authUser?.email || '',
    full_name: profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email || 'Gebruiker',
    avatar_url: profile?.avatar_url || null,
    role: profile?.role || 'viewer',
    brand_access: Array.isArray(profile?.brand_access)
      ? profile.brand_access
      : ['academy', 'invest', 'fund'],
    is_active: profile?.is_active ?? true,
    last_sign_in_at: profile?.last_sign_in_at || authUser?.last_sign_in_at || null,
    preferences: profile?.preferences || {
      language: 'nl',
      notifications: true,
      theme: 'light',
    },
  };
}

function withTimeout<T>(promise: Promise<T>, timeout = AUTH_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), timeout);
    }),
  ]);
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const result = await withTimeout(supabase.auth.getSession());
        const session = result?.data?.session ?? null;
        if (session?.user) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          setUser(mapUserProfile(profile, session.user));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            setUser(mapUserProfile(profile, session.user));
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUser(mapUserProfile(null, session.user));
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">Archer Events</h1>
          <p className="text-neutral-600">Bezig met laden...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <div className="min-h-screen bg-neutral-50">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/settings" replace /> : <Login />} />
          <Route path="/" element={<Navigate to={user ? '/settings' : '/login'} replace />} />
          <Route
            path="/settings/*"
            element={user ? <SettingsLayout user={user} /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to={user ? '/settings' : '/login'} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
