import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Clock,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  Trash2,
  Edit,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { User as UserType, AuditLog } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuditSectionProps {
  user: UserType;
}

const itemsPerPage = 20;

const AuditSection: React.FC<AuditSectionProps> = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const getStartDate = () => {
    const now = new Date();
    const days = dateFilter === '1' ? 1 : dateFilter === '30' ? 30 : 7;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    const startDate = getStartDate();
    try {
      let countQuery = supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());
      if (actionFilter !== 'all') countQuery = countQuery.eq('action', actionFilter);
      if (resourceFilter !== 'all')
        countQuery = countQuery.eq('resource_type', resourceFilter);
      const { count } = await countQuery;
      setTotalCount(count ?? 0);

      let dataQuery = supabase
        .from('audit_log')
        .select(
          `
          *,
          user:profiles(full_name, email, avatar_url)
        `
        )
        .order('created_at', { ascending: false })
        .gte('created_at', startDate.toISOString())
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (actionFilter !== 'all') dataQuery = dataQuery.eq('action', actionFilter);
      if (resourceFilter !== 'all')
        dataQuery = dataQuery.eq('resource_type', resourceFilter);

      const { data, error } = await dataQuery;
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Kon audit log niet laden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [page, actionFilter, resourceFilter, dateFilter]);

  const filteredLogs = auditLogs.filter((log) => {
    const user = log.user as { full_name?: string; email?: string } | undefined;
    const matchesSearch =
      !searchTerm ||
      user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'update':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'login':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'logout':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-50';
      case 'update':
        return 'text-blue-600 bg-blue-50';
      case 'delete':
        return 'text-red-600 bg-red-50';
      case 'login':
        return 'text-green-600 bg-green-50';
      case 'logout':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-neutral-600 bg-neutral-50';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create':
        return 'Aangemaakt';
      case 'update':
        return 'Bijgewerkt';
      case 'delete':
        return 'Verwijderd';
      case 'login':
        return 'Ingelogd';
      case 'logout':
        return 'Uitgelogd';
      default:
        return action;
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  if (loading && auditLogs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-archer-blue" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Audit Log</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Bekijk de laatste activiteiten in de app
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Zoek in audit log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            >
              <option value="all">Alle acties</option>
              <option value="create">Aangemaakt</option>
              <option value="update">Bijgewerkt</option>
              <option value="delete">Verwijderd</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            >
              <option value="all">Alle resources</option>
              <option value="events">Events</option>
              <option value="profiles">Profielen</option>
              <option value="brand_settings">Brand Settings</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            >
              <option value="1">Laatste 24 uur</option>
              <option value="7">Laatste 7 dagen</option>
              <option value="30">Laatste 30 dagen</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-neutral-900">{totalCount}</div>
          <div className="text-sm text-neutral-600">Totaal acties</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-green-600">
            {auditLogs.filter((l) => l.action === 'create').length}
          </div>
          <div className="text-sm text-neutral-600">Aangemaakt (deze pagina)</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-blue-600">
            {auditLogs.filter((l) => l.action === 'update').length}
          </div>
          <div className="text-sm text-neutral-600">Bijgewerkt (deze pagina)</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-red-600">
            {auditLogs.filter((l) => l.action === 'delete').length}
          </div>
          <div className="text-sm text-neutral-600">Verwijderd (deze pagina)</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Tijd
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Gebruiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  IP Adres
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredLogs.map((log) => {
                const user = log.user as
                  | { full_name?: string; email?: string; avatar_url?: string }
                  | undefined;
                return (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <div>
                          <div>
                            {new Date(log.created_at).toLocaleDateString('nl-BE')}
                          </div>
                          <div>
                            {new Date(log.created_at).toLocaleTimeString('nl-BE')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center mr-3">
                          {user?.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || user.email || ''}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {user?.full_name || 'Onbekend'}
                          </div>
                          <div className="text-xs text-neutral-500">{user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getActionIcon(log.action)}
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {log.resource_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {log.resource_id && (
                        <div className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                          ID: {String(log.resource_id).slice(0, 8)}...
                        </div>
                      )}
                      {log.new_values &&
                        Object.keys(log.new_values).length > 0 && (
                          <div className="mt-1">
                            {Object.keys(log.new_values)
                              .slice(0, 2)
                              .map((key) => (
                                <div key={key} className="text-xs">
                                  <strong>{key}:</strong>{' '}
                                  {String((log.new_values as Record<string, unknown>)[key]).slice(
                                    0,
                                    20
                                  )}
                                  {String(
                                    (log.new_values as Record<string, unknown>)[key]
                                  ).length > 20 && '...'}
                                </div>
                              ))}
                          </div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 font-mono">
                      {log.ip_address || 'Onbekend'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Geen audit logs gevonden
            </h3>
            <p className="text-sm text-neutral-500">
              Probeer je filters aan te passen of er zijn geen recente activiteiten.
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              Toon {(page - 1) * itemsPerPage + 1} tot{' '}
              {Math.min(page * itemsPerPage, totalCount)} van {totalCount} resultaten
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vorige
              </button>
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded ${
                      pageNum === page
                        ? 'bg-archer-blue text-white'
                        : 'border border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 text-sm border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volgende
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditSection;
