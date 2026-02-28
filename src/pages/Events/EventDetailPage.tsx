import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Link2, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import ErrorBanner from '@/components/common/ErrorBanner';
import EmptyState from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';
import { CateringItem, Event, EventBudget, EventCatering, User } from '@/types';
import { buildIcsFile, googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar';
import { calcCateringLine, computeBudgetSummary, formatEuro, toNumber } from '@/lib/finance';
import { usePermissions } from '@/hooks/usePermissions';

interface EventDetailPageProps {
  user: User;
}

type TabId = 'details' | 'catering' | 'financial' | 'agenda';

type CateringLineState = {
  id?: string;
  catering_item_id: string;
  quantity: number;
  unit_price_override: number | null;
  notes: string;
};

const emptyBudget = (eventId: string): EventBudget => ({
  event_id: eventId,
  location_cost: 0,
  speaker_costs: [],
  material_costs: [],
  marketing_costs: [],
  other_costs: [],
  ticket_price: 0,
  income_override: null,
  notes: '',
});

const EventDetailPage: React.FC<EventDetailPageProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = usePermissions(user);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const [cateringItems, setCateringItems] = useState<CateringItem[]>([]);
  const [cateringLines, setCateringLines] = useState<CateringLineState[]>([]);
  const [savingCatering, setSavingCatering] = useState(false);

  const [budget, setBudget] = useState<EventBudget | null>(null);
  const [savingBudget, setSavingBudget] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: eventRow, error: eventError }, { data: itemRows, error: itemsError }] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('catering_items').select('*').eq('is_active', true).order('name', { ascending: true }),
      ]);
      if (eventError) throw eventError;
      if (itemsError) throw itemsError;

      const loadedEvent = eventRow as Event;
      setEvent(loadedEvent);
      setCateringItems((itemRows || []) as CateringItem[]);

      const [{ data: cateringRows, error: cateringError }, { data: budgetRow, error: budgetError }, { data: participantsRows, error: participantsError }] = await Promise.all([
        supabase.from('event_catering').select('*').eq('event_id', id),
        supabase.from('event_budget').select('*').eq('event_id', id).maybeSingle(),
        supabase.from('event_participants').select('id').eq('event_id', id),
      ]);
      if (cateringError) throw cateringError;
      if (budgetError) throw budgetError;
      if (participantsError) throw participantsError;

      setParticipantCount((participantsRows || []).length || toNumber(loadedEvent.expected_attendance) || 0);
      setCateringLines(((cateringRows || []) as EventCatering[]).map((row) => ({
        id: row.id,
        catering_item_id: row.catering_item_id,
        quantity: toNumber(row.quantity) || 1,
        unit_price_override: row.unit_price_override !== null && row.unit_price_override !== undefined ? toNumber(row.unit_price_override) : null,
        notes: row.notes || '',
      })));

      if (budgetRow) {
        const typed = budgetRow as EventBudget;
        setBudget({
          ...typed,
          event_id: id,
          location_cost: toNumber(typed.location_cost),
          speaker_costs: Array.isArray(typed.speaker_costs) ? typed.speaker_costs : [],
          material_costs: Array.isArray(typed.material_costs) ? typed.material_costs : [],
          marketing_costs: Array.isArray(typed.marketing_costs) ? typed.marketing_costs : [],
          other_costs: Array.isArray(typed.other_costs) ? typed.other_costs : [],
          ticket_price: toNumber(typed.ticket_price),
          income_override: typed.income_override !== null && typed.income_override !== undefined ? toNumber(typed.income_override) : null,
          notes: typed.notes || '',
        });
      } else {
        setBudget(emptyBudget(id));
      }
    } catch (err: any) {
      setError(err.message || 'Kon eventdetails niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  const cateringMap = useMemo(() => {
    const map = new Map<string, CateringItem>();
    cateringItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [cateringItems]);

  const cateringTotals = useMemo(() => {
    const lineResults = cateringLines.map((line) => {
      const item = cateringMap.get(line.catering_item_id);
      const unitPrice = line.unit_price_override !== null && line.unit_price_override !== undefined
        ? toNumber(line.unit_price_override)
        : toNumber(item?.unit_price);
      const vatRate = toNumber(item?.vat_rate);
      const calc = calcCateringLine({
        quantity: toNumber(line.quantity),
        unitPrice,
        vatRate,
      });
      return {
        ...line,
        item,
        unitPrice,
        vatRate,
        ...calc,
      };
    });
    const totalIncl = lineResults.reduce((sum, row) => sum + row.totalIncl, 0);
    const totalExcl = lineResults.reduce((sum, row) => sum + row.subtotalExcl, 0);
    const totalVat = lineResults.reduce((sum, row) => sum + row.vatAmount, 0);
    const perParticipant = participantCount > 0 ? totalIncl / participantCount : 0;
    return { lineResults, totalIncl, totalExcl, totalVat, perParticipant };
  }, [cateringLines, cateringMap, participantCount]);

  const budgetSummary = useMemo(() => {
    if (!budget) return null;
    return computeBudgetSummary({
      budget,
      participantCount,
      cateringTotalIncl: cateringTotals.totalIncl,
    });
  }, [budget, participantCount, cateringTotals.totalIncl]);

  const updateStatus = async (status: Event['status']) => {
    if (!id || !permissions.canEditEvent) return;
    setSavingStatus(true);
    try {
      const { error: updateError, data } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      setEvent(data as Event);
      toast.success('Status bijgewerkt.');
    } catch (err: any) {
      setError(err.message || 'Kon status niet wijzigen.');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveCatering = async () => {
    if (!id || !permissions.canEditFinance) return;
    setSavingCatering(true);
    try {
      const sanitized = cateringLines
        .filter((line) => line.catering_item_id)
        .map((line) => ({
          event_id: id,
          catering_item_id: line.catering_item_id,
          quantity: Math.max(1, toNumber(line.quantity)),
          unit_price_override: line.unit_price_override !== null && line.unit_price_override !== undefined ? toNumber(line.unit_price_override) : null,
          notes: line.notes || null,
        }));

      const { error: deleteError } = await supabase.from('event_catering').delete().eq('event_id', id);
      if (deleteError) throw deleteError;

      if (sanitized.length > 0) {
        const { error: insertError } = await supabase.from('event_catering').insert(sanitized);
        if (insertError) throw insertError;
      }
      toast.success('Cateringgegevens opgeslagen.');
      await loadEvent();
    } catch (err: any) {
      toast.error(err.message || 'Opslaan catering mislukt.');
    } finally {
      setSavingCatering(false);
    }
  };

  const saveBudget = async () => {
    if (!id || !budget || !permissions.canEditFinance) return;
    setSavingBudget(true);
    try {
      const payload = {
        event_id: id,
        location_cost: toNumber(budget.location_cost),
        speaker_costs: budget.speaker_costs || [],
        material_costs: budget.material_costs || [],
        marketing_costs: budget.marketing_costs || [],
        other_costs: budget.other_costs || [],
        ticket_price: toNumber(budget.ticket_price),
        income_override: budget.income_override !== null && budget.income_override !== undefined ? toNumber(budget.income_override) : null,
        notes: budget.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { error: upsertError } = await supabase
        .from('event_budget')
        .upsert(payload, { onConflict: 'event_id' });
      if (upsertError) throw upsertError;
      toast.success('Budget opgeslagen.');
      await loadEvent();
    } catch (err: any) {
      toast.error(err.message || 'Opslaan budget mislukt.');
    } finally {
      setSavingBudget(false);
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
        <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
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

  const tabs: Array<{ id: TabId; label: string; visible: boolean }> = [
    { id: 'details', label: 'Details', visible: true },
    { id: 'catering', label: 'Catering & Budget', visible: permissions.canViewFinance },
    { id: 'financial', label: 'Financieel Overzicht', visible: permissions.canViewFinance },
    { id: 'agenda', label: 'Agenda', visible: true },
  ];

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500">Event detail</p>
            <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.canEditEvent && (
              <button
                className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                onClick={() => navigate(`/events/${id}/edit`)}
              >
                Bewerken
              </button>
            )}
            <button
              className="px-3 py-2 text-sm rounded-lg bg-archer-blue text-white hover:bg-archer-dark"
              onClick={downloadIcs}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Toevoegen aan agenda
            </button>
          </div>
        </div>

        <div className="border-b border-neutral-200">
          <nav className="flex flex-wrap gap-2 pb-2">
            {tabs.filter((tab) => tab.visible).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm ${
                  activeTab === tab.id ? 'bg-archer-blue text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-4">
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
            </div>

            <section className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2">Wijzig status</h3>
              <div className="grid grid-cols-2 gap-2">
                {['gepland', 'bevestigd', 'afgerond', 'geannuleerd'].map((status) => (
                  <button
                    key={status}
                    disabled={savingStatus || !permissions.canEditEvent}
                    onClick={() => updateStatus(status as Event['status'])}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      event.status === status ? 'border-archer-blue bg-archer-blue text-white' : 'border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              {!permissions.canEditEvent && <p className="mt-2 text-xs text-neutral-500">Je hebt geen rechten om status te wijzigen.</p>}
            </section>
          </div>
        )}

        {activeTab === 'catering' && (
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-neutral-900">Catering koppelen aan event</h3>
                {permissions.canEditFinance && (
                  <button
                    onClick={() => setCateringLines((prev) => [...prev, { catering_item_id: '', quantity: 1, unit_price_override: null, notes: '' }])}
                    className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Optie toevoegen
                  </button>
                )}
              </div>

              {cateringLines.length === 0 ? (
                <EmptyState title="Nog geen cateringopties gekoppeld" description="Voeg cateringopties toe om kostberekeningen te starten." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">Optie</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">Aantal</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">Eenheidsprijs</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">Subtotaal excl.</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">BTW</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">Totaal incl.</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">Notities</th>
                        {permissions.canEditFinance && <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500 uppercase">Acties</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {cateringTotals.lineResults.map((line, index) => (
                        <tr key={`${line.id || 'new'}-${index}`} className="border-b border-neutral-100">
                          <td className="px-3 py-2">
                            <select
                              value={line.catering_item_id}
                              disabled={!permissions.canEditFinance}
                              onChange={(e) => setCateringLines((prev) => prev.map((row, i) => i === index ? { ...row, catering_item_id: e.target.value } : row))}
                              className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                            >
                              <option value="">Kies cateringoptie</option>
                              {cateringItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({formatEuro(toNumber(item.unit_price))})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              disabled={!permissions.canEditFinance}
                              onChange={(e) => setCateringLines((prev) => prev.map((row, i) => i === index ? { ...row, quantity: toNumber(e.target.value) } : row))}
                              className="w-24 px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unit_price_override ?? line.unitPrice}
                              disabled={!permissions.canEditFinance}
                              onChange={(e) => setCateringLines((prev) => prev.map((row, i) => i === index ? { ...row, unit_price_override: toNumber(e.target.value) } : row))}
                              className="w-28 px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm text-neutral-700">{formatEuro(line.subtotalExcl)}</td>
                          <td className="px-3 py-2 text-sm text-neutral-700">{formatEuro(line.vatAmount)} ({line.vatRate}%)</td>
                          <td className="px-3 py-2 text-sm font-medium text-neutral-900">{formatEuro(line.totalIncl)}</td>
                          <td className="px-3 py-2">
                            <input
                              value={line.notes}
                              disabled={!permissions.canEditFinance}
                              onChange={(e) => setCateringLines((prev) => prev.map((row, i) => i === index ? { ...row, notes: e.target.value } : row))}
                              className="w-full px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                            />
                          </td>
                          {permissions.canEditFinance && (
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => setCateringLines((prev) => prev.filter((_, i) => i !== index))}
                                className="inline-flex items-center px-2 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Verwijderen
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <MetricCard label="Totaal excl. BTW" value={formatEuro(cateringTotals.totalExcl)} />
                <MetricCard label="BTW totaal" value={formatEuro(cateringTotals.totalVat)} />
                <MetricCard label="Totaal catering event" value={formatEuro(cateringTotals.totalIncl)} />
                <MetricCard label="Catering per deelnemer" value={formatEuro(cateringTotals.perParticipant)} />
              </div>

              {permissions.canEditFinance && (
                <button
                  disabled={savingCatering}
                  onClick={saveCatering}
                  className="mt-4 inline-flex items-center px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark disabled:opacity-60"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingCatering ? 'Opslaan...' : 'Catering opslaan'}
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'financial' && budget && budgetSummary && (
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">Financieel Overzicht</h3>
              <label className="block">
                <span className="text-sm text-neutral-700">Locatiekost (forfait)</span>
                <input
                  type="number"
                  step="0.01"
                  disabled={!permissions.canEditFinance}
                  value={budget.location_cost}
                  onChange={(e) => setBudget((prev) => prev ? { ...prev, location_cost: toNumber(e.target.value) } : prev)}
                  className="mt-1 w-full md:w-64 px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </label>

              <ListSection
                title="Sprekerkosten"
                rows={budget.speaker_costs}
                disabled={!permissions.canEditFinance}
                onAdd={() => setBudget((prev) => prev ? { ...prev, speaker_costs: [...prev.speaker_costs, { name: '', honorarium: 0, travel_cost: 0 }] } : prev)}
                onRemove={(index) => setBudget((prev) => prev ? { ...prev, speaker_costs: prev.speaker_costs.filter((_, i) => i !== index) } : prev)}
                renderRow={(row, index) => (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      value={row.name}
                      onChange={(e) => setBudget((prev) => prev ? {
                        ...prev,
                        speaker_costs: prev.speaker_costs.map((item, i) => i === index ? { ...item, name: e.target.value } : item),
                      } : prev)}
                      placeholder="Naam spreker"
                      className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                      disabled={!permissions.canEditFinance}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={row.honorarium}
                      onChange={(e) => setBudget((prev) => prev ? {
                        ...prev,
                        speaker_costs: prev.speaker_costs.map((item, i) => i === index ? { ...item, honorarium: toNumber(e.target.value) } : item),
                      } : prev)}
                      placeholder="Honorarium"
                      className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                      disabled={!permissions.canEditFinance}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={row.travel_cost}
                      onChange={(e) => setBudget((prev) => prev ? {
                        ...prev,
                        speaker_costs: prev.speaker_costs.map((item, i) => i === index ? { ...item, travel_cost: toNumber(e.target.value) } : item),
                      } : prev)}
                      placeholder="Reiskosten"
                      className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                      disabled={!permissions.canEditFinance}
                    />
                  </div>
                )}
              />

              <SimpleCostSection
                title="Materiaalkosten"
                rows={budget.material_costs}
                disabled={!permissions.canEditFinance}
                onChange={(rows) => setBudget((prev) => prev ? { ...prev, material_costs: rows } : prev)}
              />
              <SimpleCostSection
                title="Marketingkosten"
                rows={budget.marketing_costs}
                disabled={!permissions.canEditFinance}
                onChange={(rows) => setBudget((prev) => prev ? { ...prev, marketing_costs: rows } : prev)}
              />
              <SimpleCostSection
                title="Overige kosten"
                rows={budget.other_costs}
                disabled={!permissions.canEditFinance}
                onChange={(rows) => setBudget((prev) => prev ? { ...prev, other_costs: rows } : prev)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-neutral-700">Ticketprijs</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!permissions.canEditFinance}
                    value={budget.ticket_price}
                    onChange={(e) => setBudget((prev) => prev ? { ...prev, ticket_price: toNumber(e.target.value) } : prev)}
                    className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-neutral-700">Forfait inkomst (optioneel)</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!permissions.canEditFinance}
                    value={budget.income_override ?? ''}
                    onChange={(e) => setBudget((prev) => prev ? { ...prev, income_override: e.target.value ? toNumber(e.target.value) : null } : prev)}
                    className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-neutral-700">Notities</span>
                <textarea
                  rows={3}
                  disabled={!permissions.canEditFinance}
                  value={budget.notes || ''}
                  onChange={(e) => setBudget((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MetricCard label="Totale kosten" value={formatEuro(budgetSummary.totalCosts)} />
                <MetricCard label="Totale inkomsten" value={formatEuro(budgetSummary.totalIncome)} />
                <MetricCard label="Netto resultaat" value={formatEuro(budgetSummary.net)} />
                <MetricCard label="Break-even deelnemers" value={budgetSummary.breakEvenParticipants ? budgetSummary.breakEvenParticipants.toFixed(2) : '-'} />
                <MetricCard label="Kostprijs per deelnemer" value={formatEuro(budgetSummary.costPerParticipant)} />
                <MetricCard label="Marge %" value={`${budgetSummary.marginPct.toFixed(2)}%`} />
              </div>

              {permissions.canEditFinance && (
                <button
                  disabled={savingBudget}
                  onClick={saveBudget}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark disabled:opacity-60"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingBudget ? 'Opslaan...' : 'Financieel overzicht opslaan'}
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
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
              <button
                onClick={() => window.print()}
                className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50"
              >
                Print / PDF
              </button>
            </div>
          </div>
        )}
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

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
    <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
    <p className="text-base font-semibold text-neutral-900 mt-1">{value}</p>
  </div>
);

const ListSection = ({
  title,
  rows,
  disabled,
  onAdd,
  onRemove,
  renderRow,
}: {
  title: string;
  rows: any[];
  disabled: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderRow: (row: any, index: number) => React.ReactNode;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-semibold text-neutral-800">{title}</h4>
      {!disabled && (
        <button onClick={onAdd} className="inline-flex items-center px-2 py-1 text-xs border border-neutral-300 rounded hover:bg-neutral-50">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Regel toevoegen
        </button>
      )}
    </div>
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${title}-${index}`} className="flex gap-2 items-start">
          <div className="flex-1">{renderRow(row, index)}</div>
          {!disabled && (
            <button onClick={() => onRemove(index)} className="px-2 py-2 text-xs border border-red-300 text-red-700 rounded hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-neutral-500">Nog geen regels.</p>}
    </div>
  </div>
);

const SimpleCostSection = ({
  title,
  rows,
  disabled,
  onChange,
}: {
  title: string;
  rows: Array<{ description: string; amount: number }>;
  disabled: boolean;
  onChange: (rows: Array<{ description: string; amount: number }>) => void;
}) => {
  return (
    <ListSection
      title={title}
      rows={rows}
      disabled={disabled}
      onAdd={() => onChange([...(rows || []), { description: '', amount: 0 }])}
      onRemove={(index) => onChange((rows || []).filter((_, i) => i !== index))}
      renderRow={(row, index) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={row.description}
            disabled={disabled}
            onChange={(e) => onChange((rows || []).map((item, i) => i === index ? { ...item, description: e.target.value } : item))}
            placeholder="Omschrijving"
            className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
          />
          <input
            type="number"
            step="0.01"
            value={row.amount}
            disabled={disabled}
            onChange={(e) => onChange((rows || []).map((item, i) => i === index ? { ...item, amount: toNumber(e.target.value) } : item))}
            placeholder="Bedrag"
            className="px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
          />
        </div>
      )}
    />
  );
};

export default EventDetailPage;

