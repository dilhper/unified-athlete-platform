/**
 * RBAC (Role-Based Access Control) - Permission Definitions
 * 
 * DESIGN DECISIONS:
 * 1. Single role per user (no multi-role support)
 * 2. Officials have admin privileges (role serves as admin)
 * 3. Coach-athlete relationships are explicit (ownership-based)
 * 
 * FROZEN: v1.0 (Feb 2026)
 */

export const Roles = {
  OFFICIAL: "official",      // Has admin privileges
  COACH: "coach",
  ATHLETE: "athlete",
  SPECIALIST: "specialist",
} as const;

export type Role = typeof Roles[keyof typeof Roles];

/**
 * Permission Matrix: Maps actions to allowed roles
 * 
 * RBAC Rule: User must have the required role
 * Officials get admin-level permissions across the board
 */
export const Permissions = {
  // ===== VERIFICATION & APPROVAL (OFFICIAL/ADMIN ONLY) =====
  VERIFY_ACHIEVEMENT: [Roles.OFFICIAL],
  VERIFY_CERTIFICATION: [Roles.OFFICIAL],
  VERIFY_DOCUMENTS: [Roles.OFFICIAL],
  APPROVE_REGISTRATION: [Roles.OFFICIAL],
  REJECT_REGISTRATION: [Roles.OFFICIAL],
  BROADCAST_NOTIFICATION: [Roles.OFFICIAL],
  VIEW_AUDIT_LOGS: [Roles.OFFICIAL],
  
  // ===== OPPORTUNITY MANAGEMENT (OFFICIAL) =====
  CREATE_OPPORTUNITY: [Roles.OFFICIAL],
  UPDATE_OPPORTUNITY: [Roles.OFFICIAL],
  DELETE_OPPORTUNITY: [Roles.OFFICIAL],
  SHORTLIST_OPPORTUNITY: [Roles.OFFICIAL],
  MANAGE_SPORT_REGISTRATIONS: [Roles.OFFICIAL],
  
  // ===== ATHLETE ACTIONS =====
  SUBMIT_ACHIEVEMENT: [Roles.ATHLETE],
  VIEW_OWN_ACHIEVEMENTS: [Roles.ATHLETE, Roles.COACH, Roles.OFFICIAL],
  VIEW_OWN_TRAINING_PLAN: [Roles.ATHLETE],
  SUBMIT_DAILY_TRAINING_FORM: [Roles.ATHLETE],
  APPLY_TO_OPPORTUNITY: [Roles.ATHLETE],
  REQUEST_TRAINING_PAUSE: [Roles.ATHLETE],
  
  // ===== COACH ACTIONS =====
  CREATE_TRAINING_PLAN: [Roles.COACH],
  UPDATE_TRAINING_PLAN: [Roles.COACH],
  DELETE_TRAINING_PLAN: [Roles.COACH],
  CREATE_TRAINING_SESSION: [Roles.COACH],
  UPDATE_TRAINING_SESSION: [Roles.COACH],
  VIEW_ATHLETE_TRAINING_FORMS: [Roles.COACH],
  VIEW_ASSIGNED_ATHLETES: [Roles.COACH],
  APPROVE_TRAINING_PAUSE: [Roles.COACH],
  SUBMIT_CERTIFICATION: [Roles.COACH],
  APPROVE_SPORT_REGISTRATION: [Roles.COACH],
  
  // ===== SPECIALIST ACTIONS =====
  CREATE_CONSULTATION: [Roles.SPECIALIST],
  UPDATE_CONSULTATION: [Roles.SPECIALIST],
  MANAGE_PHYSIOTHERAPY_SLOTS: [Roles.SPECIALIST],
  CREATE_MEDICAL_REFERRAL: [Roles.SPECIALIST],
  ACCEPT_MEDICAL_REFERRAL: [Roles.SPECIALIST],
  COMPLETE_MEDICAL_REFERRAL: [Roles.SPECIALIST],
  MANAGE_AVAILABILITY: [Roles.SPECIALIST],
  VIEW_SPECIALIST_CLIENTS: [Roles.SPECIALIST],
  
  // ===== UNIVERSAL (ALL AUTHENTICATED USERS) =====
  SEND_MESSAGE: [Roles.ATHLETE, Roles.COACH, Roles.SPECIALIST, Roles.OFFICIAL],
  VIEW_MESSAGES: [Roles.ATHLETE, Roles.COACH, Roles.SPECIALIST, Roles.OFFICIAL],
  VIEW_NOTIFICATIONS: [Roles.ATHLETE, Roles.COACH, Roles.SPECIALIST, Roles.OFFICIAL],
  UPDATE_OWN_PROFILE: [Roles.ATHLETE, Roles.COACH, Roles.SPECIALIST, Roles.OFFICIAL],
  VIEW_OWN_PROFILE: [Roles.ATHLETE, Roles.COACH, Roles.SPECIALIST, Roles.OFFICIAL],
  
  // ===== COMMUNITY ACCESS =====
  VIEW_COMMUNITIES: [Roles.ATHLETE, Roles.COACH, Roles.SPECIALIST, Roles.OFFICIAL],
  CREATE_COMMUNITY: [Roles.OFFICIAL, Roles.COACH],
  MANAGE_COMMUNITY: [Roles.OFFICIAL],
} as const;

export type Permission = keyof typeof Permissions;

/**
 * Helper: Check if a role has a specific permission
 */
export function hasPermission(userRole: Role, permission: Permission): boolean {
  const allowedRoles = Permissions[permission] as readonly Role[];
  return allowedRoles.includes(userRole);
}

/**
 * Helper: Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return (Object.keys(Permissions) as Permission[]).filter(permission =>
    hasPermission(role, permission)
  );
}
