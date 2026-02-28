import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import ErrorBanner from '@/components/common/ErrorBanner';
import EmptyState from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';
import { User, Event } from '@/types';
import { Download, Link2 } from 'lucide-react';
import { buildIcsFile, googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar';

interface EventDetailPageProps {
  user: User;
}

const EventDetailPage: React.FC<EventDetailPageProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.from('events').select('*').eq('id', id).single();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setEvent(data as Event);
    setLoading(false);
  };

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (status: Event['status']) => {
    if (!id) return;
    setSaving(true);
    try {
      const { error: err, data } = await supabase.from('events').update({ status }).eq('id', id).select().single();
      if (err) throw err;
      setEvent(data as Event);
    } catch (err: any) {
      setError(err.message || 'Kon status niet wijzigen');
    } finally {
      setSaving(false);
    }
  };

  const downloadIcs = () => {
    if (!event) return;
    const ics = buildIcsFile(event);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title || 'event'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppShell user={user}>
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell user={user}>
        <ErrorBanner message={error} onRetry={loadEvent} />
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell user={user}>
        <EmptyState title="Event niet gevonden" description="Het event bestaat niet of is verwijderd." />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Event detail</p>
            <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
              onClick={() => navigate(`/events/${id}/edit`)}
            >
              Bewerken
            </button>
            <button
              className="px-3 py-2 text-sm rounded-lg bg-archer-blue text-white hover:bg-archer-dark"
              onClick={downloadIcs}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Voeg toe aan agenda
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <section className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Detail label="Status" value={event.status || 'gepland'} />
                <Detail
                  label="Datum"
                  value={new Date(event.start_at).toLocaleString('nl-BE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
                <Detail label="Locatie" value={event.location || 'Nog te bepalen'} />
                <Detail label="Brand" value={event.brand} />
                <Detail label="Capaciteit" value={event.capacity?.toString() || 'n.v.t.'} />
                <Detail label="Verwacht" value={event.expected_attendance?.toString() || 'n.v.t.'} />
              </dl>
              {event.description && <p className="mt-3 text-sm text-neutral-700">{event.description}</p>}
            </section>

            <section className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Agenda links</h3>
              <div className="flex flex-wrap gap-3">
                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Google Calendar
                </a>
                <a
                  href={outlookCalendarUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Outlook
                </a>
                <button
                  onClick={downloadIcs}
                  className="inline-flex items-center px-3 py-2 text-sm rounded-lg bg-archer-blue text-white hover:bg-archer-dark"
                >
                  <Download className="w-4 h-4 mr-2" />
                  ICS downloaden
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">Wijzig status</h3>
              <div className="grid grid-cols-2 gap-2">
                {['gepland', 'bevestigd', 'afgerond', 'geannuleerd'].map((s) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => updateStatus(s as Event['status'])}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      event.status === s ? 'border-archer-blue bg-archer-blue text-white' : 'border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
    <p className="text-sm text-neutral-900 mt-1">{value}</p>
  </div>
);

export default EventDetailPage;
