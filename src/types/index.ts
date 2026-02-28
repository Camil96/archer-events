export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'operations' | 'viewer';
  brand_access: string[];
  is_active: boolean;
  last_sign_in_at: string | null;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: 'nl' | 'en';
  notifications: boolean;
  theme: 'light' | 'dark';
}

export interface BrandSettings {
  id: string;
  created_at: string;
  updated_at: string;
  brand: 'academy' | 'invest' | 'fund';
  brand_name: string | null;
  accent_color: string | null;
  logo_url: string | null;
  logo_wordmark_url: string | null;
  email_contact: string | null;
  is_active: boolean;
}

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any>;
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
  created_at: string;
  deleted_at: string | null;
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
