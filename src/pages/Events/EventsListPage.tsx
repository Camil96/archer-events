import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import ErrorBanner from '@/components/common/ErrorBanner';
import { supabase } from '@/lib/supabase';
import { User, Event } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';

interface EventsListPageProps {
  user: User;
}

type StatusFilter = 'all' | 'gepland' | 'bevestigd' | 'afgerond' | 'geannuleerd';

const EventsListPage: React.FC<EventsListPageProps> = ({ user }) => {
  const permissions = usePermissions(user);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const loadEvents = async (searchValue = search) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('events').select('*').is('deleted_at', null).order('start_at', { ascending: true });
      if (searchValue) query = query.ilike('title', `%${searchValue}%`);
      if (brandFilter !== 'all') query = query.eq('brand', brandFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error: err } = await query;
      if (err) throw err;
      const scoped = ((data || []) as Event[]).filter((row) => permissions.canViewEventForBrand(row.brand));
      setEvents(scoped);
    } catch (err: any) {
      setError(err.message || 'Kon events niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandFilter, statusFilter]);

  const filteredEvents = useMemo(() => events, [events]);

  return (
    <AppShell user={user} onSearch={(q) => { setSearch(q); loadEvents(q); }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Beheer</p>
            <h1 className="text-2xl font-bold text-neutral-900">Events</h1>
          </div>
          {permissions.canCreateEvent && (
            <button
              onClick={() => navigate('/events/new')}
              className="px-4 py-2 rounded-lg bg-archer-blue text-white font-medium hover:bg-archer-dark"
            >
              + Nieuw event
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
          >
            <option value="all">Alle merken</option>
            <option value="Academy">Academy</option>
            <option value="Invest">Invest</option>
            <option value="Fund">Fund</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
          >
            <option value="all">Alle statussen</option>
            <option value="gepland">Gepland</option>
            <option value="bevestigd">Bevestigd</option>
            <option value="afgerond">Afgerond</option>
            <option value="geannuleerd">Geannuleerd</option>
          </select>
        </div>

        {error && <ErrorBanner message={error} onRetry={() => loadEvents()} />}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="Nog geen events"
            description="Maak een eerste event aan om te starten."
            action={
              <button
                className="mt-3 px-4 py-2 rounded-lg bg-archer-blue text-white disabled:opacity-60"
                onClick={() => navigate('/events/new')}
                disabled={!permissions.canCreateEvent}
              >
                Nieuw event
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEvents.map((ev) => (
              <article
                key={ev.id}
                className="bg-white border border-neutral-200 rounded-xl shadow-sm p-4 cursor-pointer hover:border-archer-blue"
                onClick={() => navigate(`/events/${ev.id}`)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900">{ev.title}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 capitalize">
                    {ev.status || 'gepland'}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1">{ev.location || 'Locatie volgt'}</p>
                <p className="text-sm text-neutral-600">
                  {new Date(ev.start_at).toLocaleString('nl-BE', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium px-2 py-1 rounded bg-neutral-50 border border-neutral-200">
                    {ev.brand}
                  </span>
                  {ev.expected_attendance ? (
                    <span className="text-xs text-neutral-500">👥 {ev.expected_attendance} verwacht</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default EventsListPage;
