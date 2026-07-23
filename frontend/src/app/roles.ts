export const ROLES = {
  ADMIN: 'admin',
  MANAGEMENT: 'management',
  SCHEDULE_ADMINISTRATOR: 'schedule_administrator',
  QUOTE_ADMINISTRATOR: 'quote_administrator',
  ASSESSOR: 'assessor'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGEMENT]: 'Management',
  [ROLES.SCHEDULE_ADMINISTRATOR]: 'Schedule Administrator',
  [ROLES.QUOTE_ADMINISTRATOR]: 'Quote Administrator',
  [ROLES.ASSESSOR]: 'Quote Assessor'
};

export function getRoleCapabilities(role: Role) {
  const isAdmin = role === ROLES.ADMIN;
  const isAssessor = role === ROLES.ASSESSOR;
  const isScheduleAdministrator = role === ROLES.SCHEDULE_ADMINISTRATOR;
  const isQuoteAdministrator = role === ROLES.QUOTE_ADMINISTRATOR;
  const isManagement = role === ROLES.MANAGEMENT;

  return {
    isAdmin,
    isAssessor,
    isScheduleAdministrator,
    isQuoteAdministrator,
    isManagement,
    canBuildQuotes: isAssessor || isAdmin,
    canViewQuotes: isAdmin || isAssessor || isQuoteAdministrator || isManagement
  };
}
