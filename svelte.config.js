import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		version: {
			name: process.env.npm_package_version
		},
		csrf: {
			checkOrigin: false // TODO: Enable in production with matching PUBLIC_SCHEDDY_SITE_BASE
		}
	}
};

export default config;
