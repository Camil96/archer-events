import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, Search, Filter, Edit3, UserX, RefreshCcw, X, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { AuditLog, User, UserRole } from '@/types';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import ErrorBanner from '@/components/common/ErrorBanner';
import { mapProfile } from '@/lib/profile';
import { usePermissions } from '@/hooks/usePermissions';

interface UserManagementProps {
  user: User;
}

type InviteForm = {
  email: string;
  full_name: string;
  role: UserRole;
  brand_access: string[];
};

const defaultInviteForm: InviteForm = {
  email: '',
  full_name: '',
  role: 'viewer',
  brand_access: ['academy'],
};

const UserManagement: React.FC<UserManagementProps> = ({ user }) => {
  const permissions = usePermissions(user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [brandFilter, setBrandFilter] = useState<'all' | 'academy' | 'invest' | 'fund'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'details' | 'activity'>('details');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>(defaultInviteForm);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (usersError) throw usersError;
      setUsers((data || []).map(mapProfile));
    } catch (err: any) {
      setError(err.message || 'Kon gebruikers niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadActivity = async (userId: string) => {
    setActivityLoading(true);
    try {
      const { data, error: activityError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (activityError) throw activityError;
      setActivities((data || []) as AuditLog[]);
    } catch {
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((row) => {
      const query = search.toLowerCase();
      const matchSearch = !query
        || String(row.full_name || '').toLowerCase().includes(query)
        || String(row.email || '').toLowerCase().includes(query);
      const matchRole = roleFilter === 'all' || row.role === roleFilter;
      const matchBrand = brandFilter === 'all' || (row.brand_access || []).includes(brandFilter);
      return matchSearch && matchRole && matchBrand;
    });
  }, [users, search, roleFilter, brandFilter]);

  const openEditPanel = (targetUser: User) => {
    setSelectedUser({ ...targetUser });
    setActivePanelTab('details');
    setActivities([]);
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const payload = {
        full_name: selectedUser.full_name,
        role: selectedUser.role,
        brand_access: selectedUser.brand_access,
        responsibilities: selectedUser.responsibilities || '',
        status: selectedUser.status || (selectedUser.is_active ? 'actief' : 'inactief'),
        is_active: selectedUser.status !== 'inactief',
        updated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', selectedUser.id);
      if (updateError) throw updateError;

      setUsers((prev) => prev.map((row) => (row.id === selectedUser.id ? { ...row, ...selectedUser } : row)));
      toast.success('Gebruiker bijgewerkt.');
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Gebruiker opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (target: User) => {
    try {
      const { error: deactivateError } = await supabase
        .from('profiles')
        .update({ status: 'inactief', is_active: false, updated_at: new Date().toISOString() })
        .eq('id', target.id);
      if (deactivateError) throw deactivateError;
      setUsers((prev) => prev.map((row) => (row.id === target.id ? { ...row, status: 'inactief', is_active: false } : row)));
      toast.success('Gebruiker gedeactiveerd.');
    } catch (err: any) {
      toast.error(err.message || 'Deactiveren mislukt.');
    }
  };

  const sendInvite = async (form: InviteForm, existingUserId?: string) => {
    try {
      const inviteResponse = await supabase.auth.admin.inviteUserByEmail(form.email, {
        data: { full_name: form.full_name || null },
        redirectTo: window.location.origin,
      });
      if (inviteResponse.error) throw inviteResponse.error;

      const invitedId = existingUserId || inviteResponse.data.user?.id;
      if (invitedId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: invitedId,
            email: form.email,
            full_name: form.full_name || null,
            role: form.role,
            brand_access: form.brand_access,
            status: 'uitgenodigd',
            invited_at: new Date().toISOString(),
            is_active: false,
          });
        if (profileError) throw profileError;
      } else {
        const { error: profileFallbackError } = await supabase
          .from('profiles')
          .update({
            full_name: form.full_name || null,
            role: form.role,
            brand_access: form.brand_access,
            status: 'uitgenodigd',
            invited_at: new Date().toISOString(),
            is_active: false,
          })
          .eq('email', form.email);
        if (profileFallbackError) throw profileFallbackError;
      }

      toast.success(`Uitnodiging verstuurd naar ${form.email}.`);
      setInviteOpen(false);
      setInviteForm(defaultInviteForm);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Uitnodiging versturen mislukt.');
    }
  };

  if (!permissions.canManageUsers) {
    return (
      <div className="max-w-5xl mx-auto">
        <ErrorBanner message="Je hebt geen rechten om gebruikers te beheren." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Gebruikersbeheer</h2>
          <p className="text-sm text-neutral-600">Beheer rollen, brand-toegang en accountstatussen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-archer-blue text-white text-sm font-medium hover:bg-archer-dark"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Gebruiker uitnodigen
          </button>
          <button
            onClick={loadUsers}
            className="inline-flex items-center px-3 py-2 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Vernieuwen
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op naam of e-mail"
              className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
          >
            <option value="all">Alle rollen</option>
            <option value="superadmin">Superadmin</option>
            <option value="admin">Admin</option>
            <option value="operations">Operations</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value as 'all' | 'academy' | 'invest' | 'fund')}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
          >
            <option value="all">Alle brands</option>
            <option value="academy">Academy</option>
            <option value="invest">Invest</option>
            <option value="fund">Fund</option>
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadUsers} />}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="Geen gebruikers gevonden" description="Pas filters aan of stuur een uitnodiging." />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Gebruiker</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Brand toegang</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Lid sinds</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Laatste login</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center">
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt={row.full_name || row.email} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold text-neutral-700">{(row.full_name || row.email || 'U')[0]}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{row.full_name || 'Geen naam'}</p>
                          <p className="text-xs text-neutral-500">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700 capitalize">{row.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(row.brand_access || []).map((brand) => (
                          <span key={`${row.id}-${brand}`} className="px-2 py-0.5 rounded bg-neutral-100 text-xs text-neutral-700">
                            {brand}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString('nl-BE') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {(row.last_login || row.last_sign_in_at)
                        ? new Date(row.last_login || row.last_sign_in_at || '').toLocaleString('nl-BE')
                        : 'Geen login'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        row.status === 'uitgenodigd'
                          ? 'bg-yellow-100 text-yellow-800'
                          : row.status === 'inactief' || row.is_active === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {row.status || (row.is_active ? 'actief' : 'inactief')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditPanel(row)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs rounded border border-neutral-300 hover:bg-neutral-50"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                          Bewerken
                        </button>
                        <button
                          onClick={() => deactivateUser(row)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <UserX className="w-3.5 h-3.5 mr-1.5" />
                          Deactiveren
                        </button>
                        <button
                          onClick={() => sendInvite({
                            email: row.email,
                            full_name: row.full_name || '',
                            role: row.role,
                            brand_access: row.brand_access || ['academy'],
                          }, row.id)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs rounded border border-neutral-300 hover:bg-neutral-50"
                        >
                          <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                          Uitnodiging opnieuw
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

      {selectedUser && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedUser(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Gebruiker bewerken</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded hover:bg-neutral-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-neutral-200 flex gap-2">
              <button
                onClick={() => setActivePanelTab('details')}
                className={`px-3 py-1.5 rounded-lg text-sm ${activePanelTab === 'details' ? 'bg-archer-blue text-white' : 'bg-neutral-100 text-neutral-700'}`}
              >
                Details
              </button>
              <button
                onClick={async () => {
                  setActivePanelTab('activity');
                  await loadActivity(selectedUser.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm ${activePanelTab === 'activity' ? 'bg-archer-blue text-white' : 'bg-neutral-100 text-neutral-700'}`}
              >
                Activiteit
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activePanelTab === 'details' ? (
                <>
                  <label className="block">
                    <span className="text-sm text-neutral-700">Naam</span>
                    <input
                      value={selectedUser.full_name || ''}
                      onChange={(e) => setSelectedUser((prev) => prev ? { ...prev, full_name: e.target.value } : prev)}
                      className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-neutral-700">Rol</span>
                    <select
                      value={selectedUser.role}
                      onChange={(e) => setSelectedUser((prev) => prev ? { ...prev, role: e.target.value as UserRole } : prev)}
                      className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                    >
                      <option value="superadmin">Superadmin</option>
                      <option value="admin">Admin</option>
                      <option value="operations">Operations</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </label>
                  <div>
                    <span className="text-sm text-neutral-700">Brand toegang</span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {(['academy', 'invest', 'fund'] as const).map((brand) => (
                        <label key={brand} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={(selectedUser.brand_access || []).includes(brand)}
                            onChange={(e) => {
                              setSelectedUser((prev) => {
                                if (!prev) return prev;
                                const current = new Set(prev.brand_access || []);
                                if (e.target.checked) current.add(brand);
                                else current.delete(brand);
                                return { ...prev, brand_access: Array.from(current) };
                              });
                            }}
                          />
                          {brand}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-sm text-neutral-700">Verantwoordelijkheden</span>
                    <textarea
                      rows={4}
                      value={selectedUser.responsibilities || ''}
                      onChange={(e) => setSelectedUser((prev) => prev ? { ...prev, responsibilities: e.target.value } : prev)}
                      className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm text-neutral-700">Status</span>
                    <select
                      value={selectedUser.status || (selectedUser.is_active ? 'actief' : 'inactief')}
                      onChange={(e) => {
                        const status = e.target.value as User['status'];
                        setSelectedUser((prev) => prev ? { ...prev, status, is_active: status !== 'inactief' } : prev);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                    >
                      <option value="actief">Actief</option>
                      <option value="inactief">Inactief</option>
                      <option value="uitgenodigd">Uitgenodigd</option>
                    </select>
                  </label>
                </>
              ) : (
                <div className="space-y-2">
                  {activityLoading ? (
                    <div className="py-10 flex justify-center"><Spinner /></div>
                  ) : activities.length === 0 ? (
                    <EmptyState title="Geen activiteiten" description="Voor deze gebruiker zijn geen logregels gevonden." />
                  ) : (
                    activities.map((log) => (
                      <div key={log.id} className="border border-neutral-200 rounded-lg p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-neutral-900">{log.action}</span>
                          <span className="text-neutral-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" />{new Date(log.created_at).toLocaleString('nl-BE')}</span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-1">
                          Betrokken event: {log.target_type === 'event' ? log.target_id || '-' : '-'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {activePanelTab === 'details' && (
              <div className="p-4 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-2 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
                >
                  Annuleer
                </button>
                <button
                  disabled={saving}
                  onClick={saveUser}
                  className="px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark disabled:opacity-60"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInviteOpen(false)} />
          <div className="absolute inset-x-4 top-12 mx-auto max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Gebruiker uitnodigen</h3>
              <button onClick={() => setInviteOpen(false)} className="p-2 rounded hover:bg-neutral-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block">
                <span className="text-sm text-neutral-700">E-mail</span>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-700">Naam (optioneel)</span>
                <input
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                />
              </label>
              <label className="block">
                <span className="text-sm text-neutral-700">Rol</span>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue"
                >
                  <option value="superadmin">Superadmin</option>
                  <option value="admin">Admin</option>
                  <option value="operations">Operations</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <div>
                <span className="text-sm text-neutral-700">Brand toegang</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['academy', 'invest', 'fund'] as const).map((brand) => (
                    <label key={brand} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={inviteForm.brand_access.includes(brand)}
                        onChange={(e) => {
                          setInviteForm((prev) => {
                            const current = new Set(prev.brand_access);
                            if (e.target.checked) current.add(brand);
                            else current.delete(brand);
                            return { ...prev, brand_access: Array.from(current) };
                          });
                        }}
                      />
                      {brand}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-200 flex justify-end gap-2">
              <button
                onClick={() => setInviteOpen(false)}
                className="px-3 py-2 rounded-lg border border-neutral-300 text-sm hover:bg-neutral-50"
              >
                Annuleer
              </button>
              <button
                onClick={() => sendInvite(inviteForm)}
                className="px-3 py-2 rounded-lg bg-archer-blue text-white text-sm hover:bg-archer-dark"
              >
                Uitnodigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

