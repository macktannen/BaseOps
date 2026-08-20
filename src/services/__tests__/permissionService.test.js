import { describe, it, expect } from 'vitest';
import { can, hasRole, isAdmin, getUserRoles, getRoleLabels, ROLES, ROLE_LABELS } from '../permissionService';

describe('permissionService', () => {
  describe('getUserRoles', () => {
    it('returns empty array for null user', () => {
      expect(getUserRoles(null)).toEqual([]);
    });

    it('returns roles array when available', () => {
      expect(getUserRoles({ roles: ['admin', 'pilot'] })).toEqual(['admin', 'pilot']);
    });

    it('returns legacy single role as array', () => {
      expect(getUserRoles({ role: 'admin' })).toEqual(['admin']);
    });

    it('returns empty array for user without roles', () => {
      expect(getUserRoles({})).toEqual([]);
    });
  });

  describe('can', () => {
    it('returns true for admin with any permission', () => {
      const admin = { roles: ['admin'] };
      expect(can(admin, 'anyPermission')).toBe(true);
    });

    it('returns true for coordinator with createFlight permission', () => {
      const coordinator = { roles: ['coordinator'] };
      expect(can(coordinator, 'createFlight')).toBe(true);
    });

    it('returns false for pilot with createFlight permission', () => {
      const pilot = { roles: ['pilot'] };
      expect(can(pilot, 'createFlight')).toBe(false);
    });

    it('returns true for pilot with viewFlight permission', () => {
      const pilot = { roles: ['pilot'] };
      expect(can(pilot, 'viewFlight')).toBe(true);
    });

    it('returns false for null user', () => {
      expect(can(null, 'viewFlight')).toBe(false);
    });

    it('checks multiple roles (additive permissions)', () => {
      const user = { roles: ['pilot', 'maintenance'] };
      expect(can(user, 'signLog')).toBe(true);
      expect(can(user, 'editMeters')).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('returns true when user has the role', () => {
      expect(hasRole({ roles: ['admin', 'pilot'] }, 'admin')).toBe(true);
    });

    it('returns false when user does not have the role', () => {
      expect(hasRole({ roles: ['pilot'] }, 'admin')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin user', () => {
      expect(isAdmin({ roles: ['admin'] })).toBe(true);
    });

    it('returns false for non-admin user', () => {
      expect(isAdmin({ roles: ['pilot'] })).toBe(false);
    });
  });

  describe('getRoleLabels', () => {
    it('returns display labels for roles', () => {
      expect(getRoleLabels({ roles: ['admin', 'pilot'] })).toEqual(['Admin', 'Pilot']);
    });

    it('returns raw role if no label exists', () => {
      expect(getRoleLabels({ roles: ['custom_role'] })).toEqual(['custom_role']);
    });
  });

  describe('constants', () => {
    it('has all expected roles', () => {
      expect(ROLES).toContain('admin');
      expect(ROLES).toContain('coordinator');
      expect(ROLES).toContain('pilot');
      expect(ROLES).toContain('maintenance');
      expect(ROLES).toContain('view_only');
    });

    it('has labels for all roles', () => {
      for (const role of ROLES) {
        expect(ROLE_LABELS[role]).toBeDefined();
      }
    });
  });
});
