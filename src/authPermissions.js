import { hasRole } from "./auth.js";

export function canManageUsers(user) {
  return hasRole(["superadmin", "admin"], user);
}

export function canViewFinance(user) {
  return hasRole(["superadmin", "admin", "operations"], user);
}

export function canManageEvents(user) {
  return hasRole(["superadmin", "admin", "operations"], user);
}

export function canAccessSettings(user) {
  return hasRole(["superadmin", "admin", "operations", "viewer"], user);
}
