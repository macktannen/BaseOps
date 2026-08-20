export const ROLES = ['admin', 'coordinator', 'pilot', 'maintenance', 'view_only'] as const;

export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  pilot: 'Pilot',
  maintenance: 'Maintenance',
  view_only: 'View Only',
};

export const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  admin:       { bg: '#fed7d7', text: '#c53030' },
  coordinator: { bg: '#bee3f8', text: '#2b6cb0' },
  pilot:       { bg: '#c6f6d5', text: '#276749' },
  maintenance: { bg: '#fefcbf', text: '#7b6c00' },
  view_only:   { bg: '#e2e8f0', text: '#4a5568' },
};

interface RolePermissions {
  all?: boolean;
  [permission: string]: boolean | undefined;
}

const PERMISSIONS: Record<Role, RolePermissions> = {
  admin: { all: true },

  coordinator: {
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
    editScheduleGrid: true,
    viewPilotDirectory: true,
    createPilot: true,
    editAnyPilot: true,
    updateMedical: true,
    viewCrewDirectory: true,
    createEditCrew: true,
    viewPassengerDirectory: true,
    createEditPassenger: true,
    manageLZ: true,
    manageAccounts: true,
    viewAircraft: true,
    editAircraftStatus: true,
    editOperationalData: true,
  },

  pilot: {
    viewFlight: true,
    addFlightNotes: true,
    enterActuals: true,
    signLog: true,
    clearSignLog: true,
    viewFlightLog: true,
    viewExpenses: true,
    addExpense: true,
    editExpense: true,
    deleteExpense: true,
    manageVendors: true,
    viewExpensesOverview: true,
    viewScheduleGrid: true,
    viewPilotDirectory: true,
    editOwnPilot: true,
    editOwnBaseline: true,
    updateOwnMedical: true,
    viewCrewDirectory: true,
    viewPassengerDirectory: true,
    viewAircraft: true,
    viewLZ: true,
    viewAccounts: true,
  },

  maintenance: {
    viewAircraft: true,
    editAircraftProfile: true,
    editMeters: true,
    editMaintenance: true,
    editAircraftStatus: true,
    editOperationalData: true,
    toggleTwinEngine: true,
    viewAuditLog: true,
    viewFlight: true,
    viewFlightLog: true,
    viewScheduleGrid: true,
    viewLZ: true,
  },

  view_only: {
    viewFlight: true,
    viewScheduleGrid: true,
    viewAircraft: true,
    viewLZ: true,
  },
};

interface UserLike {
  roles?: string[];
  role?: string;
}

export const getUserRoles = (user: UserLike | null | undefined): string[] => {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  if (user.role) return [user.role];
  return [];
};

export const can = (user: UserLike | null | undefined, permission: string): boolean => {
  const roles = getUserRoles(user);
  return roles.some(role => {
    const rolePerms = PERMISSIONS[role as Role];
    if (!rolePerms) return false;
    return rolePerms.all === true || rolePerms[permission] === true;
  });
};

export const hasRole = (user: UserLike | null | undefined, role: string): boolean => {
  return getUserRoles(user).includes(role);
};

export const isAdmin = (user: UserLike | null | undefined): boolean => hasRole(user, 'admin');

export const getRoleLabels = (user: UserLike | null | undefined): string[] => {
  return getUserRoles(user).map(r => ROLE_LABELS[r as Role] || r);
};
