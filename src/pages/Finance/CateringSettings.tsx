import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, RefreshCcw, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { CateringItem, User } from '@/types';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import ErrorBanner from '@/components/common/ErrorBanner';
import { formatEuro, toNumber } from '@/lib/finance';
import { usePermissions } from '@/hooks/usePermissions';

interface CateringSettingsProps {
  user: User;
}

const CATEGORIES = [
  'Koffie & water',
  'Broodjes & lunch',
  'Diner',
  'Receptie',
  'Dagarrangement',
  'Volledig pakket',
  'Overig',
] as const;

const ITEM_TYPES = ['drank', 'eten', 'pakket'] as const;
const UNITS = ['per persoon', 'per stuk', 'forfait'] as const;
const VAT_OPTIONS = [6, 12, 21] as const;

const blankForm: Omit<CateringItem, 'id'> = {
  name: '',
  category: CATEGORIES[0],
  item_type: 'eten',
  unit: 'per persoon',
  unit_price: 0,
  vat_rate: 6,
  is_active: true,
  brand_key: 'all',
};

const CateringSettings: React.FC<CateringSettingsProps> = ({ user }) => {
  const permissions = usePermissions(user);
  const [rows, setRows] = useState<CateringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CateringItem, 'id'>>(blankForm);

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('catering_items')
        .select('*')
        .order('name', { ascending: true });
      if (fetchError) throw fetchError;
      setRows(((data || []) as CateringItem[]).map((row) => ({
        ...row,
        unit_price: toNumber(row.unit_price),
        vat_rate: toNumber(row.vat_rate),
      })));
    } catch (err: any) {
      setError(err.message || 'Kon cateringcatalogus niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm);
  };

  const startEdit = (item: CateringItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category || CATEGORIES[0],
      item_type: item.item_type || 'eten',
      unit: item.unit || 'per persoon',
      unit_price: toNumber(item.unit_price),
      vat_rate: toNumber(item.vat_rate),
      is_active: item.is_active ?? true,
      brand_key: item.brand_key || 'all',
    });
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      toast.error('Naam is verplicht.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        item_type: form.item_type,
        unit: form.unit,
        unit_price: toNumber(form.unit_price),
        vat_rate: toNumber(form.vat_rate),
        is_active: form.is_active,
        brand_key: form.brand_key || 'all',
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('catering_items')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
        toast.success('Cateringoptie bijgewerkt.');
      } else {
        const { error: insertError } = await supabase
          .from('catering_items')
          .insert([payload]);
        if (insertError) throw insertError;
        toast.success('Cateringoptie toegevoegd.');
      }

      resetForm();
      await loadRows();
    } catch (err: any) {
      toast.error(err.message || 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('catering_items').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast.success('Cateringoptie verwijderd.');
      await loadRows();
    } catch (err: any) {
      toast.error(err.message || 'Verwijderen mislukt.');
    }
  };

  const totals = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.is_active).length,
      inactive: rows.filter((row) => !row.is_active).length,
    };
  }, [rows]);

  if (!permissions.canManageSettings) {
    return <ErrorBanner message="Je hebt geen rechten om cateringinstellingen te beheren." />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Catering beheer</h2>
          <p className="text-sm text-neutral-600">Beheer de centrale cateringcatalogus per optie.</p>
        </div>
        <button
          onClick={loadRows}
          className="inline-flex items-center px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Vernieuwen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Totaal opties" value={String(totals.total)} />
        <StatCard title="Actief" value={String(totals.active)} />
        <StatCard title="Inactief" value={String(totals.inactive)} />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">{editingId ? 'Cateringoptie bewerken' : 'Nieuwe cateringoptie'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Naam"
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          />
          <select
            value={form.item_type || 'eten'}
            onChange={(e) => setForm((prev) => ({ ...prev, item_type: e.target.value as CateringItem['item_type'] }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          >
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={form.category || CATEGORIES[0]}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={form.unit || 'per persoon'}
            onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value as CateringItem['unit'] }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={form.unit_price}
            onChange={(e) => setForm((prev) => ({ ...prev, unit_price: toNumber(e.target.value) }))}
            placeholder="Eenheidsprijs"
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          />
          <select
            value={form.vat_rate}
            onChange={(e) => setForm((prev) => ({ ...prev, vat_rate: toNumber(e.target.value) }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          >
            {VAT_OPTIONS.map((vat) => (
              <option key={vat} value={vat}>{vat}%</option>
            ))}
          </select>
          <select
            value={form.brand_key || 'all'}
            onChange={(e) => setForm((prev) => ({ ...prev, brand_key: e.target.value }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg"
          >
            <option value="all">Alle brands</option>
            <option value="academy">Academy</option>
            <option value="invest">Invest</option>
            <option value="fund">Fund</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 border border-neutral-300 rounded-lg">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            Actief
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            disabled={saving}
            onClick={saveItem}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark disabled:opacity-60"
          >
            {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {saving ? 'Opslaan...' : editingId ? 'Wijzigingen opslaan' : 'Toevoegen'}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
            >
              Annuleer
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadRows} />}
      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nog geen cateringopties" description="Maak je eerste optie aan via het formulier." />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Naam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Categorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Eenheid</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Eenheidsprijs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">BTW</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-900">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700 capitalize">{row.item_type || '-'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{row.category || '-'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{row.unit}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{formatEuro(toNumber(row.unit_price))}</td>
                    <td className="px-4 py-3 text-sm text-neutral-700">{toNumber(row.vat_rate)}%</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={async () => {
                          const next = !row.is_active;
                          const { error: toggleError } = await supabase
                            .from('catering_items')
                            .update({ is_active: next })
                            .eq('id', row.id);
                          if (toggleError) {
                            toast.error(toggleError.message);
                            return;
                          }
                          setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, is_active: next } : item)));
                        }}
                        className={`text-xs px-2 py-1 rounded-full ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700'}`}
                      >
                        {row.is_active ? 'Actief' : 'Inactief'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs rounded border border-neutral-300 hover:bg-neutral-50"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Bewerken
                        </button>
                        <button
                          onClick={() => removeItem(row.id)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Verwijderen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <div className="bg-white border border-neutral-200 rounded-xl p-4">
    <p className="text-sm text-neutral-500">{title}</p>
    <p className="text-2xl font-semibold text-neutral-900 mt-1">{value}</p>
  </div>
);

export default CateringSettings;

