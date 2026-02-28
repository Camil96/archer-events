import React, { useEffect, useMemo, useState } from 'react';
import { Download, Filter, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShell from '@/components/layout/AppShell';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import ErrorBanner from '@/components/common/ErrorBanner';
import { Event, EventBudget, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { calcCateringLine, computeBudgetSummary, formatEuro, periodStartDate, toNumber } from '@/lib/finance';
import { usePermissions } from '@/hooks/usePermissions';

interface FinanceOverviewProps {
  user: User;
}

type FinanceRow = {
  event: Event;
  totalCost: number;
  totalIncome: number;
  net: number;
  participantCount: number;
};

type PeriodFilter = 'month' | 'quarter' | 'year' | 'all';

const FinanceOverview: React.FC<FinanceOverviewProps> = ({ user }) => {
  const permissions = usePermissions(user);
  const [events, setEvents] = useState<Event[]>([]);
  const [budgets, setBudgets] = useState<Record<string, EventBudget>>({});
  const [cateringByEvent, setCateringByEvent] = useState<Record<string, Array<{ quantity: number; unitPrice: number; vatRate: number }>>>({});
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<'all' | 'Academy' | 'Invest' | 'Fund'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'gepland' | 'afgerond' | 'bevestigd' | 'geannuleerd'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('year');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('start_at', { ascending: true });
      if (eventsError) throw eventsError;

      const eventRows = (eventsData || []) as Event[];
      const scopedEvents = user.role === 'superadmin'
        ? eventRows
        : eventRows.filter((row) => {
            const brandKey = String(row.brand || '').toLowerCase();
            if (brandKey.includes('academy')) return user.brand_access.includes('academy');
            if (brandKey.includes('invest')) return user.brand_access.includes('invest');
            if (brandKey.includes('fund')) return user.brand_access.includes('fund');
            return true;
          });
      setEvents(scopedEvents);

      const { data: budgetsData, error: budgetsError } = await supabase
        .from('event_budget')
        .select('*');
      if (budgetsError) throw budgetsError;

      const budgetMap: Record<string, EventBudget> = {};
      ((budgetsData || []) as EventBudget[]).forEach((row) => {
        budgetMap[row.event_id] = {
          ...row,
          location_cost: toNumber(row.location_cost),
          ticket_price: toNumber(row.ticket_price),
          income_override: row.income_override !== null && row.income_override !== undefined ? toNumber(row.income_override) : null,
          speaker_costs: Array.isArray(row.speaker_costs) ? row.speaker_costs : [],
          material_costs: Array.isArray(row.material_costs) ? row.material_costs : [],
          marketing_costs: Array.isArray(row.marketing_costs) ? row.marketing_costs : [],
          other_costs: Array.isArray(row.other_costs) ? row.other_costs : [],
        };
      });
      setBudgets(budgetMap);

      const { data: cateringRows, error: cateringError } = await supabase
        .from('event_catering')
        .select('event_id,catering_item_id,quantity,unit_price_override');
      if (cateringError) throw cateringError;

      const { data: itemRows, error: itemsError } = await supabase
        .from('catering_items')
        .select('id,unit_price,vat_rate');
      if (itemsError) throw itemsError;

      const itemMap = new Map<string, { unit_price: number; vat_rate: number }>();
      (itemRows || []).forEach((item: any) => {
        itemMap.set(item.id, {
          unit_price: toNumber(item.unit_price),
          vat_rate: toNumber(item.vat_rate),
        });
      });

      const cateringMap: Record<string, Array<{ quantity: number; unitPrice: number; vatRate: number }>> = {};
      (cateringRows || []).forEach((row: any) => {
        const item = itemMap.get(row.catering_item_id);
        if (!item) return;
        const eventId = row.event_id;
        if (!cateringMap[eventId]) cateringMap[eventId] = [];
        cateringMap[eventId].push({
          quantity: toNumber(row.quantity),
          unitPrice: row.unit_price_override !== null && row.unit_price_override !== undefined ? toNumber(row.unit_price_override) : item.unit_price,
          vatRate: item.vat_rate,
        });
      });
      setCateringByEvent(cateringMap);

      const { data: participantsRows, error: participantsError } = await supabase
        .from('event_participants')
        .select('event_id');
      if (participantsError) throw participantsError;
      const participantsMap: Record<string, number> = {};
      (participantsRows || []).forEach((row: any) => {
        participantsMap[row.event_id] = (participantsMap[row.event_id] || 0) + 1;
      });
      setParticipantCounts(participantsMap);
    } catch (err: any) {
      setError(err.message || 'Kon financieel overzicht niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo<FinanceRow[]>(() => {
    return events.map((event) => {
      const participantCount = participantCounts[event.id] || toNumber(event.expected_attendance) || 0;
      const budget = budgets[event.id] || {
        event_id: event.id,
        location_cost: 0,
        speaker_costs: [],
        material_costs: [],
        marketing_costs: [],
        other_costs: [],
        ticket_price: 0,
        income_override: null,
      };
      const cateringRows = cateringByEvent[event.id] || [];
      const cateringTotalIncl = cateringRows.reduce((total, row) => total + calcCateringLine({
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        vatRate: row.vatRate,
      }).totalIncl, 0);

      const summary = computeBudgetSummary({
        budget,
        participantCount,
        cateringTotalIncl,
      });

      return {
        event,
        totalCost: summary.totalCosts,
        totalIncome: summary.totalIncome,
        net: summary.net,
        participantCount,
      };
    });
  }, [events, budgets, cateringByEvent, participantCounts]);

  const filteredRows = useMemo(() => {
    const start = periodStartDate(periodFilter);
    return rows.filter((row) => {
      const brandOk = brandFilter === 'all' || row.event.brand === brandFilter;
      const statusOk = statusFilter === 'all' || row.event.status === statusFilter;
      const periodOk = !start || new Date(row.event.start_at) >= start;
      return brandOk && statusOk && periodOk;
    });
  }, [rows, brandFilter, statusFilter, periodFilter]);

  const totals = useMemo(() => {
    const totalCosts = filteredRows.reduce((sum, row) => sum + row.totalCost, 0);
    const totalIncome = filteredRows.reduce((sum, row) => sum + row.totalIncome, 0);
    const totalNet = totalIncome - totalCosts;
    const avgCost = filteredRows.length ? totalCosts / filteredRows.length : 0;
    return { totalCosts, totalIncome, totalNet, avgCost };
  }, [filteredRows]);

  const chartData = useMemo(() => {
    const map = new Map<string, { month: string; kosten: number; inkomsten: number }>();
    filteredRows.forEach((row) => {
      const date = new Date(row.event.start_at);
      const month = date.toLocaleDateString('nl-BE', { month: 'short', year: '2-digit' });
      if (!map.has(month)) map.set(month, { month, kosten: 0, inkomsten: 0 });
      const current = map.get(month)!;
      current.kosten += row.totalCost;
      current.inkomsten += row.totalIncome;
    });
    return Array.from(map.values());
  }, [filteredRows]);

  const exportCsv = () => {
    if (!filteredRows.length) return;
    const headers = ['Event naam', 'Brand', 'Datum', 'Totale kost', 'Totale inkomst', 'Netto resultaat', 'Status'];
    const lines = [headers.join(';')];
    filteredRows.forEach((row) => {
      lines.push([
        row.event.title,
        row.event.brand,
        new Date(row.event.start_at).toLocaleDateString('nl-BE'),
        row.totalCost.toFixed(2).replace('.', ','),
        row.totalIncome.toFixed(2).replace('.', ','),
        row.net.toFixed(2).replace('.', ','),
        row.event.status || 'gepland',
      ].join(';'));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financieel-overzicht-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!permissions.canViewFinance) {
    return (
      <AppShell user={user}>
        <ErrorBanner message="Je hebt geen toegang tot de financiële module." />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Financieel overzicht</h1>
            <p className="text-sm text-neutral-600">Analyseer kosten en inkomsten over alle events.</p>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporteer CSV
          </button>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value as typeof brandFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            >
              <option value="all">Alle brands</option>
              <option value="Academy">Academy</option>
              <option value="Invest">Invest</option>
              <option value="Fund">Fund</option>
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            >
              <option value="month">Deze maand</option>
              <option value="quarter">Dit kwartaal</option>
              <option value="year">Dit jaar</option>
              <option value="all">Alles</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-neutral-300 rounded-lg"
            >
              <option value="all">Alle statussen</option>
              <option value="gepland">Gepland</option>
              <option value="bevestigd">Bevestigd</option>
              <option value="afgerond">Afgerond</option>
              <option value="geannuleerd">Geannuleerd</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Totale kosten YTD" value={formatEuro(totals.totalCosts)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} />
          <KpiCard title="Totale inkomsten YTD" value={formatEuro(totals.totalIncome)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} />
          <KpiCard title="Netto YTD" value={formatEuro(totals.totalNet)} icon={<Wallet className="w-5 h-5 text-archer-blue" />} />
          <KpiCard title="Gem. kost per event" value={formatEuro(totals.avgCost)} icon={<Filter className="w-5 h-5 text-neutral-700" />} />
        </div>

        {error && <ErrorBanner message={error} onRetry={loadData} />}
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
        ) : filteredRows.length === 0 ? (
          <EmptyState title="Geen financiële data" description="Er zijn geen events binnen de gekozen filters." />
        ) : (
          <>
            <div className="bg-white border border-neutral-200 rounded-xl p-4 h-[320px]">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Kosten vs inkomsten per maand</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatEuro(toNumber(value))} />
                  <Legend />
                  <Bar dataKey="kosten" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inkomsten" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Event naam</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Datum</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Totale kost</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Totale inkomst</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Netto resultaat</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.event.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-3 text-sm text-neutral-900">{row.event.title}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{row.event.brand}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{new Date(row.event.start_at).toLocaleDateString('nl-BE')}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{formatEuro(row.totalCost)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-700">{formatEuro(row.totalIncome)}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${row.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatEuro(row.net)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">{row.event.status || 'gepland'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

const KpiCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <div className="bg-white border border-neutral-200 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-neutral-500">{title}</p>
      {icon}
    </div>
    <p className="text-2xl font-semibold text-neutral-900 mt-2">{value}</p>
  </div>
);

export default FinanceOverview;
