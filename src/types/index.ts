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
  role: 'superadmin' | 'admin' | 'operations' | 'viewer';
  brand_access: string[];
  is_active: boolean;
  last_sign_in_at: string | null;
  preferences?: UserPreferences | null;
  language_pref?: 'nl' | 'en';
  responsibilities?: string | null;
  status?: 'actief' | 'inactief' | 'uitgenodigd';
  invited_at?: string | null;
  last_login?: string | null;
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
export type UserRole = 'superadmin' | 'admin' | 'operations' | 'viewer';

export interface CateringItem {
  id: string;
  created_at?: string;
  name: string;
  category: string | null;
  item_type?: 'drank' | 'eten' | 'pakket' | null;
  unit: 'per persoon' | 'per stuk' | 'forfait' | string;
  unit_price: number;
  vat_rate: number;
  is_active: boolean;
  brand_key?: string;
}

export interface EventCatering {
  id?: string;
  event_id: string;
  catering_item_id: string;
  quantity: number;
  unit_price_override?: number | null;
  notes?: string | null;
  created_at?: string;
  catering_item?: CateringItem | null;
}

export interface EventBudget {
  id?: string;
  event_id: string;
  location_cost: number;
  speaker_costs: Array<{ name: string; honorarium: number; travel_cost: number }>;
  material_costs: Array<{ description: string; amount: number }>;
  marketing_costs: Array<{ description: string; amount: number }>;
  other_costs: Array<{ description: string; amount: number }>;
  ticket_price: number;
  income_override?: number | null;
  notes?: string | null;
  updated_at?: string;
}

export interface SettingsNavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  badge?: string | number;
  requiredRole?: UserRole;
}
