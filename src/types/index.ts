export interface UserPreferences {
  language?: 'nl' | 'en';
  notifications?: boolean;
  theme?: 'light' | 'dark';
}

export interface User {
  id: string;
  created_at?: string;
  updated_at?: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'operations' | 'viewer';
  brand_access: string[];
  is_active: boolean;
  last_sign_in_at: string | null;
  preferences?: UserPreferences | null;
  language_pref?: 'nl' | 'en';
}

export interface BrandSettings {
  id: string;
  created_at?: string;
  updated_at?: string;
  brand_key: 'academy' | 'invest' | 'fund';
  label: string | null;
  primary_color: string | null;
  logo_url: string | null;
  is_active?: boolean;
  email_contact?: string | null;
}

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, any>;
  user?: User; // Joined user data
}

export interface UserSession {
  id: string;
  created_at: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  expires_at: string;
}

export interface Event {
  id: string;
  created_at?: string;
  deleted_at?: string | null;
  title: string;
  description: string | null;
  location: string | null;
  location_url: string | null;
  start_at: string;
  end_at: string | null;
  event_date: string;
  brand: 'Academy' | 'Invest' | 'Fund' | 'General';
  timezone: string;
  capacity: number;
  expected_attendance: number;
  catering: string | null;
  budget: number | null;
  notes_internal: string | null;
  status?: 'gepland' | 'bevestigd' | 'afgerond' | 'geannuleerd';
  ics_uid?: string | null;
}

export type Brand = 'academy' | 'invest' | 'fund';
export type UserRole = 'admin' | 'operations' | 'viewer';

export interface SettingsNavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  badge?: string | number;
  requiredRole?: UserRole;
}
