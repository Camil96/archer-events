import { useMemo } from 'react';
import { User } from '@/types';

type RolePermissions = {
  canCreateEvent: boolean;
  canEditEvent: boolean;
  canDeleteEvent: boolean;
  canViewFinance: boolean;
  canEditFinance: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
};

const ROLE_MATRIX: Record<User['role'], RolePermissions> = {
  superadmin: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: true,
    canViewFinance: true,
    canEditFinance: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  admin: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: true,
    canViewFinance: true,
    canEditFinance: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  operations: {
    canCreateEvent: true,
    canEditEvent: true,
    canDeleteEvent: false,
    canViewFinance: true,
    canEditFinance: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  viewer: {
    canCreateEvent: false,
    canEditEvent: false,
    canDeleteEvent: false,
    canViewFinance: false,
    canEditFinance: false,
    canManageUsers: false,
    canManageSettings: false,
  },
};

export function usePermissions(user: User) {
  return useMemo(() => {
    const base = ROLE_MATRIX[user.role] || ROLE_MATRIX.viewer;

    const canAccessBrand = (brandValue?: string | null) => {
      if (!brandValue) return true;
      if (user.role === 'superadmin') return true;
      const normalized = brandValue.toLowerCase();
      if (normalized.includes('academy')) return user.brand_access.includes('academy');
      if (normalized.includes('invest')) return user.brand_access.includes('invest');
      if (normalized.includes('fund')) return user.brand_access.includes('fund');
      return true;
    };

    const canViewEventForBrand = (brandValue?: string | null) => {
      if (user.role === 'superadmin') return true;
      return canAccessBrand(brandValue);
    };

    return {
      ...base,
      canAccessBrand,
      canViewEventForBrand,
    };
  }, [user]);
}

