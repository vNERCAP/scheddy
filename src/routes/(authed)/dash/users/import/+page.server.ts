import type { PageServerLoad, Actions } from './$types';
import { loadUserData } from '$lib/userInfo';
import { users } from '$lib/server/db/schema';
import { roleOf } from '$lib';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { ROLE_STAFF } from '$lib/utils';
import { serverConfig } from '$lib/config/server';
import { determineHighestRole, type VNERCAPStaff } from '$lib/helpers/auth';

interface VNERCAPUser {
	pid: number;
	fname: string;
	lname: string;
	rank: string | null;
	discordId: string | null;
	isActive: number;
}

export const load: PageServerLoad = async ({ cookies }) => {
	const { user } = (await loadUserData(cookies))!;
	if (roleOf(user) < ROLE_STAFF) {
		redirect(307, '/schedule');
	}

	// Fetch all users from vNERCAP
	let vnercapUsers: VNERCAPUser[] = [];
	let fetchError: string | null = null;

	try {
		const response = await fetch(`${serverConfig.auth.vnercap.base}/api/users`);
		if (response.ok) {
			vnercapUsers = await response.json();
		} else {
			fetchError = `Failed to fetch users: ${response.status} ${response.statusText}`;
		}
	} catch (e) {
		fetchError = `Network error: ${e instanceof Error ? e.message : 'Unknown error'}`;
	}

	// Get existing local users for comparison
	const localUsers = await db.select().from(users);
	const localUserIds = new Set(localUsers.map((u) => u.id));

	return {
		user,
		vnercapUsers,
		localUserIds: Array.from(localUserIds),
		fetchError,
		breadcrumbs: [
			{ title: 'Dashboard', url: '/dash' },
			{ title: 'User Management', url: '/dash/users' },
			{ title: 'Import Users' }
		]
	};
};

export const actions: Actions = {
	import: async (event) => {
		const { user } = (await loadUserData(event.cookies))!;
		if (roleOf(user) < ROLE_STAFF) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await event.request.formData();
		const pidsToImport = formData.getAll('pid').map((p) => parseInt(p.toString()));

		if (pidsToImport.length === 0) {
			return fail(400, { error: 'No users selected' });
		}

		let imported = 0;
		let errors: string[] = [];

		for (const pid of pidsToImport) {
			try {
				// Fetch user details from vNERCAP
				const userResp = await fetch(`${serverConfig.auth.vnercap.base}/api/users/${pid}`);
				if (!userResp.ok) {
					errors.push(`Failed to fetch user ${pid}`);
					continue;
				}

				const vnercapUser: VNERCAPUser = await userResp.json();

				// Fetch staff info to determine role
				let staffInfo: VNERCAPStaff | null = null;
				const staffResp = await fetch(`${serverConfig.auth.vnercap.base}/api/staff/${pid}`);
				if (staffResp.ok) {
					staffInfo = await staffResp.json();
				}

				const role = determineHighestRole(staffInfo);

				// Insert or update user
				await db
					.insert(users)
					.values({
						id: pid,
						discordId: vnercapUser.discordId,
						firstName: vnercapUser.fname,
						lastName: vnercapUser.lname,
						email: `${pid}@vnercap.user`,
						role: role,
						roleOverride: 0,
						rank: vnercapUser.rank,
						timezone: 'America/New_York',
						mentorAvailability: 'null',
						allowedSessionTypes: 'null'
					})
					.onDuplicateKeyUpdate({
						set: {
							discordId: vnercapUser.discordId,
							firstName: vnercapUser.fname,
							lastName: vnercapUser.lname,
							role: role,
							rank: vnercapUser.rank
						}
					});

				imported++;
			} catch (e) {
				errors.push(`Error importing user ${pid}: ${e instanceof Error ? e.message : 'Unknown'}`);
			}
		}

		return { success: true, imported, errors };
	}
};
