// import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-vercel';
// import { vitePreprocess } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
// import { sveltePreprocess } from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		alias: {
			lib: 'src/lib'
		}
	},

	onwarn: (warning, handler) => {
		if (
			warning.code === 'a11y-missing-content' ||
			warning.code === 'element-invalid-self-closing-tag'
		) {
			return;
		}
		handler(warning);
	}
};

export default config;
