export const baseConfig = {
	database: {
		url: 'mysql://ztl:ztl@localhost:3307/scheddy'
	},
	facility: {
		name_public: 'Your ARTCC',
		id: 'ZXX',
		mail_domain: 'zxxartcc.org',
		discord_url_public: 'https://discord.gg/your-server'
	},
	site: {
		base_public: 'http://localhost:5173',
		mode: 'dev',
		dev_pid: 'TO_BE_OVERRIDDEN'
	},
	bookings: {
		max_days_ahead: 14,
		max_pending_sessions: 2
	},
	api: {
		master_key: 'this must be overridden'
	},
	auth: {
		discord: {
			client_id_public: 'your_client_id',
			client_secret: 'secret'
		},
		vnercap: {
			base: 'https://vnercap-api.sebpartof2.workers.dev'
		}
	},
	smtp: {
		host: 'mail.yourdomain.net',
		port: 465,
		secure: true,
		auth: {
			user: 'you',
			pass: 'pwd'
		},
		from: 'Scheddy Test Server <sts@yourdomain.dev>'
	}
};

// eslint-disable-next-line
export function recursiveKeepPublic(config: any, current_key: string): any {
	const copy = structuredClone(config);
	for (const key of Object.keys(config)) {
		const this_key = current_key + '_' + key;
		if (typeof config[key] === 'object') {
			copy[key] = recursiveKeepPublic(config[key], this_key);
		} else {
			if (!key.endsWith('_public')) {
				delete copy[key];
			}
		}
	}
	return copy;
}

// eslint-disable-next-line
export function recursiveOverlayConfig(config: any, current_key: string, env: any): any {
	const copy = structuredClone(config);
	for (const key of Object.keys(config)) {
		const this_key = current_key + '_' + key;
		if (typeof config[key] === 'object') {
			copy[key] = recursiveOverlayConfig(config[key], this_key, env);
		} else {
			let env_var = this_key.toUpperCase();

			if (env_var.endsWith('_PUBLIC')) {
				env_var = 'PUBLIC_' + env_var.replace('_PUBLIC', ''); // move the PUBLIC postfix to a prefix
			}

			if (!Object.keys(env).includes(env_var)) {
				continue;
			}
			const encoded_value = env[env_var];
			if (encoded_value !== undefined) {
				// override base configuration

				if (typeof config[key] === 'string') {
					copy[key] = encoded_value;
					continue;
				}
				if (typeof config[key] === 'number') {
					copy[key] = Number.parseInt(encoded_value);
					continue;
				}

				const value = JSON.parse(encoded_value);
				if (typeof value != typeof config[key]) {
					throw new Error(
						`Invalid overlay configuration in ${env_var}: expected ${typeof config[key]} found ${typeof value}`
					);
				}
				copy[key] = value;
			}
		}
	}
	return copy;
}
