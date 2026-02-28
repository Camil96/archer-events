import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Settings, LogOut, Search, ListChecks, CircleDollarSign, UserCircle2 } from 'lucide-react';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';

interface AppShellProps {
  user: User;
  children: React.ReactNode;
  onSearch?: (query: string) => void;
  defaultSearch?: string;
  hideNavExtras?: boolean;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/finance', label: 'Financiën', icon: CircleDollarSign, permission: 'canViewFinance' },
  { to: '/calendar', label: 'Kalender', icon: ListChecks },
  { to: '/settings/account', label: 'Instellingen', icon: Settings },
];

const AppShell: React.FC<AppShellProps> = ({ user, children, onSearch, defaultSearch = '', hideNavExtras }) => {
  const permissions = usePermissions(user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState(defaultSearch);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const triggerSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 shadow-sm transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-4 flex items-center border-b border-neutral-200">
          <div className="w-10 h-10 rounded-lg bg-archer-blue text-white font-bold flex items-center justify-center">
            AE
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold text-neutral-900">Archer Events</p>
            <p className="text-xs text-neutral-500">Welkom, {user.full_name || 'gebruiker'}</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.filter((item) => {
            if (item.permission === 'canViewFinance') return permissions.canViewFinance;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-archer-blue text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-neutral-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-neutral-700 rounded-lg hover:bg-neutral-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </button>
        </div>
      </aside>

      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-neutral-200">
          <div className="h-16 flex items-center px-4 lg:px-6">
            <button
              className="p-2 rounded-md hover:bg-neutral-100 lg:hidden"
              onClick={() => setSidebarOpen((s) => !s)}
              aria-label="Open menu"
            >
              <svg className="h-5 w-5 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {!hideNavExtras && (
              <div className="flex-1 flex items-center space-x-3">
                <div className="relative w-full max-w-xl">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => triggerSearch(e.target.value)}
                    placeholder="Zoek events op titel, locatie of datum"
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-archer-blue focus:border-archer-blue"
                  />
                </div>
              </div>
            )}

            <div className="relative flex items-center space-x-3 pl-3">
              <button
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center space-x-2 p-1 rounded-lg hover:bg-neutral-100"
              >
                <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name || user.email} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-neutral-700">{(user.full_name || user.email || 'U')[0]}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-neutral-900">{user.full_name || 'Gebruiker'}</p>
                  <p className="text-xs text-neutral-500 capitalize">{user.role}</p>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg p-1 z-50">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/my-profile');
                    }}
                    className="w-full px-3 py-2 rounded-md text-sm text-left hover:bg-neutral-100 inline-flex items-center"
                  >
                    <UserCircle2 className="w-4 h-4 mr-2" />
                    Mijn profiel
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full px-3 py-2 rounded-md text-sm text-left hover:bg-neutral-100 inline-flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Uitloggen
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
