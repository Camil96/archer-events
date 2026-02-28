import React, { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import ErrorBanner from '@/components/common/ErrorBanner';
import { supabase } from '@/lib/supabase';
import { User, Event } from '@/types';

interface DashboardPageProps {
  user: User;
}

interface Stats {
  totalEvents: number;
  upcoming7: number;
  confirmedParticipants: number;
  openTasks: number;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<Event[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const inSeven = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: totalEventsRaw = 0 } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);
      const { count: upcoming7Raw = 0 } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('start_at', now.toISOString())
        .lte('start_at', inSeven)
        .is('deleted_at', null);
      const { count: confirmedParticipantsRaw = 0 } = await supabase
        .from('event_participants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'confirmed');
      const { count: openTasksRaw = 0 } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'done')
        .is('deleted_at', null);

      const { data: upcomingEvents = [], error: upcomingErr } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .gte('start_at', now.toISOString())
        .lt('start_at', inSeven)
        .order('start_at', { ascending: true })
        .limit(6);
      if (upcomingErr) throw upcomingErr;

      setStats({
        totalEvents: totalEventsRaw ?? 0,
        upcoming7: upcoming7Raw ?? 0,
        confirmedParticipants: confirmedParticipantsRaw ?? 0,
        openTasks: openTasksRaw ?? 0,
      });
      setUpcoming(upcomingEvents || []);
    } catch (err: any) {
      setError(err.message || 'Kon dashboard niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Overzicht</p>
            <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          </div>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadData} />}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Events totaal" value={stats.totalEvents} />
            <StatCard label="Komende 7 dagen" value={stats.upcoming7} />
            <StatCard label="Bevestigde deelnemers" value={stats.confirmedParticipants} />
            <StatCard label="Open taken" value={stats.openTasks} />
          </div>
        )}

        {!loading && (
          <section className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900">Komende events</h2>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState title="Geen events komende week" description="Plan een nieuw event om te starten." />
            ) : (
              <ul className="divide-y divide-neutral-200">
                {upcoming.map((ev) => (
                  <li key={ev.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900">{ev.title}</p>
                      <p className="text-sm text-neutral-600">
                        {new Date(ev.start_at).toLocaleString('nl-BE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {ev.location || 'Locatie volgt'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">{ev.brand}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4">
    <p className="text-sm text-neutral-500">{label}</p>
    <p className="text-3xl font-bold text-neutral-900 mt-2">{value}</p>
  </div>
);

export default DashboardPage;
