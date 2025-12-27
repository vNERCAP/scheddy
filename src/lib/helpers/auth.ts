import { ROLE_DEVELOPER, ROLE_MENTOR, ROLE_STAFF, ROLE_STUDENT } from '$lib/utils';

// vNERCAP staff info structure
export interface VNERCAPStaff {
	permAdmin: number;
	permEvents: number;
	permWeb: number;
	permTraining: number;
}

/**
 * Determines the highest role for a user based on vNERCAP staff permissions.
 * Role mapping:
 * - permWeb → ROLE_DEVELOPER (40)
 * - permAdmin → ROLE_STAFF (30)
 * - permTraining → ROLE_MENTOR (20)
 * - Registered user (no staff perms) → ROLE_STUDENT (10)
 */
export function determineHighestRole(staffInfo: VNERCAPStaff | null): number {
	// If not staff, they're a student
	if (!staffInfo) {
		return ROLE_STUDENT;
	}

	let highest_role = ROLE_STUDENT;

	// Check permissions in order of priority (highest first)
	if (staffInfo.permWeb) {
		highest_role = Math.max(highest_role, ROLE_DEVELOPER);
	}
	if (staffInfo.permAdmin) {
		highest_role = Math.max(highest_role, ROLE_STAFF);
	}
	if (staffInfo.permTraining) {
		highest_role = Math.max(highest_role, ROLE_MENTOR);
	}

	return highest_role;
}
