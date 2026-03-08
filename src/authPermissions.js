import { hasRole } from "./auth.js";

export function canManageUsers(user) {
  return hasRole(["superadmin"], user);
}

export function canViewFinance(user) {
  return hasRole(["superadmin", "operations"], user);
}

export function canManageEvents(user) {
  return hasRole(["superadmin", "operations"], user);
}

export function canAccessSettings(user) {
  return hasRole(["superadmin", "operations", "viewer"], user);
}
