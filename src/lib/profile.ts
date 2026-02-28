import { User, UserPreferences } from '@/types';

const defaultPrefs: UserPreferences = {
  language: 'nl',
  notifications: true,
  theme: 'light',
};

export const mapProfile = (raw: any): User => {
  const role = ['superadmin', 'admin', 'operations', 'viewer'].includes(raw.role) ? raw.role : 'viewer';
  const status = raw.status || (raw.is_active === false ? 'inactief' : 'actief');

  return {
    id: raw.id,
    email: raw.email,
    full_name: raw.full_name || raw.email || 'Gebruiker',
    avatar_url: raw.avatar_url || null,
    role,
    brand_access: Array.isArray(raw.brand_access) ? raw.brand_access : ['academy', 'invest', 'fund'],
    is_active: raw.is_active !== false,
    last_sign_in_at: raw.last_sign_in_at || null,
    preferences: { ...defaultPrefs, ...(raw.preferences || {}), language: raw.language_pref || raw.preferences?.language || 'nl' },
    language_pref: raw.language_pref || 'nl',
    responsibilities: raw.responsibilities || '',
    status,
    invited_at: raw.invited_at || null,
    last_login: raw.last_login || raw.last_sign_in_at || null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
};
