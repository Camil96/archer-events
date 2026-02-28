import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { mapProfile } from '@/lib/profile';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Login from '@/pages/Auth/Login';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import EventsListPage from '@/pages/Events/EventsListPage';
import EventDetailPage from '@/pages/Events/EventDetailPage';
import EventForm from '@/pages/Events/EventForm';
import CalendarPage from '@/pages/Events/CalendarPage';
import SettingsLayout from '@/pages/Settings/SettingsLayout';
import Spinner from '@/components/common/Spinner';
import FinanceOverview from '@/pages/Finance/FinanceOverview';
import MyProfile from '@/pages/Users/MyProfile';

const AUTH_TIMEOUT_MS = 8000;

async function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

function mapAuthFallback(authUser: any): User {
  return mapProfile({
    id: authUser.id,
    email: authUser.email || '',
    full_name: authUser.user_metadata?.full_name || authUser.email || 'Gebruiker',
    role: authUser.user_metadata?.role || 'viewer',
    brand_access: authUser.user_metadata?.brand_access || ['academy', 'invest', 'fund'],
    is_active: true,
    last_sign_in_at: authUser.last_sign_in_at || null,
    language_pref: 'nl',
  });
}

async function resolveUserFromSessionUser(sessionUser: any): Promise<User> {
  const profileResult = await withTimeout<any>(
    supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle(),
    AUTH_TIMEOUT_MS
  );

  if (profileResult?.data) {
    return mapProfile(profileResult.data);
  }

  return mapAuthFallback(sessionUser);
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        const sessionResult = await withTimeout<any>(supabase.auth.getSession(), AUTH_TIMEOUT_MS);
        const session = sessionResult?.data?.session ?? null;

        if (session?.user) {
          const resolvedUser = await resolveUserFromSessionUser(session.user);
          if (isMounted) setUser(resolvedUser);
        } else if (isMounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const resolvedUser = await resolveUserFromSessionUser(session.user);
          if (isMounted) setUser(resolvedUser);
        } else if (event === 'SIGNED_OUT' && isMounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Error handling auth state change:', error);
        if (isMounted && event === 'SIGNED_IN' && session?.user) {
          setUser(mapAuthFallback(session.user));
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage user={user!} />} />
                <Route path="/events" element={<EventsListPage user={user!} />} />
                <Route path="/events/new" element={<EventForm user={user!} />} />
                <Route path="/events/:id" element={<EventDetailPage user={user!} />} />
                <Route path="/events/:id/edit" element={<EventForm user={user!} />} />
                <Route path="/calendar" element={<CalendarPage user={user!} />} />
                <Route path="/finance" element={<FinanceOverview user={user!} />} />
                <Route path="/my-profile" element={<MyProfile user={user!} onUserUpdated={(updated) => setUser(updated)} />} />
                <Route path="/settings/*" element={<SettingsLayout user={user!} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
