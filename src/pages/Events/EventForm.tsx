import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import ErrorBanner from '@/components/common/ErrorBanner';
import { supabase } from '@/lib/supabase';
import { User, Event } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';

interface EventFormProps {
  user: User;
}

const EventForm: React.FC<EventFormProps> = ({ user }) => {
  const permissions = usePermissions(user);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'new');
  const [payload, setPayload] = useState<Partial<Event>>({
    title: '',
    brand: 'Academy',
    status: 'gepland',
    start_at: '',
    end_at: '',
    location: '',
    capacity: 0,
  });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await supabase.from('events').select('*').eq('id', id).single();
      if (err) setError(err.message);
      else setPayload(data as Event);
      setLoading(false);
    };
    load();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!payload.title || !payload.start_at) throw new Error('Titel en startdatum zijn verplicht.');
      if (isEdit && id) {
        const { error: err } = await supabase.from('events').update(payload).eq('id', id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('events').insert([{ ...payload, timezone: 'Europe/Brussels' }]);
        if (err) throw err;
      }
      navigate('/events');
    } catch (err: any) {
      setError(err.message || 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
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

  const canAccess = isEdit ? permissions.canEditEvent : permissions.canCreateEvent;
  if (!canAccess) {
    return (
      <AppShell user={user}>
        <ErrorBanner message="Je hebt geen rechten voor deze actie." />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-neutral-500">{isEdit ? 'Event bewerken' : 'Nieuw event'}</p>
          <h1 className="text-2xl font-bold text-neutral-900">{payload.title || 'Event'}</h1>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm text-neutral-700">
              Titel
              <input
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                value={payload.title || ''}
                onChange={(e) => setPayload((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-neutral-700">
              Brand
              <select
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                value={payload.brand || 'Academy'}
                onChange={(e) => setPayload((p) => ({ ...p, brand: e.target.value as Event['brand'] }))}
              >
                <option value="Academy">Academy</option>
                <option value="Invest">Invest</option>
                <option value="Fund">Fund</option>
              </select>
            </label>
            <label className="block text-sm text-neutral-700">
              Start
              <input
                type="datetime-local"
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                value={payload.start_at?.slice(0, 16) || ''}
                onChange={(e) => setPayload((p) => ({ ...p, start_at: e.target.value }))}
                required
              />
            </label>
            <label className="block text-sm text-neutral-700">
              Eind
              <input
                type="datetime-local"
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                value={payload.end_at?.slice(0, 16) || ''}
                onChange={(e) => setPayload((p) => ({ ...p, end_at: e.target.value }))}
              />
            </label>
          </div>

          <label className="block text-sm text-neutral-700">
            Locatie
            <input
              className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
              value={payload.location || ''}
              onChange={(e) => setPayload((p) => ({ ...p, location: e.target.value }))}
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm text-neutral-700">
              Capaciteit
              <input
                type="number"
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                value={payload.capacity ?? 0}
                onChange={(e) => setPayload((p) => ({ ...p, capacity: Number(e.target.value) }))}
              />
            </label>
            <label className="block text-sm text-neutral-700">
              Verwacht
              <input
                type="number"
                className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                value={payload.expected_attendance ?? 0}
                onChange={(e) => setPayload((p) => ({ ...p, expected_attendance: Number(e.target.value) }))}
              />
            </label>
          </div>

          <label className="block text-sm text-neutral-700">
            Notities
            <textarea
              className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
              rows={4}
              value={payload.notes_internal || ''}
              onChange={(e) => setPayload((p) => ({ ...p, notes_internal: e.target.value }))}
            />
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50"
            >
              Annuleer
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-archer-blue text-white font-medium hover:bg-archer-dark disabled:opacity-60"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export default EventForm;
