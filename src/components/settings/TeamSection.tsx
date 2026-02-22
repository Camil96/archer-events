// Team Section Component - Team & Permissions (Admin Only)
import React, { useState, useEffect } from 'react';
import { Users, Shield, Search, MoreVertical, Edit, Trash2, Check, X } from 'lucide-react';
import { User as UserType, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface TeamSectionProps {
  user: UserType;
}

const TeamSection: React.FC<TeamSectionProps> = ({ user }) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setIsUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      toast.success('Gebruikersrol bijgewerkt!');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken van de gebruikersrol.');
    } finally {
      setIsUpdating(null);
    }
  };

  const updateUserBrandAccess = async (userId: string, brandAccess: string[]) => {
    setIsUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ brand_access: brandAccess, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, brand_access: brandAccess } : u
      ));
      
      toast.success('Brand toegang bijgewerkt!');
    } catch (error) {
      console.error('Error updating user brand access:', error);
      toast.error('Er is een fout opgetreden bij het bijwerken van de brand toegang.');
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    setIsUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: isActive } : u
      ));
      
      toast.success(`Gebruiker ${isActive ? 'geactiveerd' : 'gedeactiveerd'}!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Er is een fout opgetreden bij het wijzigen van de gebruikersstatus.');
    } finally {
      setIsUpdating(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesBrand = brandFilter === 'all' || u.brand_access?.includes(brandFilter);
    
    return matchesSearch && matchesRole && matchesBrand;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'operations': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'operations': return 'Operations';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-archer-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Gebruikers & Rechten</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Beheer gebruikersrollen en merktoegang
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Zoek gebruiker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            >
              <option value="all">Alle rollen</option>
              <option value="admin">Administrator</option>
              <option value="operations">Operations</option>
              <option value="viewer">Viewer</option>
            </select>

            {/* Brand Filter */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            >
              <option value="all">Alle merken</option>
              <option value="academy">Academy</option>
              <option value="invest">Invest</option>
              <option value="fund">Fund</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Gebruiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Brand Toegang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Laatste login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredUsers.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                          {userItem.avatar_url ? (
                            <img
                              src={userItem.avatar_url}
                              alt={userItem.full_name || userItem.email}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {userItem.full_name || 'Geen naam'}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {userItem.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(userItem.role)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {getRoleLabel(userItem.role)}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {userItem.brand_access?.length > 0 ? (
                        userItem.brand_access.map((brand) => (
                          <span
                            key={brand}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-800"
                          >
                            {brand === 'academy' ? 'Academy' :
                             brand === 'invest' ? 'Invest' : 'Fund'}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500">Geen toegang</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleUserStatus(userItem.id, !userItem.is_active)}
                      disabled={isUpdating === userItem.id}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        userItem.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } disabled:opacity-50`}
                    >
                      {userItem.is_active ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Actief
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          Inactief
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {userItem.last_sign_in_at
                      ? new Date(userItem.last_sign_in_at).toLocaleDateString('nl-BE')
                      : 'Nooit'
                    }
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Role Dropdown */}
                      <select
                        value={userItem.role}
                        onChange={(e) => updateUserRole(userItem.id, e.target.value as UserRole)}
                        disabled={isUpdating === userItem.id || userItem.id === user.id}
                        className="text-xs border border-neutral-300 rounded px-2 py-1 focus:ring-1 focus:ring-archer-blue"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="operations">Operations</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Brand Access Dropdown */}
                      <select
                        multiple
                        value={userItem.brand_access || []}
                        onChange={(e) => updateUserBrandAccess(userItem.id, Array.from(e.target.selectedOptions, option => option.value))}
                        disabled={isUpdating === userItem.id}
                        className="text-xs border border-neutral-300 rounded px-2 py-1 focus:ring-1 focus:ring-archer-blue"
                        size={1}
                      >
                        <option value="academy">Academy</option>
                        <option value="invest">Invest</option>
                        <option value="fund">Fund</option>
                      </select>

                      {isUpdating === userItem.id && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-archer-blue"></div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Geen gebruikers gevonden</h3>
            <p className="text-sm text-neutral-500">
              Probeer je zoekterm of filters aan te passen.
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-neutral-900">{users.length}</div>
          <div className="text-sm text-neutral-600">Totaal gebruikers</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.is_active).length}
          </div>
          <div className="text-sm text-neutral-600">Actieve gebruikers</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-red-600">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-sm text-neutral-600">Administrators</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-blue-600">
            {users.filter(u => !u.is_active).length}
          </div>
          <div className="text-sm text-neutral-600">Inactieve gebruikers</div>
        </div>
      </div>
    </div>
  );
};

export default TeamSection;
