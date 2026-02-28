import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  User as UserIcon,
  Users,
  Palette,
  FileText,
  Menu,
  X,
  LogOut,
  Shield,
} from 'lucide-react';
import { User, SettingsNavigationItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

import SettingsView from '@/components/settings/SettingsView';
import AccountSection from './AccountSection';
import UsersSection from './UsersSection';
import BrandManagementSection from './BrandManagementSection';
import AuditLogSection from './AuditLogSection';

const navigationItems: SettingsNavigationItem[] = [
  {
    id: 'account',
    label: 'Account & Profiel',
    icon: UserIcon,
    description: 'Beheer je persoonlijke gegevens en voorkeuren',
  },
  {
    id: 'users',
    label: 'Gebruikers & Rechten',
    icon: Users,
    description: 'Beheer gebruikersrollen en toegangsrechten',
    requiredRole: 'admin',
  },
  {
    id: 'brands',
    label: 'Brand Management',
    icon: Palette,
    description: 'Configureer kleuren en logo\'s per merk',
    requiredRole: 'admin',
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: FileText,
    description: 'Bekijk de laatste activiteiten in de app',
    requiredRole: 'admin',
  },
];

interface SettingsLayoutProps {
  user: User;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('account');
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadAccent = async () => {
      try {
        const { data } = await supabase
          .from('brand_settings')
          .select('accent_color')
          .eq('brand', 'academy')
          .limit(1)
          .maybeSingle();
        if (data?.accent_color) setAccentColor(data.accent_color);
      } catch {
        // Fallback to default in SettingsView
      }
    };
    loadAccent();
  }, []);

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path && navigationItems.find(item => item.id === path)) {
      setActiveSection(path);
    }
  }, [location.pathname]);

  const handleNavigation = (sectionId: string) => {
    setActiveSection(sectionId);
    navigate(`/settings/${sectionId}`);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filteredNavigationItems = navigationItems.filter(item => {
    if (!item.requiredRole) return true;
    return user.role === 'admin';
  });

  // Route guard: redirect non-admin users away from admin-only paths
  const adminOnlyPaths = ['users', 'brands', 'audit'];
  useEffect(() => {
    const pathSegment = location.pathname.split('/').filter(Boolean).pop();
    if (pathSegment && adminOnlyPaths.includes(pathSegment) && user.role !== 'admin') {
      navigate('/settings/account', { replace: true });
    }
  }, [location.pathname, user.role, navigate]);

  const activeItem = navigationItems.find(item => item.id === activeSection);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-neutral-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-neutral-200 bg-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
              <img src="/Icon_Blue.png" alt="Archer icon" className="w-6 h-6 object-contain" />
            </div>
            <div className="min-w-0">
              <img src="/archer-wordmark.png" alt="Archer" className="h-6 w-auto" />
              <p className="text-[11px] tracking-[0.16em] uppercase text-neutral-500 mt-1">
                Event Operations
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-neutral-100"
          >
            <X className="w-5 h-5 text-neutral-600" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.email}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-5 h-5 text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {user.full_name || 'Gebruiker'}
              </p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
              <div className="flex items-center mt-1">
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  user.role === 'admin' ? 'bg-red-100 text-red-800' :
                  user.role === 'operations' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                )}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user.role === 'admin' ? 'Administrator' :
                   user.role === 'operations' ? 'Operations' : 'Viewer'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredNavigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={cn(
                  'w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-archer-blue text-white shadow-[0_12px_28px_rgba(0,0,255,0.22)]'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-20">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-xs mt-0.5',
                    isActive ? 'text-blue-100' : 'text-neutral-500'
                  )}>
                    {item.description}
                  </p>
                </div>
                </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-3 text-sm font-medium text-neutral-700 rounded-lg hover:bg-neutral-100 hover:text-neutral-900 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Uitloggen
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-neutral-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-neutral-100"
            >
              <Menu className="w-5 h-5 text-neutral-600" />
            </button>
            <h1 className="text-lg font-semibold text-neutral-900">
              {activeItem?.label || 'Instellingen'}
            </h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white border-b border-neutral-200">
          <div className="px-6 py-6 bg-[linear-gradient(120deg,rgba(0,0,255,0.04),transparent_40%)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                {activeItem && <activeItem.icon className="w-6 h-6 text-archer-blue" />}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {activeItem?.label || 'Instellingen'}
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    {activeItem?.description}
                  </p>
                </div>
              </div>
              <img src="/archer-wordmark.png" alt="Archer" className="hidden md:block h-7 w-auto opacity-90" />
              <div className="md:hidden" />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6">
          <SettingsView accentColor={accentColor}>
            <Routes>
              <Route path="/" element={<AccountSection user={user} />} />
              <Route path="/account" element={<AccountSection user={user} />} />
              <Route path="/users" element={<UsersSection user={user} />} />
              <Route path="/brands" element={<BrandManagementSection user={user} />} />
              <Route path="/audit" element={<AuditLogSection user={user} />} />
            </Routes>
          </SettingsView>
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;
