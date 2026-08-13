/**
 * permissionService.js
 * Centralized RBAC permission engine for BaseOps.
 * Users can hold multiple roles — permissions are additive (union of all roles).
 */

export const ROLES = ['admin', 'coordinator', 'pilot', 'maintenance', 'view_only'];

export const ROLE_LABELS = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  pilot: 'Pilot',
  maintenance: 'Maintenance',
  view_only: 'View Only',
};

export const ROLE_COLORS = {
  admin:       { bg: '#fed7d7', text: '#c53030' },
  coordinator: { bg: '#bee3f8', text: '#2b6cb0' },
  pilot:       { bg: '#c6f6d5', text: '#276749' },
  maintenance: { bg: '#fefcbf', text: '#7b6c00' },
  view_only:   { bg: '#e2e8f0', text: '#4a5568' },
};

// All permissions keyed by string — any role with that key === true can perform the action.
// Admin has { all: true } which bypasses all checks.
const PERMISSIONS = {
  admin: { all: true },

  coordinator: {
    // Calendar / Flights
    createFlight: true,
    editFlight: true,
    deleteFlight: true,
    duplicateFlight: true,
    dragReschedule: true,
    assignPilot: true,
    assignPassengers: true,
    addFlightNotes: true,
    editFlightPlan: true,
    viewFlightLog: true,
    enterActuals: true,
    viewExpenses: true,
    addExpense: true,
    editExpense: true,
    deleteExpense: true,
    manageVendors: true,
    viewExpensesOverview: true,
    // Crew & Passengers
    editScheduleGrid: true,
    viewPilotDirectory: true,
    createPilot: true,
    editAnyPilot: true,
    updateMedical: true,
    viewCrewDirectory: true,
    createEditCrew: true,
    viewPassengerDirectory: true,
    createEditPassenger: true,
    // Airports & LZs
    manageLZ: true,
    // Accounts
    manageAccounts: true,
    // Fleet
    viewAircraft: true,
    editAircraftStatus: true,
    editOperationalData: true,
  },

  pilot: {
    // Calendar / Flights — own assigned flights only
    viewFlight: true,
    addFlightNotes: true,
    enterActuals: true,   // own assigned flight only (enforced in component)
    signLog: true,        // own assigned flight only
    clearSignLog: true,   // own assigned flight only, within 24h
    viewFlightLog: true,
    // Expenses — full access to expenses & vendor management
    viewExpenses: true,
    addExpense: true,
    editExpense: true,
    deleteExpense: true,
    manageVendors: true,
    viewExpensesOverview: true,
    // Crew
    viewScheduleGrid: true,
    viewPilotDirectory: true,
    editOwnPilot: true,
    editOwnBaseline: true,
    updateOwnMedical: true,
    viewCrewDirectory: true,
    viewPassengerDirectory: true,
    // Fleet — read
    viewAircraft: true,
    // Airports — read
    viewLZ: true,
    // Accounts — read
    viewAccounts: true,
  },

  maintenance: {
    // Fleet — full control
    viewAircraft: true,
    editAircraftProfile: true,
    editMeters: true,
    editMaintenance: true,
    editAircraftStatus: true,
    editOperationalData: true,
    toggleTwinEngine: true,
    viewAuditLog: true,
    // Calendar — read only
    viewFlight: true,
    viewFlightLog: true,
    // Crew — read
    viewScheduleGrid: true,
    // Airports — read
    viewLZ: true,
  },

  view_only: {
    viewFlight: true,
    viewScheduleGrid: true,
    viewAircraft: true,
    viewLZ: true,
  },
};

/**
 * Get the roles array from a user object (handles legacy single-role string).
 */
export const getUserRoles = (user) => {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  if (user.role) return [user.role]; // legacy
  return [];
};

/**
 * Check if a user has a given permission.
 * Returns true if any of their roles grants the permission (or they are admin).
 */
export const can = (user, permission) => {
  const roles = getUserRoles(user);
  return roles.some(role => {
    const rolePerms = PERMISSIONS[role];
    if (!rolePerms) return false;
    return rolePerms.all === true || rolePerms[permission] === true;
  });
};

/**
 * Check if user has a specific role.
 */
export const hasRole = (user, role) => {
  return getUserRoles(user).includes(role);
};

/**
 * Convenience: is admin
 */
export const isAdmin = (user) => hasRole(user, 'admin');

/**
 * Convenience: get display label(s) for a user's roles
 */
export const getRoleLabels = (user) => {
  return getUserRoles(user).map(r => ROLE_LABELS[r] || r);
};
