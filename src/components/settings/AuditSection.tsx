// Audit Section Component - System Activity Logging (Admin Only)
import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Clock, User as UserIcon, AlertCircle, CheckCircle, Trash2, Edit, Plus } from 'lucide-react';
import { User as UserType, AuditLog } from '@/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AuditSectionProps {
  user: UserType;
}

const AuditSection: React.FC<AuditSectionProps> = ({ user }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = 20;

  useEffect(() => {
    loadAuditLogs();
  }, [page, actionFilter, resourceFilter, dateFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      
      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }

      // Apply date filter
      const now = new Date();
      let startDate: Date;
      switch (dateFilter) {
        case '1':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      query = query.gte('created_at', startDate.toISOString());

      // Get paginated data
      const { data, error } = await query
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setAuditLogs(data || []);
      setTotalCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Er is een fout opgetreden bij het laden van audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-green-600" />;
      case 'update': return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'login': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'logout': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <FileText className="w-4 h-4 text-neutral-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-green-600 bg-green-50';
      case 'update': return 'text-blue-600 bg-blue-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'login': return 'text-green-600 bg-green-50';
      case 'logout': return 'text-orange-600 bg-orange-50';
      default: return 'text-neutral-600 bg-neutral-50';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create': return 'Aangemaakt';
      case 'update': return 'Bijgewerkt';
      case 'delete': return 'Verwijderd';
      case 'login': return 'Ingelogd';
      case 'logout': return 'Uitgelogd';
      default: return action;
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
            <h2 className="text-xl font-semibold text-neutral-900">Audit Log</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Bekijk de laatste activiteiten in de app
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
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

            {/* Action Filter */}
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

            {/* Resource Filter */}
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
            >
              <option value="all">Alle resources</option>
              <option value="event">Events</option>
              <option value="user">Gebruikers</option>
              <option value="brand_setting">Brand Settings</option>
              <option value="profile">Profielen</option>
            </select>

            {/* Date Filter */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-neutral-900">{totalCount}</div>
          <div className="text-sm text-neutral-600">Totaal acties</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-green-600">
            {auditLogs.filter(l => l.action === 'create').length}
          </div>
          <div className="text-sm text-neutral-600">Aangemaakt</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-blue-600">
            {auditLogs.filter(l => l.action === 'update').length}
          </div>
          <div className="text-sm text-neutral-600">Bijgewerkt</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="text-2xl font-bold text-red-600">
            {auditLogs.filter(l => l.action === 'delete').length}
          </div>
          <div className="text-sm text-neutral-600">Verwijderd</div>
        </div>
      </div>

      {/* Audit Logs Table */}
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
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      <div>
                        <div>{new Date(log.created_at).toLocaleDateString('nl-BE')}</div>
                        <div>{new Date(log.created_at).toLocaleTimeString('nl-BE')}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center mr-3">
                        {log.user?.avatar_url ? (
                          <img
                            src={log.user.avatar_url}
                            alt={log.user.full_name || log.user.email}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {log.user?.full_name || 'Onbekend'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {log.user?.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getActionIcon(log.action)}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
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
                        ID: {log.resource_id.slice(0, 8)}...
                      </div>
                    )}
                    {log.new_values && (
                      <div className="mt-1">
                        {Object.keys(log.new_values).slice(0, 2).map(key => (
                          <div key={key} className="text-xs">
                            <strong>{key}:</strong> {String(log.new_values![key]).slice(0, 20)}
                            {String(log.new_values![key]).length > 20 && '...'}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 font-mono">
                    {log.ip_address || 'Onbekend'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Geen audit logs gevonden</h3>
            <p className="text-sm text-neutral-500">
              Probeer je filters aan te passen of er zijn geen recente activiteiten.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              Toon {((page - 1) * itemsPerPage) + 1} tot {Math.min(page * itemsPerPage, totalCount)} van {totalCount} resultaten
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
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
                onClick={() => setPage(page + 1)}
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
