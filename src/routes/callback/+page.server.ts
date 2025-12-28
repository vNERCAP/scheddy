import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userTokens, users } from '$lib/server/db/schema';
import { nanoid } from 'nanoid';
import { redirect } from '@sveltejs/kit';
import { ROLE_STUDENT } from '$lib/utils';
import { serverConfig } from '$lib/config/server';
import { determineHighestRole, type VNERCAPStaff } from '$lib/helpers/auth';

export const load: PageServerLoad = async ({ cookies, url, fetch }) => {
	if (url.searchParams.has('error')) {
		const error_code: string = url.searchParams.get('error')!;
		const error_description: string = url.searchParams.get('error_description')!;
		const error_message: string = url.searchParams.get('message')!;

		return {
			success: false,
			error_code,
			error_description,
			error_message
		};
	}

	const code = url.searchParams.get('code');
	if (!code) {
		return {
			success: false,
			error_code: 'no_auth_code',
			error_description: "No auth code was present in Discord's response.",
			error_message: "No auth code was present in Discord's response."
		};
	}

	// Step 1: Exchange code for Discord access token
	const token_request_body = new URLSearchParams();
	token_request_body.set('grant_type', 'authorization_code');
	token_request_body.set('client_id', serverConfig.auth.discord.client_id_public);
	token_request_body.set('client_secret', serverConfig.auth.discord.client_secret);
	token_request_body.set('redirect_uri', serverConfig.site.base_public + 'callback');
	token_request_body.set('code', code);

	const token_response = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: token_request_body.toString()
	});

	const token_resp = await token_response.json();

	if (!token_response.ok) {
		return {
			success: false,
			error_code: token_resp.error || 'token_exchange_failed',
			error_description: token_resp.error_description || 'Failed to exchange code for token.',
			error_message: token_resp.error_description || 'Failed to exchange code for token.'
		};
	}

	const discord_token = token_resp.access_token;

	// Step 2: Fetch Discord user info
	const discord_user_resp = await fetch('https://discord.com/api/users/@me', {
		headers: {
			Authorization: `Bearer ${discord_token}`
		}
	});

	if (!discord_user_resp.ok) {
		return {
			success: false,
			error_code: 'discord_user_failed',
			error_description: 'Failed to load user data from Discord.',
			error_message: 'Failed to load user data from Discord.'
		};
	}

	const discord_user = await discord_user_resp.json();
	const discord_id: string = discord_user.id;
	// Use Discord email if available, otherwise use a placeholder
	const discord_email: string = discord_user.email || `${discord_id}@discord.user`;

	// Step 3: Look up user in vNERCAP by Discord ID
	let pid: number;
	let vnercap_user: {
		pid: number;
		fname: string;
		lname: string;
		rank: string | null;
		discordId: string;
	};

	// DEVELOPMENT: Override with test PID from .env
	if (serverConfig.site.mode === 'dev' && serverConfig.site.dev_pid) {
		pid = parseInt(serverConfig.site.dev_pid);
		// In dev mode, fetch user by PID instead
		const dev_user_resp = await fetch(
			`${serverConfig.auth.vnercap.base}/api/users/${pid}`
		);
		if (!dev_user_resp.ok) {
			return {
				success: false,
				error_code: 'dev_user_not_found',
				error_description: `Dev mode: User with PID ${pid} not found in vNERCAP.`,
				error_message: `Dev mode: User with PID ${pid} not found in vNERCAP.`
			};
		}
		vnercap_user = await dev_user_resp.json();
	} else {
		// Production: Look up by Discord ID
		console.log(`[Auth] Looking up user by Discord ID: ${discord_id}`);
		const vnercap_user_resp = await fetch(
			`${serverConfig.auth.vnercap.base}/api/users/discord/${discord_id}`
		);
		console.log(`[Auth] vNERCAP response status: ${vnercap_user_resp.status}`);

		if (!vnercap_user_resp.ok) {
			const errorText = await vnercap_user_resp.text();
			console.log(`[Auth] vNERCAP error response: ${errorText}`);
			if (vnercap_user_resp.status === 404) {
				return {
					success: false,
					error_code: 'not_registered',
					error_description: `Your Discord account (${discord_id}) is not registered with ${serverConfig.facility.name_public}. Please register first.`,
					error_message: `Your Discord account (${discord_id}) is not registered with ${serverConfig.facility.name_public}. Please register first.`
				};
			}
			return {
				success: false,
				error_code: 'vnercap_user_failed',
				error_description: 'Failed to load user data from vNERCAP.',
				error_message: 'Failed to load user data from vNERCAP.'
			};
		}

		vnercap_user = await vnercap_user_resp.json();
		pid = vnercap_user.pid;
		console.log(`[Auth] Found vNERCAP user: PID=${pid}, name=${vnercap_user.fname} ${vnercap_user.lname}`);
	}

	// Step 4: Check if user is staff (to determine role)
	let staff_info: VNERCAPStaff | null = null;
	const staff_resp = await fetch(`${serverConfig.auth.vnercap.base}/api/staff/${pid}`);

	if (staff_resp.ok) {
		staff_info = await staff_resp.json();
		console.log(`[Auth] Staff info found:`, JSON.stringify(staff_info));
	} else {
		console.log(`[Auth] Not a staff member (status ${staff_resp.status})`);
	}
	// 404 means not staff, which is fine - they'll be a student

	// Step 5: Determine highest role
	const highest_role = determineHighestRole(staff_info);
	console.log(`[Auth] Determined role: ${highest_role}`);

	// User must be at least a ROLE_STUDENT to log in (they should be if they exist in vNERCAP)
	if (highest_role < ROLE_STUDENT) {
		return {
			success: false,
			error_code: 'not_a_student',
			error_description: `You do not appear to be a member of ${serverConfig.facility.name_public}. If you believe you are receiving this message in error, please contact staff.`,
			error_message: `You do not appear to be a member of ${serverConfig.facility.name_public}. If you believe you are receiving this message in error, please contact staff.`
		};
	}

	// Step 6: Create/update user in local database
	console.log(`[Auth] Inserting/updating user in database...`);
	try {
		await db
			.insert(users)
			.values({
				id: pid,
				discordId: discord_id,
				firstName: vnercap_user.fname,
				lastName: vnercap_user.lname,
				email: discord_email,
				role: highest_role,
				roleOverride: 0,
				rank: vnercap_user.rank,
				timezone: 'America/New_York',
				mentorAvailability: 'null',
				allowedSessionTypes: 'null'
			})
			.onDuplicateKeyUpdate({
				set: {
					id: pid,
					discordId: discord_id,
					firstName: vnercap_user.fname,
					lastName: vnercap_user.lname,
					email: discord_email,
					role: highest_role,
					rank: vnercap_user.rank
				}
			});
		console.log(`[Auth] User database operation successful`);
	} catch (err) {
		console.error(`[Auth] User database error:`, err);
		throw err;
	}

	// Step 7: Create session token
	const utoken = nanoid();
	console.log(`[Auth] Creating session token: ${utoken.substring(0, 8)}...`);
	try {
		await db.insert(userTokens).values({
			id: utoken,
			user: pid
		});
		console.log(`[Auth] Session token created successfully`);
	} catch (err) {
		console.error(`[Auth] Session token error:`, err);
		throw err;
	}

	console.log(`[Auth] Setting cookie and redirecting to /schedule`);
	cookies.set('scheddy_token', utoken, {
		path: '/',
		httpOnly: false,
		secure: false, // Allow over HTTP in production
		sameSite: 'lax'
	});

	redirect(307, '/schedule');
};
