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
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          if (data) setUser(mapProfile(data));
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        if (data) setUser(mapProfile(data));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => authListener?.subscription.unsubscribe();
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
                <Route
                  path="/settings/*"
                  element={
                    <SettingsLayoutWrapper user={user!} />
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

const SettingsLayoutWrapper: React.FC<{ user: User }> = ({ user }) => {
  return (
    <AppShell user={user} hideNavExtras>
      <SettingsLayout user={user} />
    </AppShell>
  );
};

export default App;
